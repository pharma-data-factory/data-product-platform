import {
  MARKETPLACE_CATEGORY_KINDS,
  MARKETPLACE_SPEC_KEY,
  UNCERTIFIED_STATUS,
  marketplaceOfferingsFromRegistry,
  marketplaceViewOfManifest,
  representativeVersion,
  type RegistryArtifactWithVersions,
} from './marketplace-artifact';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  type ArtifactManifest,
} from './artifact';

function manifest(overrides: Partial<ArtifactManifest> = {}): ArtifactManifest {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: 'CONNECTOR',
    metadata: {
      namespace: 'acme',
      name: 'acme-connector',
      version: '1.2.0',
      displayName: 'Acme Connector',
      description: 'Reads from the Acme system.',
    },
    spec: {
      [MARKETPLACE_SPEC_KEY]: {
        category: 'Connectors',
        provider: 'Acme',
        compatibility: 'Python 3.12+, Docker',
        status: 'available',
        documentation: '/docs/acme-connector',
      },
    },
    ...overrides,
  };
}

function marketplaceField(m: ArtifactManifest): Record<string, unknown> {
  return { ...(m.spec?.[MARKETPLACE_SPEC_KEY] as Record<string, unknown>) };
}

describe('category mapping', () => {
  it('maps each display category to one artifact kind', () => {
    expect(MARKETPLACE_CATEGORY_KINDS).toEqual({
      Templates: 'TEMPLATE',
      Connectors: 'CONNECTOR',
      'Data Products': 'DATA_PRODUCT',
      'Platform Components': 'COMPONENT',
    });
  });
});

describe('manifest to offering view', () => {
  it('reads a complete manifest back into a view', () => {
    const view = marketplaceViewOfManifest(manifest());
    expect(view).toEqual({
      id: 'acme-connector',
      name: 'Acme Connector',
      category: 'Connectors',
      version: '1.2.0',
      description: 'Reads from the Acme system.',
      provider: 'Acme',
      compatibility: 'Python 3.12+, Docker',
      status: 'available',
      documentation: '/docs/acme-connector',
    });
  });

  it('carries the source ref as the template reference', () => {
    const withSourceRef = manifest();
    withSourceRef.spec = {
      sourceRef: 'template:default/acme-connector',
      [MARKETPLACE_SPEC_KEY]: marketplaceField(withSourceRef),
    };
    expect(marketplaceViewOfManifest(withSourceRef)?.templateReference).toBe(
      'template:default/acme-connector',
    );
  });

  it('leaves templateReference out when the manifest has no sourceRef', () => {
    const view = marketplaceViewOfManifest(manifest());
    expect(view).not.toHaveProperty('templateReference');
  });

  it('carries catalogEntityRef and contractApiRef when present', () => {
    const m = manifest();
    m.spec = {
      [MARKETPLACE_SPEC_KEY]: {
        ...marketplaceField(m),
        catalogEntityRef: 'component:default/acme-connector',
        contractApiRef: 'api:default/acme-connector--acme-event',
      },
    };
    const view = marketplaceViewOfManifest(m);
    expect(view?.catalogEntityRef).toBe('component:default/acme-connector');
    expect(view?.contractApiRef).toBe(
      'api:default/acme-connector--acme-event',
    );
  });

  it('gives nothing back for a manifest with no marketplace metadata', () => {
    expect(marketplaceViewOfManifest(manifest({ spec: {} }))).toBeUndefined();
  });

  it('gives nothing back when a required marketplace field is missing', () => {
    const m = manifest();
    const fields = marketplaceField(m);
    delete fields.category;
    m.spec = { [MARKETPLACE_SPEC_KEY]: fields };
    expect(marketplaceViewOfManifest(m)).toBeUndefined();
  });

  it('gives nothing back for a manifest the registry would reject', () => {
    const m = manifest({
      metadata: { ...manifest().metadata, version: 'nightly' },
    });
    expect(marketplaceViewOfManifest(m)).toBeUndefined();
  });

  it('gives nothing back when the category names a different kind than the manifest declares', () => {
    // Connectors maps to CONNECTOR; declaring TEMPLATE alongside it is a
    // contradiction, not a category the mapping simply lacks.
    const m = manifest({ kind: 'TEMPLATE' });
    expect(marketplaceViewOfManifest(m)).toBeUndefined();
  });

  it('has no certificationStatus field to read back', () => {
    const view = marketplaceViewOfManifest(manifest());
    expect(view).not.toHaveProperty('certificationStatus');
  });
});

describe('representativeVersion', () => {
  it('prefers a RELEASED version over any other', () => {
    const versions = [
      { version: '2.0.0', lifecycle: 'DRAFT' },
      { version: '1.0.0', lifecycle: 'RELEASED' },
    ];
    expect(representativeVersion(versions)?.version).toBe('1.0.0');
  });

  it('falls back to the highest version when none is released', () => {
    const versions = [
      { version: '1.0.0', lifecycle: 'DRAFT' },
      { version: '1.2.0', lifecycle: 'TESTING' },
    ];
    expect(representativeVersion(versions)?.version).toBe('1.2.0');
  });

  it('gives nothing back for an empty list', () => {
    expect(representativeVersion([])).toBeUndefined();
  });
});

describe('offerings from a registry listing', () => {
  function artifact(
    overrides: Partial<RegistryArtifactWithVersions> = {},
  ): RegistryArtifactWithVersions {
    return {
      namespace: 'acme',
      name: 'acme-connector',
      versions: [
        {
          version: '1.2.0',
          lifecycle: 'DRAFT',
          manifest: manifest(),
        },
      ],
      ...overrides,
    };
  }

  it('joins the manifest view with the version certification', () => {
    const offerings = marketplaceOfferingsFromRegistry([
      artifact({
        versions: [
          {
            version: '1.2.0',
            lifecycle: 'CERTIFIED',
            certificationStatus: 'CERTIFIED',
            manifest: manifest(),
          },
        ],
      }),
    ]);
    expect(offerings).toHaveLength(1);
    expect(offerings[0].certificationStatus).toBe('CERTIFIED');
  });

  it('shows the uncertified floor when the version carries no certification', () => {
    const offerings = marketplaceOfferingsFromRegistry([artifact()]);
    expect(offerings).toHaveLength(1);
    expect(offerings[0].certificationStatus).toBe(UNCERTIFIED_STATUS);
  });

  it('drops an artifact with no versions', () => {
    expect(marketplaceOfferingsFromRegistry([artifact({ versions: [] })])).toEqual(
      [],
    );
  });

  it('drops an artifact whose representative version has no manifest', () => {
    expect(
      marketplaceOfferingsFromRegistry([
        artifact({
          versions: [{ version: '1.2.0', lifecycle: 'DRAFT' }],
        }),
      ]),
    ).toEqual([]);
  });

  it('drops an artifact whose manifest is not a renderable offering', () => {
    expect(
      marketplaceOfferingsFromRegistry([
        artifact({
          versions: [
            { version: '1.2.0', lifecycle: 'DRAFT', manifest: manifest({ spec: {} }) },
          ],
        }),
      ]),
    ).toEqual([]);
  });
});
