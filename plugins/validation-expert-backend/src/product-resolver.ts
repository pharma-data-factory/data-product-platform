/**
 * Product Composer Resolver — HTTP boundary from Validation Expert → Product
 * Composer for solution assignment validation.
 *
 * Never reads composer tables directly. Calls the Product Composer public API
 * with a plugin request token issued on-behalf-of the incoming user
 * credentials. The Product Composer remains the owner of Product /
 * ProductVersion / ProductBaseline; Validation Expert stores stable IDs only.
 */

import { ConflictError, NotFoundError } from '@backstage/errors';
import type {
  AssignProductRequest,
  ValidationContextProductRef,
} from '@internal/platform-common';

export type ProductAuthCredentials = unknown;

export interface ProductComposerResolver {
  /**
   * Validate a product assignment against the Product Composer contract:
   * Product exists, ProductVersion belongs to the Product, ProductBaseline
   * belongs to the ProductVersion and is APPROVED, and the baseline pins the
   * same APPROVED URS baseline the context is anchored to.
   */
  resolveProductRef(
    request: AssignProductRequest,
    ursBaselineId: string,
    credentials: unknown,
  ): Promise<ValidationContextProductRef>;
}

type ComposerProductVersion = {
  id?: string;
  productId?: string;
  version?: string;
  status?: string;
};

type ComposerProductBaseline = {
  id?: string;
  productVersionId?: string;
  baselineVersion?: string;
  status?: string;
  ursBaselineId?: string;
};

export function createHttpProductComposerResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: ProductAuthCredentials;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): ProductComposerResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function authHeaders(
    credentials: ProductAuthCredentials,
  ): Promise<Record<string, string>> {
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'composer',
    });
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  return {
    async resolveProductRef(request, ursBaselineId, credentials) {
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to resolve a product assignment on behalf of the user',
        );
      }
      const base = await options.discovery.getBaseUrl('composer');
      const headers = await authHeaders(credentials);

      const productRes = await doFetch(
        `${base}/products/${encodeURIComponent(request.productId)}`,
        { headers },
      );
      if (!productRes.ok) {
        throw new NotFoundError(
          `Product ${request.productId} not found in Product Composer (HTTP ${productRes.status})`,
        );
      }
      const product = (await productRes.json()) as { name?: string };

      const versionsRes = await doFetch(
        `${base}/products/${encodeURIComponent(request.productId)}/versions`,
        { headers },
      );
      if (!versionsRes.ok) {
        throw new Error(
          `Unable to list Product versions (HTTP ${versionsRes.status})`,
        );
      }
      const versions = (await versionsRes.json()) as ComposerProductVersion[];
      const version = versions.find(
        item => String(item.id ?? '') === request.productVersionId,
      );
      if (!version) {
        throw new ConflictError(
          `ProductVersion ${request.productVersionId} does not belong to Product ${request.productId}`,
        );
      }

      const baselineRes = await doFetch(
        `${base}/baselines/${encodeURIComponent(request.productBaselineId)}`,
        { headers },
      );
      if (!baselineRes.ok) {
        throw new NotFoundError(
          `ProductBaseline ${request.productBaselineId} not found in Product Composer (HTTP ${baselineRes.status})`,
        );
      }
      const baseline = (await baselineRes.json()) as ComposerProductBaseline;
      if (
        String(baseline.productVersionId ?? '') !== request.productVersionId
      ) {
        throw new ConflictError(
          `ProductBaseline ${request.productBaselineId} does not belong to ProductVersion ${request.productVersionId}`,
        );
      }
      const baselineStatus = String(baseline.status ?? '').toUpperCase();
      if (baselineStatus !== 'APPROVED') {
        throw new ConflictError(
          `ProductBaseline ${request.productBaselineId} is ${baselineStatus || 'UNKNOWN'}; a validation context may only be assigned an APPROVED product baseline`,
        );
      }
      if (
        ursBaselineId &&
        baseline.ursBaselineId &&
        baseline.ursBaselineId !== ursBaselineId
      ) {
        throw new ConflictError(
          `ProductBaseline ${request.productBaselineId} pins URS baseline ${baseline.ursBaselineId}, but the validation context is anchored to ${ursBaselineId}`,
        );
      }

      return {
        productId: request.productId,
        productVersionId: request.productVersionId,
        productBaselineId: request.productBaselineId,
        productName: product.name,
        productVersion: version.version,
        productBaselineVersion: baseline.baselineVersion,
        assignedAt: new Date().toISOString(),
      };
    },
  };
}
