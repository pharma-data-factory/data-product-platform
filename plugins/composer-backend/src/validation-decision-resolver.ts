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
    /** This plugin's own service identity. Required — see `NXD-054`. */
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  /**
   * Strongly wanted. Every failure here returns `false`, which the release
   * gate reports as `NO_APPROVED_VALIDATION_DECISION` — indistinguishable
   * from a product that genuinely has no decision. Without a log, a broken
   * call and a real finding look identical to whoever reads the gate.
   */
  logger?: { warn(message: string): void };
  fetchImpl?: typeof fetch;
}): ValidationDecisionResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    try {
      const t = await options.auth.getPluginRequestToken({
        onBehalfOf: await options.auth.getOwnServiceCredentials(),
        targetPluginId: 'validation-expert',
      });
      headers.Authorization = `Bearer ${t.token}`;
    } catch (error) {
      options.logger?.warn(
        `Could not mint a service token for validation-expert: ` +
          `${error instanceof Error ? error.message : String(error)}. ` +
          `The request will be sent unauthenticated and will likely fail, ` +
          `which the release gate reports as "no approved decision".`,
      );
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
          options.logger?.warn(
            `validation-expert returned HTTP ${contextsRes.status} listing ` +
              `contexts. Treating URS baseline ${baselineId} as having no ` +
              `approved decision.`,
          );
          return false;
        }

        // `GET /contexts` answers `{ items: [...] }`, not a bare array. This
        // was read as an array, so `.find` threw on every call and the catch
        // below turned it into "not approved" — the resolver could never
        // return true. Both shapes are accepted now so the reader does not
        // break again if the envelope changes back. See `NXD-054`.
        const body = (await contextsRes.json()) as
          | Array<{ id: string; source?: { baselineId?: string } }>
          | { items?: Array<{ id: string; source?: { baselineId?: string } }> };
        const contexts = Array.isArray(body) ? body : body.items ?? [];

        const context = contexts.find(c => c.source?.baselineId === baselineId);
        if (!context) {
          // A real finding, not a failure: no validation context references
          // this baseline. Logged at debug volume via warn only when the list
          // itself was empty, which usually means the wrong plugin answered.
          if (contexts.length === 0) {
            options.logger?.warn(
              `validation-expert returned no validation contexts at all. ` +
                `URS baseline ${baselineId} is reported as having no ` +
                `approved decision; verify the plugin is reachable.`,
            );
          }
          return false;
        }

        // 2. Fetch the decision for that context.
        const decisionRes = await doFetch(
          `${base}/contexts/${encodeURIComponent(context.id)}/decision`,
          { headers },
        );
        if (!decisionRes.ok) {
          // 404 = no decision recorded yet — not an error, just "not approved".
          if (decisionRes.status !== 404) {
            options.logger?.warn(
              `validation-expert returned HTTP ${decisionRes.status} for the ` +
                `decision on context ${context.id}. Treating URS baseline ` +
                `${baselineId} as having no approved decision.`,
            );
          }
          return false;
        }
        const decision = (await decisionRes.json()) as { status?: string };
        return decision.status === 'APPROVED';
      } catch (error) {
        // Network or parse failure → treat as "not approved".
        options.logger?.warn(
          `Could not resolve a ValidationDecision for URS baseline ` +
            `${baselineId}: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            `The release gate will report no approved decision.`,
        );
        return false;
      }
    },
  };
}
