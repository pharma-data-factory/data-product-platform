/**
 * HTTP-based ValidationDecisionResolver.
 *
 * The composer-backend does not read validation-expert tables directly. It
 * resolves ValidationDecisions through the validation-expert public API,
 * following the same cross-plugin pattern as `createHttpUrsBaselineResolver`.
 *
 * Algorithm:
 *   1. Fetch all ValidationContexts from the validation-expert API.
 *   2. Find the context whose source.baselineId === the supplied URS baseline ID.
 *   3. If found, fetch its ValidationDecision.
 *   4. Return true if the decision exists and its status is 'APPROVED'.
 *
 * All failures (network error, 404, JSON parse error) are treated as "no
 * approved decision", not as hard errors. The release gate will then block
 * with `NO_APPROVED_VALIDATION_DECISION`. This is the correct behaviour:
 * a resolution failure is not the same as an explicit APPROVED verdict.
 *
 * Phase 5 (P5-S3).
 */

import type { ValidationDecisionResolver } from './service';

export function createHttpValidationDecisionResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): ValidationDecisionResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    try {
      const t = await options.auth.getPluginRequestToken({
        onBehalfOf: await Promise.resolve({} as never),
        targetPluginId: 'validation-expert',
      });
      headers.Authorization = `Bearer ${t.token}`;
    } catch {
      // best-effort; fall through without an auth header
    }
    return headers;
  }

  return {
    async hasApprovedDecision(baselineId: string): Promise<boolean> {
      try {
        const base = await options.discovery.getBaseUrl('validation-expert');
        const headers = await getAuthHeaders();

        // 1. List all contexts and find the one for this baseline.
        const contextsRes = await doFetch(`${base}/contexts`, { headers });
        if (!contextsRes.ok) {
          return false;
        }
        const contexts = (await contextsRes.json()) as Array<{
          id: string;
          source?: { baselineId?: string };
        }>;
        const context = contexts.find(c => c.source?.baselineId === baselineId);
        if (!context) {
          return false;
        }

        // 2. Fetch the decision for that context.
        const decisionRes = await doFetch(
          `${base}/contexts/${encodeURIComponent(context.id)}/decision`,
          { headers },
        );
        if (!decisionRes.ok) {
          // 404 = no decision recorded yet — not an error, just "not approved".
          return false;
        }
        const decision = (await decisionRes.json()) as { status?: string };
        return decision.status === 'APPROVED';
      } catch {
        // Network or parse failure → treat as "not approved".
        return false;
      }
    },
  };
}
