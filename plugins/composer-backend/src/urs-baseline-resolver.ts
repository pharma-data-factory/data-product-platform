/**
 * URS Baseline Resolver — cross-plugin HTTP boundary to the URS Composer.
 *
 * The Product Composer never reads URS tables directly. It resolves approved
 * URS baselines through the URS Composer's public API with a plugin request
 * token issued on-behalf-of the incoming user credentials (same pattern as
 * validation-expert-backend).
 */

import {
  computeUrsBaselineContentHash,
  isUrsBaselineBindableStatus,
} from '@internal/platform-common';

export type UrsAuthCredentials = unknown;

export interface UrsBaselineReference {
  id: string;
  status: string;
  baselineVersion: string;
  requirementSetId?: string;
  solutionName?: string;
  supersededBy?: string;
  /** SHA-256 of pinned baseline identity (hashOfBaseline-compatible). */
  contentHash?: string;
  requirementVersionIds?: string[];
}

/** Typed failure when a pinned URS baseline is not APPROVED (or unreachable). */
export class UrsBaselineResolutionError extends Error {
  readonly kind: 'SUPERSEDED' | 'NOT_APPROVED' | 'HTTP';
  readonly baselineId: string;
  readonly status?: string;
  readonly supersededBy?: string;

  constructor(options: {
    kind: 'SUPERSEDED' | 'NOT_APPROVED' | 'HTTP';
    baselineId: string;
    message: string;
    status?: string;
    supersededBy?: string;
  }) {
    super(options.message);
    this.name = 'UrsBaselineResolutionError';
    this.kind = options.kind;
    this.baselineId = options.baselineId;
    this.status = options.status;
    this.supersededBy = options.supersededBy;
  }
}

export function isUrsBaselineResolutionError(
  err: unknown,
): err is UrsBaselineResolutionError {
  return err instanceof UrsBaselineResolutionError;
}

export function ursReleaseGateBlockerFromError(
  ursBaselineId: string,
  err: unknown,
): { code: string; message: string } {
  if (isUrsBaselineResolutionError(err) && err.kind === 'SUPERSEDED') {
    const successor = err.supersededBy
      ? ` (superseded by ${err.supersededBy})`
      : '';
    return {
      code: 'URS_BASELINE_SUPERSEDED',
      message: `Pinned URS baseline ${ursBaselineId} is SUPERSEDED${successor}; create a new product baseline against the current APPROVED URS. Technical workflow control only — not GxP validation.`,
    };
  }
  return {
    code: 'NO_APPROVED_URS_BASELINE',
    message: `URS baseline ${ursBaselineId} is not approved: ${
      err instanceof Error ? err.message : String(err)
    }`,
  };
}

export interface UrsRequirementSummary {
  /** Stable logical requirement ID (for example URS-OEE-001). */
  id: string;
  /** Immutable RequirementVersion ID pinned by the URS baseline. */
  versionId?: string;
  title: string;
  statement: string;
  category?: string;
  priority?: string;
  classification?: {
    componentType?: string;
    requirementNature?: string;
    criticality?: string;
  };
}

export interface UrsBaselineContext {
  baselineId: string;
  baselineVersion: string;
  requirementSetId?: string;
  solutionName?: string;
  solutionType?: string;
  businessNeed?: string;
  businessCapabilities: string[];
  requirements: UrsRequirementSummary[];
}

export interface UrsChangeRequestSummary {
  id: string;
  title?: string;
  description?: string;
  status?: string;
}

export interface UrsChangeRequestListResult {
  items: UrsChangeRequestSummary[];
  total: number;
}

export interface UrsBaselineResolver {
  resolveApprovedBaseline(
    baselineId: string,
    credentials: UrsAuthCredentials,
  ): Promise<UrsBaselineReference>;
  /** Any status — used for advisory when a pin may have been superseded. */
  inspectBaseline(
    baselineId: string,
    credentials: UrsAuthCredentials,
  ): Promise<UrsBaselineReference>;
  resolveBaselineContext(
    baselineId: string,
    credentials: UrsAuthCredentials,
  ): Promise<UrsBaselineContext>;
  listApprovedBaselines(
    credentials: UrsAuthCredentials,
  ): Promise<UrsBaselineReference[]>;
  /** Soft-scan CRs for product_change_signals hydrate (advisory, not GxP). */
  listChangeRequests(
    credentials: UrsAuthCredentials,
    limit?: number,
    offset?: number,
  ): Promise<UrsChangeRequestListResult>;
}

