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

import type {
  ValidationCoverageSummary,
  ValidationDecisionResolver,
} from './service';

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

  /**
   * The context whose source baseline is `baselineId`, or undefined.
   *
   * Shared by both methods, which need the same lookup for opposite reasons:
   * the decision check treats "not found" as a finding about the product, the
   * coverage read treats it as "we do not know". Keeping one implementation
   * means they cannot drift into disagreeing about which context is the one.
   */
  async function findContext(
    base: string,
    headers: Record<string, string>,
    baselineId: string,
  ): Promise<{ id: string } | undefined> {
    const contextsRes = await doFetch(`${base}/contexts`, { headers });
    if (!contextsRes.ok) {
      options.logger?.warn(
        `validation-expert returned HTTP ${contextsRes.status} listing ` +
          `contexts for URS baseline ${baselineId}.`,
      );
      return undefined;
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
    if (!context && contexts.length === 0) {
      options.logger?.warn(
        `validation-expert returned no validation contexts at all. ` +
          `URS baseline ${baselineId} resolves to none; verify the plugin ` +
          `is reachable.`,
      );
    }
    return context;
  }

  async function readDecisionApproved(
    base: string,
    headers: Record<string, string>,
    contextId: string,
    baselineId: string,
  ): Promise<boolean> {
    const decisionRes = await doFetch(
      `${base}/contexts/${encodeURIComponent(contextId)}/decision`,
      { headers },
    );
    if (!decisionRes.ok) {
      // 404 = no decision recorded yet — not an error, just "not approved".
      if (decisionRes.status !== 404) {
        options.logger?.warn(
          `validation-expert returned HTTP ${decisionRes.status} for the ` +
            `decision on context ${contextId}. Treating URS baseline ` +
            `${baselineId} as having no approved decision.`,
        );
      }
      return false;
    }
    const decision = (await decisionRes.json()) as { status?: string };
    return decision.status === 'APPROVED';
  }

  return {
    async hasApprovedDecision(baselineId: string): Promise<boolean> {
      try {
        const base = await options.discovery.getBaseUrl('validation-expert');
        const headers = await getAuthHeaders();

        const context = await findContext(base, headers, baselineId);
        if (!context) {
          return false;
        }
        return await readDecisionApproved(
          base,
          headers,
          context.id,
          baselineId,
        );
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

    /**
     * Per-requirement validation coverage for a URS baseline (Slice 1b).
     *
     * Unlike `hasApprovedDecision`, this returns `undefined` rather than an
     * empty result when the lookup fails. The gate needs a verdict and must
     * fail closed; a coverage table needs to distinguish "nothing is
     * validated" from "we could not ask", because rendering the second as the
     * first states something untrue about the product.
     */
    async getValidationCoverage(
      baselineId: string,
    ): Promise<ValidationCoverageSummary | undefined> {
      try {
        const base = await options.discovery.getBaseUrl('validation-expert');
        const headers = await getAuthHeaders();

        const context = await findContext(base, headers, baselineId);
        if (!context) {
          return undefined;
        }

        const coverageRes = await doFetch(
          `${base}/contexts/${encodeURIComponent(context.id)}/coverage`,
          { headers },
        );
        if (!coverageRes.ok) {
          options.logger?.warn(
            `validation-expert returned HTTP ${coverageRes.status} for the ` +
              `coverage of context ${context.id}. Requirement rows will ` +
              `report validation as unknown.`,
          );
          return undefined;
        }

        const coverage = (await coverageRes.json()) as {
          byRequirement?: Array<{
            requirementId?: string;
            testIds?: string[];
            runIds?: string[];
            findingIds?: string[];
          }>;
        };

        const byRequirement = new Map<
          string,
          { testIds: string[]; runIds: string[]; findingIds: string[] }
        >();
        for (const row of coverage.byRequirement ?? []) {
          const key = String(row.requirementId ?? '').trim();
          if (!key) {
            continue;
          }
          byRequirement.set(key, {
            testIds: row.testIds ?? [],
            runIds: row.runIds ?? [],
            findingIds: row.findingIds ?? [],
          });
        }

        return {
          contextId: context.id,
          decisionApproved: await readDecisionApproved(
            base,
            headers,
            context.id,
            baselineId,
          ),
          byRequirement,
        };
      } catch (error) {
        options.logger?.warn(
          `Could not resolve validation coverage for URS baseline ` +
            `${baselineId}: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            `Requirement rows will report validation as unknown.`,
        );
        return undefined;
      }
    },
  };
}
