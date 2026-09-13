import {
  createHttpCatalogManifestPinResolver,
  evaluateCatalogManifestPins,
} from './catalog-pin-resolver';

describe('catalog-pin-resolver', () => {
  it('resolves data-product pin annotations from Catalog', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kind: 'Component',
        metadata: {
          name: 'cold-room',
          namespace: 'default',
          annotations: {
            'dataprod.platform/kind': 'data-product',
            'dataprod.platform/product-manifest-content-hash': 'abc123',
            'dataprod.platform/urs-baseline-id': 'urs-1',
            'dataprod.platform/product-baseline-id': 'pbl-1',
            'dataprod.platform/product-version-id': 'ver-1',
            'dataprod.platform/product-id': 'prod-1',
          },
        },
        spec: { type: 'data-product' },
      }),
    });

    const resolver = createHttpCatalogManifestPinResolver({
      discovery: { getBaseUrl: async () => 'http://catalog.test' },
      auth: {
        getPluginRequestToken: async () => ({ token: 'obo' }),
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    const pins = await resolver.resolveByName('cold-room', { principal: 'u' });
    expect(pins).toEqual({
      entityRef: 'component:default/cold-room',
      name: 'cold-room',
      productManifestContentHash: 'abc123',
      ursBaselineId: 'urs-1',
      productBaselineId: 'pbl-1',
      productVersionId: 'ver-1',
      productId: 'prod-1',
    });
  });

  it('returns null on Catalog 404', async () => {
    const resolver = createHttpCatalogManifestPinResolver({
      discovery: { getBaseUrl: async () => 'http://catalog.test' },
      auth: {
        getPluginRequestToken: async () => ({ token: 'obo' }),
      },
      fetchImpl: jest.fn().mockResolvedValue({ status: 404, ok: false }) as typeof fetch,
    });
    await expect(
      resolver.resolveByName('missing', { principal: 'u' }),
    ).resolves.toBeNull();
  });

  it('evaluateCatalogManifestPins detects missing and mismatch', () => {
    const expected = {
      contentHash: 'hash-a',
      ursBaselineId: 'urs-a',
      productBaselineId: 'pbl-a',
      productVersionId: 'ver-a',
      productId: 'prod-a',
    };
    expect(
      evaluateCatalogManifestPins({
        pins: {
          entityRef: 'component:default/x',
          name: 'x',
        },
        expected,
      }).some(b => b.code === 'CATALOG_MANIFEST_PIN_MISSING'),
    ).toBe(true);

    expect(
      evaluateCatalogManifestPins({
        pins: {
          entityRef: 'component:default/x',
          name: 'x',
          productManifestContentHash: 'hash-b',
          ursBaselineId: 'urs-a',
          productBaselineId: 'pbl-a',
          productVersionId: 'ver-a',
          productId: 'prod-a',
        },
        expected,
      }).some(b => b.code === 'CATALOG_MANIFEST_PIN_MISMATCH'),
    ).toBe(true);

    expect(
      evaluateCatalogManifestPins({
        pins: {
          entityRef: 'component:default/x',
          name: 'x',
          productManifestContentHash: 'hash-a',
          ursBaselineId: 'urs-a',
          productBaselineId: 'pbl-a',
          productVersionId: 'ver-a',
          productId: 'prod-a',
        },
        expected,
      }),
    ).toEqual([]);
  });
});
