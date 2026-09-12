/**
 * Catalog Manifest Pin Resolver — reads ProductManifest pin annotations from
 * a Catalog data-product Component (written by Golden Path scaffolding).
 *
 * Cross-plugin HTTP boundary only; no Catalog DB access.
 */

import { PRODUCT_MANIFEST_ANNOTATIONS } from '@internal/platform-common';

export type CatalogAuthCredentials = unknown;

export interface CatalogManifestPins {
  entityRef: string;
  name: string;
  productManifestContentHash?: string;
  ursBaselineId?: string;
  productBaselineId?: string;
  productVersionId?: string;
  productId?: string;
}

export interface CatalogManifestPinResolver {
  /**
   * Resolve a data-product Component by metadata name (typically product slug).
   * Returns null when the entity is not in Catalog (e.g. not scaffolded yet).
   */
  resolveByName(
    name: string,
    credentials: CatalogAuthCredentials,
  ): Promise<CatalogManifestPins | null>;
}

export function createHttpCatalogManifestPinResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: CatalogAuthCredentials;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
  namespace?: string;
}): CatalogManifestPinResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const namespace = options.namespace ?? 'default';

  async function authHeaders(
    credentials: CatalogAuthCredentials,
  ): Promise<Record<string, string>> {
    if (!credentials) {
      throw new Error(
        'Caller credentials are required to resolve Catalog manifest pins',
      );
    }
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'catalog',
    });
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  return {
    async resolveByName(name, credentials) {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }
      const base = await options.discovery.getBaseUrl('catalog');
      const url = `${base}/entities/by-name/component/${encodeURIComponent(
        namespace,
      )}/${encodeURIComponent(trimmed)}`;
      const headers = await authHeaders(credentials);
      const res = await doFetch(url, { headers });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(
          `Unable to resolve Catalog entity ${trimmed} (HTTP ${res.status})`,
        );
      }
      const entity = (await res.json()) as {
        kind?: string;
        metadata?: {
          name?: string;
          namespace?: string;
          annotations?: Record<string, string>;
        };
        spec?: { type?: string };
      };
      const annotations = entity.metadata?.annotations ?? {};
      const isDataProduct =
        entity.spec?.type === 'data-product' ||
        annotations['dataprod.platform/kind'] === 'data-product';
      if (!isDataProduct) {
        return null;
      }
      const entityNamespace = entity.metadata?.namespace ?? namespace;
      const entityName = entity.metadata?.name ?? trimmed;
      return {
        entityRef: `component:${entityNamespace}/${entityName}`,
        name: entityName,
        productManifestContentHash:
          annotations[PRODUCT_MANIFEST_ANNOTATIONS.contentHash]?.trim() ||
          undefined,
        ursBaselineId:
          annotations[PRODUCT_MANIFEST_ANNOTATIONS.ursBaselineId]?.trim() ||
          undefined,
        productBaselineId:
          annotations[PRODUCT_MANIFEST_ANNOTATIONS.productBaselineId]?.trim() ||
          undefined,
        productVersionId:
          annotations[PRODUCT_MANIFEST_ANNOTATIONS.productVersionId]?.trim() ||
          undefined,
        productId:
          annotations[PRODUCT_MANIFEST_ANNOTATIONS.productId]?.trim() ||
          undefined,
      };
    },
  };
}

export function evaluateCatalogManifestPins(options: {
  pins: CatalogManifestPins;
  expected: {
    contentHash: string;
    ursBaselineId: string;
    productBaselineId: string;
    productVersionId: string;
    productId: string;
  };
}): Array<{ code: string; message: string }> {
  const { pins, expected } = options;
  const hasAnyPin = Boolean(
    pins.productManifestContentHash ||
      pins.ursBaselineId ||
      pins.productBaselineId ||
      pins.productVersionId ||
      pins.productId,
  );
  if (!hasAnyPin) {
    return [
      {
        code: 'CATALOG_MANIFEST_PIN_MISSING',
        message: `Catalog entity ${pins.entityRef} has no ProductManifest pin annotations; scaffold from Product Composer or update catalog-info.yaml`,
      },
    ];
  }

  const blockers: Array<{ code: string; message: string }> = [];
  const checks: Array<[keyof typeof expected, string | undefined, string]> = [
    ['contentHash', pins.productManifestContentHash, expected.contentHash],
    ['ursBaselineId', pins.ursBaselineId, expected.ursBaselineId],
    ['productBaselineId', pins.productBaselineId, expected.productBaselineId],
    ['productVersionId', pins.productVersionId, expected.productVersionId],
    ['productId', pins.productId, expected.productId],
  ];

  for (const [field, actual, want] of checks) {
    if (!actual) {
      blockers.push({
        code: 'CATALOG_MANIFEST_PIN_MISSING',
        message: `Catalog entity ${pins.entityRef} is missing pin for ${field}`,
      });
      continue;
    }
    if (actual.toLowerCase() !== want.toLowerCase()) {
      blockers.push({
        code: 'CATALOG_MANIFEST_PIN_MISMATCH',
        message: `Catalog pin ${field} mismatch on ${pins.entityRef} (catalog=${actual}, expected=${want})`,
      });
    }
  }
  return blockers;
}
