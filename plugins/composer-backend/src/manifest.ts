/**
 * Product Manifest v0.1 — canonical document build + content hash.
 *
 * contentHash is SHA-256 over the canonical JSON of the document with an empty
 * metadata.contentHash placeholder, so the hash is reproducible and never
 * includes itself.
 */

import { createHash } from 'crypto';
import {
  PRODUCT_MANIFEST_VERSION,
  ProductComponent,
  ProductManifest,
  ProductManifestDataContract,
  ProductManifestComponent,
  DataContract,
} from '@internal/platform-common';

export interface BuildProductManifestInput {
  productId: string;
  productVersion: string;
  productVersionId: string;
  productBaselineId: string;
  ursBaselineId: string;
  components: ProductComponent[];
  contracts: DataContract[];
  policies?: ProductManifest['spec']['policies'];
  qualityGates?: ProductManifest['spec']['qualityGates'];
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

export function computeManifestContentHash(
  documentWithoutHash: Omit<ProductManifest, 'metadata'> & {
    metadata: Omit<ProductManifest['metadata'], 'contentHash'> & {
      contentHash: '';
    };
  },
): string {
  const payload = canonicalStringify(documentWithoutHash);
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function buildProductManifest(
  input: BuildProductManifestInput,
): ProductManifest {
  const components: ProductManifestComponent[] = input.components.map(c => ({
    id: c.id,
    name: c.name,
    componentType: c.componentType,
    ...(c.ref ? { ref: c.ref } : {}),
    ...(c.interfaceType ? { interfaceType: c.interfaceType } : {}),
  }));

  const dataContracts: ProductManifestDataContract[] = input.contracts.map(
    c => ({
      id: c.id,
      productComponentId: c.productComponentId,
      schemaType: c.schemaType,
      version: c.version,
      ...(c.schemaRef ? { schemaRef: c.schemaRef } : {}),
    }),
  );

  const draft: ProductManifest = {
    apiVersion: 'pharma-data-factory.io/v1alpha1',
    kind: 'ProductManifest',
    metadata: {
      productId: input.productId,
      productVersion: input.productVersion,
      productVersionId: input.productVersionId,
      productBaselineId: input.productBaselineId,
      manifestVersion: PRODUCT_MANIFEST_VERSION,
      contentHash: '',
    },
    spec: {
      ursBaselineId: input.ursBaselineId,
      components,
      dataContracts,
      policies: input.policies ?? [],
      qualityGates: input.qualityGates ?? [],
    },
  };

  const contentHash = computeManifestContentHash({
    ...draft,
    metadata: { ...draft.metadata, contentHash: '' },
  });

  return {
    ...draft,
    metadata: {
      ...draft.metadata,
      contentHash,
    },
  };
}

export function resolveUrsBaselineId(request: {
  ursBaselineId?: string;
  ursBaselineIds?: string[];
}): string | undefined {
  const single = request.ursBaselineId?.trim();
  if (single) {
    return single;
  }
  const legacy = (request.ursBaselineIds ?? [])
    .map(id => id?.trim())
    .filter(Boolean);
  if (legacy.length === 1) {
    return legacy[0];
  }
  return undefined;
}

export type ManifestIntegrityIssueCode =
  | 'MANIFEST_HASH_MISMATCH'
  | 'MANIFEST_URS_MISMATCH'
  | 'MANIFEST_BASELINE_MISMATCH'
  | 'MANIFEST_INVALID';

export interface ManifestIntegrityIssue {
  code: ManifestIntegrityIssueCode;
  message: string;
}

/**
 * Recomputes contentHash from the stored document and compares pins.
 * Does not claim GxP validation — technical integrity of ProductManifest v0.1.
 */
export function verifyPersistedManifestIntegrity(options: {
  document: ProductManifest;
  expectedContentHash: string;
  expectedUrsBaselineId: string;
  expectedProductBaselineId?: string;
}): ManifestIntegrityIssue[] {
  const issues: ManifestIntegrityIssue[] = [];
  const { document, expectedContentHash, expectedUrsBaselineId } = options;

  if (
    !document ||
    document.kind !== 'ProductManifest' ||
    document.apiVersion !== 'pharma-data-factory.io/v1alpha1'
  ) {
    issues.push({
      code: 'MANIFEST_INVALID',
      message: 'Persisted document is not a valid ProductManifest v0.1',
    });
    return issues;
  }

  const recomputed = computeManifestContentHash({
    ...document,
    metadata: { ...document.metadata, contentHash: '' },
  });

  const storedHash = (expectedContentHash || document.metadata.contentHash || '')
    .trim()
    .toLowerCase();
  if (!storedHash || storedHash !== recomputed.toLowerCase()) {
    issues.push({
      code: 'MANIFEST_HASH_MISMATCH',
      message: `ProductManifest contentHash mismatch (stored=${storedHash || 'empty'}, recomputed=${recomputed})`,
    });
  }

  const docUrs = String(document.spec?.ursBaselineId ?? '').trim();
  const expectedUrs = expectedUrsBaselineId.trim();
  if (!docUrs || docUrs !== expectedUrs) {
    issues.push({
      code: 'MANIFEST_URS_MISMATCH',
      message: `ProductManifest ursBaselineId '${docUrs || 'empty'}' does not match product baseline pin '${expectedUrs}'`,
    });
  }

  if (options.expectedProductBaselineId) {
    const docBaseline = String(
      document.metadata?.productBaselineId ?? '',
    ).trim();
    if (docBaseline !== options.expectedProductBaselineId) {
      issues.push({
        code: 'MANIFEST_BASELINE_MISMATCH',
        message: `ProductManifest productBaselineId '${docBaseline || 'empty'}' does not match approved baseline '${options.expectedProductBaselineId}'`,
      });
    }
  }

  return issues;
}
