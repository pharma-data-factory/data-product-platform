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
    /** This plugin's own service identity. Required — see `NXD-054`. */
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  /**
   * Strongly wanted. This loader degrades to an empty list on any failure, so
   * without a log the only symptom is an LLM that suggests no components —
   * which looks like a weak model rather than a broken call.
   */
  logger?: { warn(message: string): void };
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
            onBehalfOf: await options.auth.getOwnServiceCredentials(),
            targetPluginId: 'catalog',
          });
          token = t.token;
        } catch (error) {
          // best-effort; public catalog reads may not need auth
          options.logger?.warn(
            `Could not mint a service token for the catalog: ` +
              `${error instanceof Error ? error.message : String(error)}. ` +
              `Reading unauthenticated; on a secured catalog this returns no ` +
              `components and spec generation loses its component context.`,
          );
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
          options.logger?.warn(
            `Catalog returned HTTP ${res.status} for platform components. ` +
              `AI spec generation proceeds with no component suggestions.`,
          );
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
      } catch (error) {
        // Graceful degradation: spec generation proceeds with no component
        // suggestions rather than failing the whole request.
        options.logger?.warn(
          `Could not load platform components from the catalog: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            `AI spec generation proceeds with no component suggestions.`,
        );
        return [];
      }
    },
  };
}
