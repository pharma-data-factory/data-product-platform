/**
 * URS Baseline Resolver — cross-plugin HTTP boundary to the URS Composer.
 *
 * The Product Composer never reads URS tables directly. It resolves approved
 * URS baselines through the URS Composer's public API with a plugin request
 * token issued on-behalf-of the incoming user credentials (same pattern as
 * validation-expert-backend).
 */

export type UrsAuthCredentials = unknown;

export interface UrsBaselineReference {
  id: string;
  status: string;
  baselineVersion: string;
}

export interface UrsRequirementSummary {
  id: string;
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

export interface UrsBaselineResolver {
  resolveApprovedBaseline(
    baselineId: string,
    credentials: UrsAuthCredentials,
  ): Promise<UrsBaselineReference>;
  resolveBaselineContext(
    baselineId: string,
    credentials: UrsAuthCredentials,
  ): Promise<UrsBaselineContext>;
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

  return {
    async resolveApprovedBaseline(baselineId, credentials) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const url = `${base}/baselines/${encodeURIComponent(baselineId)}`;
      const headers = await authHeaders(credentials);

      const res = await doFetch(url, { headers });
      if (!res.ok) {
        throw new Error(
          `Unable to resolve URS baseline ${baselineId} (HTTP ${res.status})`,
        );
      }

      const baseline = (await res.json()) as {
        id: string;
        status?: string;
        baselineVersion?: string;
      };

      const status = String(baseline.status ?? '').toUpperCase();
      if (status !== 'APPROVED') {
        throw new Error(
          `URS baseline ${baselineId} is ${status || 'NOT_FOUND'}; expected APPROVED`,
        );
      }

      return {
        id: baseline.id,
        status,
        baselineVersion: String(baseline.baselineVersion ?? ''),
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
        throw new Error(
          `Unable to resolve URS baseline ${baselineId} (HTTP ${basRes.status})`,
        );
      }
      const baseline = (await basRes.json()) as {
        id: string;
        status?: string;
        baselineVersion?: string;
        requirementSetId?: string;
        requirementVersionIds?: string[];
      };

      const status = String(baseline.status ?? '').toUpperCase();
      if (status !== 'APPROVED') {
        throw new Error(
          `URS baseline ${baselineId} is ${status || 'NOT_FOUND'}; expected APPROVED`,
        );
      }

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
              id: v.id ?? vid,
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
  };
}
