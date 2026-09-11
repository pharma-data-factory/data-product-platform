/**
 * URS Baseline Resolver — HTTP boundary from Validation Expert → URS Composer.
 *
 * Never reads URS tables directly. Calls the URS Composer public API with a
 * plugin request token issued on-behalf-of the incoming user credentials.
 */

import { InputError } from '@backstage/errors';
import type { ValidationContextRequirement } from '@internal/platform-common';
import type { CreateValidationContextRequest } from './types';
import type { UrsBaselineResolver } from './service';

export type UrsAuthCredentials = unknown;

type UrsVersionPayload = {
  id?: string;
  requirementId?: string;
  title?: string;
  statement?: string;
  status?: string;
  priority?: string;
  rationale?: string;
};

function mapVersionToRequirement(
  version: UrsVersionPayload,
  changeType?: string,
): ValidationContextRequirement | undefined {
  const requirementId = String(version.requirementId ?? '').trim();
  if (!requirementId) {
    return undefined;
  }
  return {
    requirementId,
    requirementVersionId: version.id ? String(version.id) : undefined,
    title: String(version.title ?? '').trim() || requirementId,
    statement: String(version.statement ?? '').trim(),
    status: version.status ? String(version.status) : undefined,
    priority: version.priority ? String(version.priority) : undefined,
    rationale: version.rationale ? String(version.rationale) : undefined,
    changeType,
  };
}

export function createHttpUrsBaselineResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: UrsAuthCredentials;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): UrsBaselineResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function authHeaders(
    credentials: UrsAuthCredentials,
  ): Promise<Record<string, string>> {
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async function resolveViaVersions(
    base: string,
    headers: Record<string, string>,
    baselineId: string,
  ): Promise<ValidationContextRequirement[]> {
    const basRes = await doFetch(
      `${base}/baselines/${encodeURIComponent(baselineId)}`,
      { headers },
    );
    if (!basRes.ok) {
      throw new Error(
        `Unable to resolve URS baseline ${baselineId} (HTTP ${basRes.status})`,
      );
    }
    const baseline = (await basRes.json()) as {
      requirementVersionIds?: string[];
    };
    const items: ValidationContextRequirement[] = [];
    const seen = new Set<string>();
    for (const versionId of baseline.requirementVersionIds ?? []) {
      try {
        const vRes = await doFetch(
          `${base}/requirement-versions/${encodeURIComponent(versionId)}`,
          { headers },
        );
        if (!vRes.ok) {
          continue;
        }
        const mapped = mapVersionToRequirement(
          (await vRes.json()) as UrsVersionPayload,
        );
        if (mapped && !seen.has(mapped.requirementId)) {
          seen.add(mapped.requirementId);
          items.push(mapped);
        }
      } catch {
        // skip unresolvable versions
      }
    }
    return items;
  }

  return {
    async resolveApprovedBaseline(request, credentials) {
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to resolve a URS baseline on behalf of the user',
        );
      }

      const base = await options.discovery.getBaseUrl('urs-composer');
      const headers = await authHeaders(credentials);
      const url = `${base}/baselines/${encodeURIComponent(request.baselineId)}`;

      const res = await doFetch(url, { headers });
      if (!res.ok) {
        throw new Error(
          `Unable to resolve URS baseline ${request.baselineId} (HTTP ${res.status})`,
        );
      }

      const baseline = (await res.json()) as {
        id: string;
        requirementSetId?: string;
        baselineVersion?: string;
        status?: string;
        requirementVersionIds?: string[];
        createdBy?: string;
        approvedBy?: string;
        approvedAt?: string;
      };

      const status = String(baseline.status ?? '').toUpperCase();
      if (status !== 'APPROVED') {
        throw new Error(
          `URS baseline ${request.baselineId} is ${status || 'NOT_FOUND'}; a validation context may only be created from an APPROVED baseline`,
        );
      }

      const setId = String(baseline.requirementSetId ?? '').trim();
      if (!setId) {
        throw new InputError(
          `URS baseline ${request.baselineId} has no requirementSetId`,
        );
      }
      if (setId !== request.requirementSetId) {
        throw new InputError(
          `URS baseline ${request.baselineId} belongs to requirement set ${setId}, not ${request.requirementSetId}`,
        );
      }

      let solutionName: string | undefined;
      let businessCapabilityIds: string[] = [];
      try {
        const setRes = await doFetch(
          `${base}/requirement-sets/${encodeURIComponent(setId)}`,
          { headers },
        );
        if (setRes.ok) {
          const set = (await setRes.json()) as {
            solutionName?: string;
            businessCapabilityRefs?: string[];
          };
          solutionName = set.solutionName;
          businessCapabilityIds = set.businessCapabilityRefs ?? [];
        }
      } catch {
        // best-effort enrichment
      }

      const versionIds = baseline.requirementVersionIds ?? [];
      const requirementIds: string[] = [];
      const seen = new Set<string>();
      for (const versionId of versionIds) {
        try {
          const vRes = await doFetch(
            `${base}/requirement-versions/${encodeURIComponent(versionId)}`,
            { headers },
          );
          if (!vRes.ok) {
            continue;
          }
          const version = (await vRes.json()) as { requirementId?: string };
          const stableId = String(version.requirementId ?? '').trim();
          if (stableId && !seen.has(stableId)) {
            seen.add(stableId);
            requirementIds.push(stableId);
          }
        } catch {
          // skip unresolvable versions
        }
      }

      return {
        reference: {
          requirementSetId: setId,
          baselineId: baseline.id,
          baselineVersion: String(baseline.baselineVersion ?? ''),
          requirementSetTitle: solutionName,
          requirementSetName: setId,
          businessCapabilityIds,
          approvalStatus: 'APPROVED',
          approvedAt:
            typeof baseline.approvedAt === 'string'
              ? baseline.approvedAt
              : undefined,
          approvedBy: baseline.approvedBy ?? baseline.createdBy,
          sourceSystem: 'urs-composer',
          requirementIds,
          createdAt: new Date().toISOString(),
        },
      };
    },

    async resolveBaselineRequirements(baselineId, credentials) {
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to resolve URS baseline requirements on behalf of the user',
        );
      }
      const id = String(baselineId ?? '').trim();
      if (!id) {
        throw new InputError('baselineId is required');
      }

      const base = await options.discovery.getBaseUrl('urs-composer');
      const headers = await authHeaders(credentials);

      // Prefer one-shot change-set (includes pinned version content).
      try {
        const csRes = await doFetch(
          `${base}/baselines/${encodeURIComponent(id)}/change-set`,
          { headers },
        );
        if (csRes.ok) {
          const changeSet = (await csRes.json()) as {
            changes?: Array<{
              requirementId?: string;
              changeType?: string;
              currentVersion?: UrsVersionPayload;
              previousVersion?: UrsVersionPayload;
            }>;
          };
          const items: ValidationContextRequirement[] = [];
          const seen = new Set<string>();
          for (const change of changeSet.changes ?? []) {
            if (String(change.changeType ?? '').toUpperCase() === 'REMOVED') {
              continue;
            }
            const version = change.currentVersion ?? change.previousVersion;
            if (!version) {
              continue;
            }
            const mapped = mapVersionToRequirement(
              {
                ...version,
                requirementId: version.requirementId ?? change.requirementId,
              },
              change.changeType,
            );
            if (mapped && !seen.has(mapped.requirementId)) {
              seen.add(mapped.requirementId);
              items.push(mapped);
            }
          }
          if (items.length > 0) {
            return items;
          }
        }
      } catch {
        // fall through to version N+1
      }

      return resolveViaVersions(base, headers, id);
    },
  };
}
