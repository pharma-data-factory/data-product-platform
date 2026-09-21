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
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
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
          onBehalfOf: await Promise.resolve({} as never),
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
        if (!res.ok) return null;
        return (await res.json()) as PolicyResolutionResult;
      } catch {
        return null; // fail-open: registry unavailable does not block all releases
      }
    },
  };
}
