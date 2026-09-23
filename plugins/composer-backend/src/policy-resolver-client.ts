/**
 * HTTP client that resolves Policy Pack references against the Artifact Registry.
 *
 * Follows the same cross-plugin HTTP pattern as `createHttpUrsBaselineResolver`
 * and `createHttpValidationDecisionResolver`. The composer-backend never reads
 * the registry database directly — it calls the registry's public API.
 *
 * 5-R1: wires the Policy Pack Resolver into the Release Gate.
 */

export interface PolicyObligationResult {
  policyRef: string;
  id: string;
  title: string;
  check: string;
  appliesTo: string;
  message: string;
}

export interface PolicyResolutionResult {
  resolved: string[];
  unresolved: string[];
  obligations: PolicyObligationResult[];
}

export interface PolicyResolverClient {
  /**
   * Resolve policy pack coordinates and return their obligations.
   * Returns null when the registry is unreachable (fail-open for availability).
   */
  resolvePolicies(policyRefs: string[]): Promise<PolicyResolutionResult | null>;
}

export function createHttpPolicyResolverClient(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    /**
     * This plugin's own service identity. Required: the previous code passed
     * `{} as never` as `onBehalfOf`, which is not a credentials object, so
     * token minting threw and the silent catch below turned it into
     * "no obligations" — see the note on `logger`.
     */
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  /**
   * Optional, but strongly wanted. Resolution fails **open** by deliberate
   * decision (NXD-045): an unreachable registry must not block every release.
   * A fail-open path with no log is indistinguishable from a pass, and that is
   * exactly how this client stayed broken — it never reached the registry at
   * all, and nothing said so. Every null return now explains itself.
   */
  logger?: { warn(message: string): void };
  fetchImpl?: typeof fetch;
}): PolicyResolverClient {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async resolvePolicies(
      policyRefs: string[],
    ): Promise<PolicyResolutionResult | null> {
      if (policyRefs.length === 0) {
        return { resolved: [], unresolved: [], obligations: [] };
      }
      try {
        const base = await options.discovery.getBaseUrl('artifact-registry');
        const { token } = await options.auth.getPluginRequestToken({
          onBehalfOf: await options.auth.getOwnServiceCredentials(),
          targetPluginId: 'artifact-registry',
        });
        const res = await doFetch(`${base}/policies/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ policies: policyRefs }),
        });
        if (!res.ok) {
          options.logger?.warn(
            `Policy resolution failed: the artifact registry answered ` +
              `${res.status}. The release gate will report no policy ` +
              `obligations for this product (fail-open, NXD-045).`,
          );
          return null;
        }
        return (await res.json()) as PolicyResolutionResult;
      } catch (error) {
        // fail-open: registry unavailable does not block all releases
        options.logger?.warn(
          `Policy resolution could not reach the artifact registry: ` +
            `${error instanceof Error ? error.message : String(error)}. The ` +
            `release gate will report no policy obligations for this product ` +
            `(fail-open, NXD-045).`,
        );
        return null;
      }
    },
  };
}
