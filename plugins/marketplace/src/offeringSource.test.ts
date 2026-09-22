/**
 * The Marketplace's offering source.
 *
 * The registry is the only source now — no fallback, no legacy array. What
 * matters here is that a registry listing becomes the right cards, that a
 * card carries the certification the *version* holds rather than one baked
 * into the manifest, and that a registry failure surfaces rather than being
 * silently absorbed.
 */

import {
  ARTIFACT_MANIFEST_API_VERSION,
  MARKETPLACE_SPEC_KEY,
  type ArtifactManifest,
  type RegistryArtifactWithVersions,
} from '@internal/platform-common';
import {
  loadOfferings,
  offeringViewToItem,
  offeringsFromRegistryResponse,
} from './offeringSource';

function manifest(overrides: Partial<ArtifactManifest> = {}): ArtifactManifest {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: 'CONNECTOR',
    metadata: {
      namespace: 'nexora',
      name: 'acme-connector',
      version: '1.0.0',
      displayName: 'Acme Connector',
      description: 'Reads from Acme.',
    },
    spec: {
      [MARKETPLACE_SPEC_KEY]: {
        category: 'Connectors',
        provider: 'Nexora',
        compatibility: 'Python 3.12+',
        status: 'available',
        documentation: '/docs/acme-connector',
      },
    },
    ...overrides,
  };
}

function artifact(
  overrides: Partial<RegistryArtifactWithVersions> = {},
): RegistryArtifactWithVersions {
  const m = manifest();
  return {
    namespace: m.metadata.namespace,
    name: m.metadata.name,
    versions: [{ version: m.metadata.version, lifecycle: 'DRAFT', manifest: m }],
    ...overrides,
  };
}

const api = (
  impl: () => Promise<RegistryArtifactWithVersions[]>,
): { listArtifactsWithVersions: () => Promise<RegistryArtifactWithVersions[]> } => ({
  listArtifactsWithVersions: impl,
});

describe('offerings from the registry', () => {
  it('turns a registry listing into Marketplace items', async () => {
    const result = await loadOfferings(api(async () => [artifact()]));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'acme-connector',
      name: 'Acme Connector',
      category: 'Connectors',
    });
  });

  it('carries the version certification, not one from the manifest', async () => {
    const result = await loadOfferings(
      api(async () => [
        artifact({
          versions: [
            {
              version: '1.0.0',
              lifecycle: 'CERTIFIED',
              certificationStatus: 'CERTIFIED',
              manifest: manifest(),
            },
          ],
        }),
      ]),
    );
    expect(result[0].certificationStatus).toBe('CERTIFIED');
  });

  it('shows an uncertified floor when the version carries no certification', async () => {
    const result = await loadOfferings(api(async () => [artifact()]));
    expect(result[0].certificationStatus).toBe('DEVELOPMENT');
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
    const tampered = manifest({
      spec: {
        [MARKETPLACE_SPEC_KEY]: {
          category: 'Wallcharts',
          provider: 'Nexora',
          compatibility: 'Python 3.12+',
          status: 'available',
          documentation: '/docs/acme-connector',
        },
      },
    });

    expect(
      offeringsFromRegistryResponse([
        {
          namespace: 'nexora',
          name: 'acme-connector',
          versions: [
            { version: '1.0.0', lifecycle: 'DRAFT', manifest: tampered },
          ],
        },
      ]),
    ).toEqual([]);
  });
});

describe('a failing or empty registry', () => {
  it('rejects when the registry call fails, rather than substituting anything', async () => {
    await expect(
      loadOfferings(
        api(async () => {
          throw new Error('registry unreachable');
        }),
      ),
    ).rejects.toThrow('registry unreachable');
  });

  it('resolves to an empty list when the registry has nothing renderable', async () => {
    await expect(loadOfferings(api(async () => []))).resolves.toEqual([]);
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
      publisherTrustLevel: 'INTERNAL',
      externalPublisher: false,
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
      publisherTrustLevel: 'INTERNAL',
      externalPublisher: false,
    };
    expect(offeringViewToItem(view)).toBeUndefined();
  });
});
