/**
 * Product Manifest v0.1 unit tests — hash reproducibility and ID resolution.
 */

import {
  buildProductManifest,
  resolveUrsBaselineId,
  verifyPersistedManifestIntegrity,
} from './manifest';

describe('Product Manifest v0.1', () => {
  const baseInput = {
    productId: 'prod-1',
    productVersion: '1.0',
    productVersionId: 'ver-1',
    productBaselineId: 'pbl-1',
    ursBaselineId: 'urs-bl-1',
    requirementSetId: 'set-1',
    ursVersion: '1.0',
    ursContentHash: 'a'.repeat(64),
    components: [
      {
        id: 'comp-1',
        productVersionId: 'ver-1',
        componentType: 'INPUT_PORT' as const,
        name: 'MQTT Source',
        createdBy: 'user:default/a',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        revision: 1,
      },
    ],
    contracts: [
      {
        id: 'dc-1',
        productComponentId: 'comp-1',
        schemaType: 'JSON_SCHEMA' as const,
        status: 'DRAFT' as const,
        version: '1.0',
        createdBy: 'user:default/a',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        revision: 1,
      },
    ],
  };

  it('builds a ProductManifest with server-side contentHash', () => {
    const manifest = buildProductManifest(baseInput);
    expect(manifest.apiVersion).toBe('pharma-data-factory.io/v1alpha1');
    expect(manifest.kind).toBe('ProductManifest');
    expect(manifest.metadata.manifestVersion).toBe('0.1');
    expect(manifest.spec.ursBaselineId).toBe('urs-bl-1');
    expect(manifest.spec.components).toHaveLength(1);
    expect(manifest.spec.dataContracts).toHaveLength(1);
    expect(manifest.metadata.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces a reproducible contentHash for the same canonical input', () => {
    const a = buildProductManifest(baseInput);
    const b = buildProductManifest(baseInput);
    expect(a.metadata.contentHash).toBe(b.metadata.contentHash);
  });

  it('changes contentHash when ursBaselineId changes', () => {
    const a = buildProductManifest(baseInput);
    const b = buildProductManifest({
      ...baseInput,
      ursBaselineId: 'urs-bl-2',
    });
    expect(a.metadata.contentHash).not.toBe(b.metadata.contentHash);
  });

  it('resolveUrsBaselineId prefers ursBaselineId over legacy array', () => {
    expect(
      resolveUrsBaselineId({
        ursBaselineId: 'a',
        ursBaselineIds: ['b', 'c'],
      }),
    ).toBe('a');
  });

  it('resolveUrsBaselineId accepts legacy single-element array', () => {
    expect(resolveUrsBaselineId({ ursBaselineIds: ['legacy-1'] })).toBe(
      'legacy-1',
    );
  });

  it('resolveUrsBaselineId rejects empty or multi legacy arrays', () => {
    expect(resolveUrsBaselineId({})).toBeUndefined();
    expect(resolveUrsBaselineId({ ursBaselineIds: [] })).toBeUndefined();
    expect(
      resolveUrsBaselineId({ ursBaselineIds: ['a', 'b'] }),
    ).toBeUndefined();
  });

  describe('verifyPersistedManifestIntegrity', () => {
    it('returns no issues for a freshly built manifest', () => {
      const manifest = buildProductManifest(baseInput);
      expect(
        verifyPersistedManifestIntegrity({
          document: manifest,
          expectedContentHash: manifest.metadata.contentHash,
          expectedUrsBaselineId: 'urs-bl-1',
          expectedProductBaselineId: 'pbl-1',
        }),
      ).toEqual([]);
    });

    it('detects MANIFEST_HASH_MISMATCH when stored hash is wrong', () => {
      const manifest = buildProductManifest(baseInput);
      const issues = verifyPersistedManifestIntegrity({
        document: manifest,
        expectedContentHash: '0'.repeat(64),
        expectedUrsBaselineId: 'urs-bl-1',
      });
      expect(issues.some(i => i.code === 'MANIFEST_HASH_MISMATCH')).toBe(true);
    });

    it('detects MANIFEST_URS_MISMATCH when URS pin drifts', () => {
      const manifest = buildProductManifest(baseInput);
      const issues = verifyPersistedManifestIntegrity({
        document: manifest,
        expectedContentHash: manifest.metadata.contentHash,
        expectedUrsBaselineId: 'other-urs',
      });
      expect(issues.some(i => i.code === 'MANIFEST_URS_MISMATCH')).toBe(true);
    });

    it('detects MANIFEST_HASH_MISMATCH when document body is tampered', () => {
      const manifest = buildProductManifest(baseInput);
      const tampered = {
        ...manifest,
        spec: {
          ...manifest.spec,
          components: [
            ...manifest.spec.components,
            {
              id: 'extra',
              name: 'Tampered',
              componentType: 'PROCESSING',
            },
          ],
        },
      };
      const issues = verifyPersistedManifestIntegrity({
        document: tampered,
        expectedContentHash: manifest.metadata.contentHash,
        expectedUrsBaselineId: 'urs-bl-1',
      });
      expect(issues.some(i => i.code === 'MANIFEST_HASH_MISMATCH')).toBe(true);
    });
  });
});
