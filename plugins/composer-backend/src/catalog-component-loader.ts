/**
 * Loads Platform Component entities from the Catalog over HTTP.
 *
 * The composer-backend has no Catalog dependency in its package.json and does
 * not use `catalogServiceRef`. It calls the Catalog HTTP API instead, which is
 * the same cross-plugin pattern used by the URS baseline resolver — see
 * `urs-baseline-resolver.ts`.
 *
 * Used by ComposerService.generateProductSpec to give the LLM the list of
 * available platform components. The call is best-effort: any failure returns
 * an empty list so spec generation degrades gracefully rather than throwing.
 */

import type { AvailableComponentSummary } from './llm-client';

export interface CatalogComponentLoader {
  loadPlatformComponents(): Promise<AvailableComponentSummary[]>;
}

export function createHttpCatalogComponentLoader(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): CatalogComponentLoader {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async loadPlatformComponents(): Promise<AvailableComponentSummary[]> {
      try {
        const base = await options.discovery.getBaseUrl('catalog');

        let token = '';
        try {
          const t = await options.auth.getPluginRequestToken({
            onBehalfOf: await Promise.resolve({} as never),
            targetPluginId: 'catalog',
          });
          token = t.token;
        } catch {
          // best-effort; public catalog reads may not need auth
        }

        const url = new URL(`${base}/entities`);
        // Filter to platform-component entities. The annotation key contains
        // a slash, which must not be percent-encoded inside the filter value.
        url.searchParams.set(
          'filter',
          'metadata.annotations.dataprod.platform/kind=platform-component',
        );
        url.searchParams.set(
          'fields',
          'metadata.name,metadata.title,metadata.description,metadata.annotations',
        );
        // Cap the page size to avoid very large responses on large catalogs.
        url.searchParams.set('limit', '200');

        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await doFetch(url.toString(), { headers });
        if (!res.ok) {
          return [];
        }

        const entities = (await res.json()) as Array<{
          metadata: {
            name: string;
            title?: string;
            description?: string;
            annotations?: Record<string, string>;
          };
        }>;

        return entities.map(entity => ({
          name: entity.metadata.name,
          title: entity.metadata.title || entity.metadata.name,
          category:
            entity.metadata.annotations?.[
              'dataprod.platform/category'
            ] || 'integration',
          purpose: entity.metadata.description || '',
          certificationStatus:
            entity.metadata.annotations?.[
              'dataprod.platform/certification-status'
            ] || 'PLANNED',
        }));
      } catch {
        // Graceful degradation: spec generation proceeds with no component
        // suggestions rather than failing the whole request.
        return [];
      }
    },
  };
}