function assertApprovedOrThrow(
  baselineId: string,
  baseline: {
    id: string;
    status?: string;
    baselineVersion?: string;
    requirementSetId?: string;
    supersededBy?: string;
    requirementVersionIds?: string[];
    approvalInstanceId?: string | null;
    contentHash?: string;
  },
): UrsBaselineReference {
  const status = String(baseline.status ?? '').toUpperCase();
  const supersededBy = baseline.supersededBy
    ? String(baseline.supersededBy)
    : undefined;
  const requirementVersionIds = Array.isArray(baseline.requirementVersionIds)
    ? baseline.requirementVersionIds.map(String)
    : [];
  const contentHash =
    baseline.contentHash?.trim() ||
    (baseline.requirementSetId
      ? computeUrsBaselineContentHash({
          id: baseline.id,
          requirementSetId: String(baseline.requirementSetId),
          baselineVersion: String(baseline.baselineVersion ?? ''),
          requirementVersionIds,
          status,
          approvalInstanceId: baseline.approvalInstanceId,
        })
      : undefined);

  if (isUrsBaselineBindableStatus(status)) {
    return {
      id: baseline.id,
      status,
      baselineVersion: String(baseline.baselineVersion ?? ''),
      requirementSetId: baseline.requirementSetId,
      supersededBy,
      contentHash,
      requirementVersionIds,
    };
  }
  if (status === 'SUPERSEDED') {
    throw new UrsBaselineResolutionError({
      kind: 'SUPERSEDED',
      baselineId,
      status,
      supersededBy,
      message: `URS baseline ${baselineId} is SUPERSEDED; expected APPROVED or BASELINED`,
    });
  }
  throw new UrsBaselineResolutionError({
    kind: 'NOT_APPROVED',
    baselineId,
    status: status || 'NOT_FOUND',
    supersededBy,
    message: `URS baseline ${baselineId} is ${status || 'NOT_FOUND'}; expected APPROVED or BASELINED`,
  });
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
    if (!credentials) {
      throw new Error(
        'Caller credentials are required to resolve a URS baseline on behalf of the user',
      );
    }
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async function fetchBaselineJson(
    baselineId: string,
    credentials: UrsAuthCredentials,
  ): Promise<{
    id: string;
    status?: string;
    baselineVersion?: string;
    requirementSetId?: string;
    supersededBy?: string;
    requirementVersionIds?: string[];
    approvalInstanceId?: string | null;
    contentHash?: string;
  }> {
    const base = await options.discovery.getBaseUrl('urs-composer');
    const url = `${base}/baselines/${encodeURIComponent(baselineId)}`;
    const headers = await authHeaders(credentials);
    const res = await doFetch(url, { headers });
    if (!res.ok) {
      throw new UrsBaselineResolutionError({
        kind: 'HTTP',
        baselineId,
        message: `Unable to resolve URS baseline ${baselineId} (HTTP ${res.status})`,
      });
    }
    return (await res.json()) as {
      id: string;
      status?: string;
      baselineVersion?: string;
      requirementSetId?: string;
      supersededBy?: string;
      requirementVersionIds?: string[];
      approvalInstanceId?: string | null;
      contentHash?: string;
    };
  }

  return {
    async resolveApprovedBaseline(baselineId, credentials) {
      const baseline = await fetchBaselineJson(baselineId, credentials);
      return assertApprovedOrThrow(baselineId, baseline);
    },

    async inspectBaseline(baselineId, credentials) {
      const baseline = await fetchBaselineJson(baselineId, credentials);
      const status = String(baseline.status ?? '').toUpperCase();
      return {
        id: baseline.id,
        status: status || 'UNKNOWN',
        baselineVersion: String(baseline.baselineVersion ?? ''),
        requirementSetId: baseline.requirementSetId,
        supersededBy: baseline.supersededBy
          ? String(baseline.supersededBy)
          : undefined,
      };
    },

    async resolveBaselineContext(baselineId, credentials) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const headers = await authHeaders(credentials);

      const basRes = await doFetch(
        `${base}/baselines/${encodeURIComponent(baselineId)}`,
        { headers },
      );
      if (!basRes.ok) {
        throw new UrsBaselineResolutionError({
          kind: 'HTTP',
          baselineId,
          message: `Unable to resolve URS baseline ${baselineId} (HTTP ${basRes.status})`,
        });
      }
      const baseline = (await basRes.json()) as {
        id: string;
        status?: string;
        baselineVersion?: string;
        requirementSetId?: string;
        requirementVersionIds?: string[];
        supersededBy?: string;
      };

      assertApprovedOrThrow(baselineId, baseline);

      let solutionName: string | undefined;
      let solutionType: string | undefined;
      let businessNeed: string | undefined;
      let businessCapabilities: string[] = [];

      if (baseline.requirementSetId) {
        try {
          const setRes = await doFetch(
            `${base}/requirement-sets/${encodeURIComponent(baseline.requirementSetId)}`,
            { headers },
          );
          if (setRes.ok) {
            const set = (await setRes.json()) as {
              solutionName?: string;
              solutionType?: string;
              businessNeed?: string;
              businessCapabilityRefs?: string[];
            };
            solutionName = set.solutionName;
            solutionType = set.solutionType;
            businessNeed = set.businessNeed;
            businessCapabilities = set.businessCapabilityRefs ?? [];
          }
        } catch {
          // best-effort enrichment
        }
      }

      const requirements: UrsRequirementSummary[] = [];
      const versionIds = baseline.requirementVersionIds ?? [];
      for (const vid of versionIds) {
        try {
          const vRes = await doFetch(
            `${base}/requirement-versions/${encodeURIComponent(vid)}`,
            { headers },
          );
          if (vRes.ok) {
            const v = (await vRes.json()) as {
              id?: string;
              requirementId?: string;
              title?: string;
              statement?: string;
              category?: string;
              priority?: string;
              classification?: {
                componentType?: string;
                requirementNature?: string;
                criticality?: string;
              };
            };
            requirements.push({
              id: v.requirementId ?? v.id ?? vid,
              versionId: v.id ?? vid,
              title: v.title ?? '',
              statement: v.statement ?? '',
              category: v.category,
              priority: v.priority,
              classification: v.classification,
            });
          }
        } catch {
          // skip unresolvable versions
        }
      }

      return {
        baselineId: baseline.id,
        baselineVersion: String(baseline.baselineVersion ?? ''),
        requirementSetId: baseline.requirementSetId,
        solutionName,
        solutionType,
        businessNeed,
        businessCapabilities,
        requirements,
      };
    },

    async listApprovedBaselines(credentials) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const headers = await authHeaders(credentials);
      const setsRes = await doFetch(`${base}/requirement-sets?limit=200`, {
        headers,
      });
      if (!setsRes.ok) {
        throw new Error(
          `Unable to list URS requirement sets (HTTP ${setsRes.status})`,
        );
      }
      const setsBody = (await setsRes.json()) as {
        items?: Array<{ id: string; solutionName?: string }>;
      };
      const sets = setsBody.items ?? [];
      const approved: UrsBaselineReference[] = [];

      for (const set of sets) {
        try {
          const bRes = await doFetch(
            `${base}/requirement-sets/${encodeURIComponent(set.id)}/baselines?limit=100`,
            { headers },
          );
          if (!bRes.ok) {
            continue;
          }
          const baselines = (await bRes.json()) as
            | Array<{
                id: string;
                status?: string;
                baselineVersion?: string;
                requirementSetId?: string;
                supersededBy?: string;
              }>
            | {
                items?: Array<{
                  id: string;
                  status?: string;
                  baselineVersion?: string;
                  requirementSetId?: string;
                  supersededBy?: string;
                }>;
              };
          const list = Array.isArray(baselines)
            ? baselines
            : baselines.items ?? [];
          for (const b of list) {
            const status = String(b.status ?? '').toUpperCase();
            if (status === 'APPROVED' || status === 'BASELINED') {
              approved.push({
                id: b.id,
                status,
                baselineVersion: String(b.baselineVersion ?? ''),
                requirementSetId: b.requirementSetId ?? set.id,
                solutionName: set.solutionName,
              });
            }
          }
        } catch {
          // skip set on error
        }
      }

      return approved;
    },

    async listChangeRequests(credentials, limit = 100, offset = 0) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const headers = await authHeaders(credentials);
      const res = await doFetch(
        `${base}/change-requests?limit=${limit}&offset=${offset}`,
        { headers },
      );
      if (!res.ok) {
        throw new Error(
          `Unable to list URS change requests (HTTP ${res.status})`,
        );
      }
      const body = (await res.json()) as {
        items?: Array<{
          id: string;
          title?: string;
          description?: string;
          status?: string;
        }>;
        total?: number;
      };
      const items = (body.items ?? []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
      }));
      return {
        items,
        total: typeof body.total === 'number' ? body.total : items.length,
      };
    },
  };
}
