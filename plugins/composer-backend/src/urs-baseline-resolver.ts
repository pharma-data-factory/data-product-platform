/**
 * URS Baseline Resolver — cross-plugin HTTP boundary to the URS Composer.
 *
 * The Product Composer never reads URS tables directly. It resolves approved
 * URS baselines through the URS Composer's public API, following the same
 * pattern as validation-expert-backend.
 */

export interface UrsBaselineReference {
  id: string;
  status: string;
  baselineVersion: string;
}

export interface UrsRequirementSummary {
  /** The URS `RequirementVersion.id` — the immutable version the baseline pins. */
  id: string;
  /**
   * The URS `RequirementVersion.requirementId` — the stable logical id
   * (`URS-OEE-014`) that humans, protocol tests and traceability links all
   * speak. Absent only on malformed data; `bindUrsBaseline` refuses such rows
   * rather than storing a requirement nothing can reference.
   */
  requirementRef?: string;
  title: string;
  statement: string;
  category?: string;
  priority?: string;
  /** GxP classification, carried through so validation can be risk-proportional. */
  gxpRelevance?: string;
  versionLabel?: string;
  /** SHA-256 over the signed URS content. Proves which wording was tested. */
  contentHash?: string;
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
  resolveApprovedBaseline(baselineId: string): Promise<UrsBaselineReference>;
  resolveBaselineContext(baselineId: string): Promise<UrsBaselineContext>;
}

export function createHttpUrsBaselineResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    /**
     * This plugin's own service identity. Required — see `NXD-054`. The
     * previous code passed `{} as never`, which is not a credentials object,
     * so token minting threw on every call and the request went out with no
     * Authorization header at all.
     */
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  /**
   * Strongly wanted. An unauthenticated request to the URS Composer answers
   * 401, `resolveApprovedBaseline` throws, and the release gate turns that
   * into a `NO_APPROVED_URS_BASELINE` blocker — so a genuinely approved
   * baseline was reported as unapproved, with nothing anywhere saying why.
   * Every failure path now explains itself.
   */
  logger?: { warn(message: string): void };
  fetchImpl?: typeof fetch;
}): UrsBaselineResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    try {
      const t = await options.auth.getPluginRequestToken({
        onBehalfOf: await options.auth.getOwnServiceCredentials(),
        targetPluginId: 'urs-composer',
      });
      headers.Authorization = `Bearer ${t.token}`;
    } catch (error) {
      // Proceeding unauthenticated will almost certainly 401. Say so here,
      // because the 401 surfaces as "baseline not approved" and that reads
      // like a finding about the product rather than a broken call.
      options.logger?.warn(
        `Could not mint a service token for urs-composer: ` +
          `${error instanceof Error ? error.message : String(error)}. ` +
          `The request will be sent unauthenticated and will likely fail.`,
      );
    }
    return headers;
  }

  return {
    async resolveApprovedBaseline(baselineId: string) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const url = `${base}/baselines/${encodeURIComponent(baselineId)}`;
      const headers = await getAuthHeaders();

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

    async resolveBaselineContext(baselineId: string) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const headers = await getAuthHeaders();

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
          } else {
            options.logger?.warn(
              `URS requirement set ${baseline.requirementSetId} returned ` +
                `HTTP ${setRes.status}; baseline context will omit the ` +
                `solution name, type, business need and capabilities.`,
            );
          }
        } catch (error) {
          // best-effort enrichment
          options.logger?.warn(
            `Could not enrich URS baseline ${baselineId} with its ` +
              `requirement set: ` +
              `${error instanceof Error ? error.message : String(error)}`,
          );
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
              gxpRelevance?: string;
              versionLabel?: string;
              version?: string;
              contentHash?: string;
              classification?: {
                componentType?: string;
                requirementNature?: string;
                criticality?: string;
              };
            };
            requirements.push({
              id: v.id ?? vid,
              requirementRef: v.requirementId,
              title: v.title ?? '',
              statement: v.statement ?? '',
              category: v.category,
              priority: v.priority,
              gxpRelevance: v.gxpRelevance,
              versionLabel: v.versionLabel ?? v.version,
              contentHash: v.contentHash,
              classification: v.classification,
            });
          } else {
            options.logger?.warn(
              `URS requirement version ${vid} returned HTTP ${vRes.status}; ` +
                `it is omitted from baseline ${baselineId}'s context.`,
            );
          }
        } catch (error) {
          // skip unresolvable versions
          options.logger?.warn(
            `Could not read URS requirement version ${vid}: ` +
              `${error instanceof Error ? error.message : String(error)}. ` +
              `It is omitted from baseline ${baselineId}'s context.`,
          );
        }
      }

      if (versionIds.length > 0 && requirements.length < versionIds.length) {
        // A partial requirement list is worse than none: it looks complete.
        //
        // This used to warn and return the short list. Both callers made that
        // wrong in the same way — `bindUrsBaseline` would freeze a snapshot
        // missing requirements nobody would ever notice were absent, and
        // `generateProductSpec` would ask the model to design against a subset
        // while the draft claims the baseline. Neither caller can tell a short
        // list from a short baseline, so the decision belongs here.
        options.logger?.warn(
          `URS baseline ${baselineId} resolved ${requirements.length} of ` +
            `${versionIds.length} requirement versions. The context is ` +
            `incomplete.`,
        );
        throw new Error(
          `URS baseline ${baselineId} could not be resolved in full: ` +
            `${requirements.length} of ${versionIds.length} requirement ` +
            `versions were readable. Refusing to return a partial ` +
            `requirement set — it would be indistinguishable from a complete ` +
            `one. Check that the URS Composer is reachable and retry.`,
        );
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
