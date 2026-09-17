/**
 * The Marketplace's offering source.
 *
 * Two things are load-bearing. That a registry listing becomes exactly the
 * cards the array produces — parity, which is what licenses the switch — and
 * that nothing the registry can do empties the catalogue.
 */

import {
  marketplaceOfferingToManifest,
  type RegistryArtifactWithVersions,
} from '@internal/platform-common';
import { marketplaceItems } from './data';
import {
  loadOfferings,
  offeringViewToItem,
  offeringsFromRegistryResponse,
} from './offeringSource';

/** The registry response the twelve committed manifests produce. */
function registryResponse(
  options: { lifecycle?: string } = {},
): RegistryArtifactWithVersions[] {
  return marketplaceItems.map(item => {
    const manifest = marketplaceOfferingToManifest(item)!;
    return {
      namespace: manifest.metadata.namespace,
      name: manifest.metadata.name,
      versions: [
        {
          version: manifest.metadata.version,
          lifecycle: options.lifecycle ?? 'DRAFT',
          manifest,
        },
      ],
    };
  });
}

const api = (
  impl: () => Promise<RegistryArtifactWithVersions[]>,
): { listArtifactsWithVersions: () => Promise<RegistryArtifactWithVersions[]> } => ({
  listArtifactsWithVersions: impl,
});

describe('offerings from the registry', () => {
  it('reproduces the legacy offerings exactly', async () => {
    const result = await loadOfferings(
      api(async () => registryResponse()),
    );

    expect(result.source).toBe('registry');
    // Including the order. The registry returns artifacts by name, so without
    // this the catalogue would silently re-sort alphabetically the moment it
    // became the source — a visible change, which parity does not permit.
    expect(result.items).toEqual(marketplaceItems);
  });

  it('puts an offering the array never had after the ones it did', async () => {
    const extra = {
      ...marketplaceItems[0],
      id: 'zz-new-connector',
      name: 'ZZ New Connector',
      category: 'Connectors' as const,
    };
    const response = [
      ...registryResponse(),
      {
        namespace: 'nexora',
        name: 'zz-new-connector',
        versions: [
          {
            version: '1.0.0',
            lifecycle: 'DRAFT',
            manifest: marketplaceOfferingToManifest(extra)!,
          },
        ],
      },
    ];

    const result = await loadOfferings(api(async () => response));

    expect(result.items).toHaveLength(marketplaceItems.length + 1);
    expect(result.items[result.items.length - 1].id).toBe('zz-new-connector');
  });

  it('keeps the certification the offering displays today', async () => {
    // Parity, not endorsement. The registry's own lifecycle is DRAFT for all
    // twelve; what the card shows is the legacy claim carried in the manifest.
    // See NXD-019 — reconciling the two is a decision, not a mapping.
    const result = await loadOfferings(api(async () => registryResponse()));
    const certified = result.items
      .filter(item => item.certificationStatus === 'CERTIFIED')
      .map(item => item.id)
      .sort();

    expect(certified).toEqual(['aas-data-product', 'oee-data-product']);
  });

  it('prefers a RELEASED version over a draft of the same artifact', () => {
    const manifest = marketplaceOfferingToManifest(marketplaceItems[0])!;
    const older = {
      ...manifest,
      metadata: { ...manifest.metadata, version: '1.0.0' },
    };
    const newer = {
      ...manifest,
      metadata: { ...manifest.metadata, version: '2.0.0' },
    };

    const items = offeringsFromRegistryResponse([
      {
        namespace: 'nexora',
        name: manifest.metadata.name,
        versions: [
          { version: '2.0.0', lifecycle: 'DRAFT', manifest: newer },
          { version: '1.0.0', lifecycle: 'RELEASED', manifest: older },
        ],
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].version).toBe('1.0.0');
  });

  it('falls back to the highest version when none is released', () => {
    const manifest = marketplaceOfferingToManifest(marketplaceItems[0])!;
    const items = offeringsFromRegistryResponse([
      {
        namespace: 'nexora',
        name: manifest.metadata.name,
        versions: [
          {
            version: '1.0.0',
            lifecycle: 'DRAFT',
            manifest: {
              ...manifest,
              metadata: { ...manifest.metadata, version: '1.0.0' },
            },
          },
          {
            version: '1.2.0',
            lifecycle: 'DRAFT',
            manifest: {
              ...manifest,
              metadata: { ...manifest.metadata, version: '1.2.0' },
            },
          },
        ],
      },
    ]);

    expect(items[0].version).toBe('1.2.0');
  });

  it('drops an artifact with no manifest rather than inventing a card', () => {
    expect(
      offeringsFromRegistryResponse([
        { namespace: 'nexora', name: 'headless', versions: [] },
        {
          namespace: 'nexora',
          name: 'manifestless',
          versions: [{ version: '1.0.0', lifecycle: 'DRAFT' }],
        },
      ]),
    ).toEqual([]);
  });

  it('drops an offering whose category this Marketplace cannot file', () => {
    const manifest = marketplaceOfferingToManifest(marketplaceItems[0])!;
    const spec = manifest.spec as Record<string, unknown>;
    const tampered = {
      ...manifest,
      spec: {
        ...spec,
        marketplace: {
          ...(spec.marketplace as Record<string, unknown>),
          category: 'Wallcharts',
        },
      },
    };

    expect(
      offeringsFromRegistryResponse([
        {
          namespace: 'nexora',
          name: manifest.metadata.name,
          versions: [
            { version: '1.0.0', lifecycle: 'DRAFT', manifest: tampered },
          ],
        },
      ]),
    ).toEqual([]);
  });
});

describe('the fallback to the legacy array', () => {
  it('is used when the registry call fails, and says why', async () => {
    const result = await loadOfferings(
      api(async () => {
        throw new Error('registry unreachable');
      }),
    );

    expect(result.source).toBe('legacy');
    expect(result.reason).toContain('registry unreachable');
    expect(result.items).toEqual(marketplaceItems);
  });

  it('is used when the registry answers with nothing renderable', async () => {
    // An empty registry and one that has not loaded yet look the same from
    // here, and an empty Marketplace is the worse of the two mistakes.
    const result = await loadOfferings(api(async () => []));

    expect(result.source).toBe('legacy');
    expect(result.items).toEqual(marketplaceItems);
  });

  it('never rejects, so a caller cannot be left with no offerings', async () => {
    await expect(
      loadOfferings(
        api(() => Promise.reject(new Error('boom'))),
      ),
    ).resolves.toMatchObject({ source: 'legacy' });
  });
});

describe('offeringViewToItem', () => {
  it('narrows a known category', () => {
    const view = {
      id: 'x',
      name: 'X',
      category: 'Connectors',
      version: '1.0.0',
      description: 'd',
      provider: 'Nexora',
      compatibility: 'c',
      status: 'available',
      certificationStatus: 'TESTED',
      documentation: '/docs',
    };
    expect(offeringViewToItem(view)?.category).toBe('Connectors');
  });

  it('refuses a category outside the Marketplace taxonomy', () => {
    const view = {
      id: 'x',
      name: 'X',
      category: 'Wallcharts',
      version: '1.0.0',
      description: 'd',
      provider: 'Nexora',
      compatibility: 'c',
      status: 'available',
      certificationStatus: 'TESTED',
      documentation: '/docs',
    };
    expect(offeringViewToItem(view)).toBeUndefined();
  });
});
