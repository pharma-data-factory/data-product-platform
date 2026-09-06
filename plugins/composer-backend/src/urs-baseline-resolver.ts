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

export interface UrsBaselineResolver {
  resolveApprovedBaseline(baselineId: string): Promise<UrsBaselineReference>;
}

export function createHttpUrsBaselineResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): UrsBaselineResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async resolveApprovedBaseline(baselineId: string) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const url = `${base}/baselines/${encodeURIComponent(baselineId)}`;

      let token: string | undefined;
      try {
        const t = await options.auth.getPluginRequestToken({
          onBehalfOf: await Promise.resolve({} as never),
          targetPluginId: 'urs-composer',
        });
        token = t.token;
      } catch {
        token = undefined;
      }

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

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
  };
}
