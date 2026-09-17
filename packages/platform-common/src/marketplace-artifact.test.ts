import {
  MARKETPLACE_CATEGORY_KINDS,
  MARKETPLACE_SPEC_KEY,
  marketplaceNamespaceFor,
  marketplaceOfferingToManifest,
  marketplaceOfferingView,
  marketplaceViewOfManifest,
  validateMarketplaceOffering,
  type MarketplaceOffering,
} from './marketplace-artifact';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  validateArtifactManifest,
} from './artifact';

function offering(
  overrides: Partial<MarketplaceOffering> = {},
): MarketplaceOffering {
  return {
    id: 'acme-connector',
    name: 'Acme Connector',
    category: 'Connectors',
    version: '1.2.0',
    description: 'Reads from the Acme system.',
    provider: 'Acme',
    compatibility: 'Python 3.12+, Docker',
    status: 'available',
    certificationStatus: 'TESTED',
    documentation: '/docs/acme-connector',
    ...overrides,
  };
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

  it('rejects a category it has no kind for rather than guessing one', () => {
    const issues = validateMarketplaceOffering(
      offering({ category: 'Solutions' }),
    );
    expect(issues).toEqual([
      expect.stringContaining('category "Solutions" has no artifact kind'),
    ]);
    expect(
      marketplaceOfferingToManifest(offering({ category: 'Solutions' })),
    ).toBeUndefined();
  });
});

describe('namespace derivation', () => {
  it.each([
    ['Nexora', 'nexora'],
    ['Acme Corp', 'acme-corp'],
    ['Acme  Corp. GmbH', 'acme-corp-gmbh'],
    ['  Acme  ', 'acme'],
  ])('reduces %p to %p', (provider, expected) => {
    expect(marketplaceNamespaceFor(provider)).toBe(expected);
  });

  it('gives nothing back for a provider with no usable segment', () => {
    expect(marketplaceNamespaceFor('///')).toBeUndefined();
    expect(marketplaceNamespaceFor('')).toBeUndefined();
  });

  it('refuses a provider name too long to be a segment', () => {
    expect(marketplaceNamespaceFor('a'.repeat(65))).toBeUndefined();
  });
});

describe('offering validation', () => {
  it('accepts an offering the registry can take', () => {
    expect(validateMarketplaceOffering(offering())).toEqual([]);
  });

  it('reports every missing required field at once', () => {
    const issues = validateMarketplaceOffering({ id: 'acme-connector' });
    expect(issues).toEqual(
      expect.arrayContaining([
        'name is required',
        'category is required',
        'version is required',
        'description is required',
        'provider is required',
        'compatibility is required',
        'status is required',
        'certificationStatus is required',
        'documentation is required',
      ]),
    );
  });

  it('refuses an id that cannot be an artifact name', () => {
    expect(validateMarketplaceOffering(offering({ id: 'Acme Connector' }))).toEqual([
      expect.stringContaining('cannot be an artifact name'),
    ]);
  });

  it('refuses a version the shared grammar rejects', () => {
    expect(validateMarketplaceOffering(offering({ version: 'v1' }))).toEqual([
      expect.stringContaining('version:'),
    ]);
  });

  it('accepts a zero major version', () => {
    expect(validateMarketplaceOffering(offering({ version: '0.1.0' }))).toEqual(
      [],
    );
  });

  it('refuses a status or certification outside the known sets', () => {
    expect(validateMarketplaceOffering(offering({ status: 'beta' }))).toEqual([
      expect.stringContaining('status "beta"'),
    ]);
    expect(
      validateMarketplaceOffering(offering({ certificationStatus: 'GOLD' })),
    ).toEqual([expect.stringContaining('certificationStatus "GOLD"')]);
  });

  it('rejects a non-object', () => {
    expect(validateMarketplaceOffering(null)).toEqual(['Offering must be an object']);
    expect(validateMarketplaceOffering([])).toEqual(['Offering must be an object']);
  });
});

describe('offering to manifest', () => {
  it('produces a manifest the registry accepts', () => {
    const manifest = marketplaceOfferingToManifest(offering())!;
    expect(validateArtifactManifest(manifest)).toEqual([]);
    expect(manifest.apiVersion).toBe(ARTIFACT_MANIFEST_API_VERSION);
    expect(manifest.kind).toBe('CONNECTOR');
    expect(manifest.metadata).toMatchObject({
      namespace: 'acme',
      name: 'acme-connector',
      version: '1.2.0',
      displayName: 'Acme Connector',
    });
  });

  it('carries the template reference as the version source', () => {
    const manifest = marketplaceOfferingToManifest(
      offering({ templateReference: 'template:default/acme-connector' }),
    )!;
    expect(manifest.spec?.sourceRef).toBe('template:default/acme-connector');
  });

  it('leaves sourceRef out when the offering has no template', () => {
    const manifest = marketplaceOfferingToManifest(offering())!;
    expect(manifest.spec).not.toHaveProperty('sourceRef');
  });

  it('keeps the display category as metadata rather than as a kind', () => {
    const manifest = marketplaceOfferingToManifest(offering())!;
    expect(manifest.spec?.[MARKETPLACE_SPEC_KEY]).toMatchObject({
      category: 'Connectors',
      provider: 'Acme',
    });
  });

  it('does not let an offering declare its own registry certification', () => {
    // The claim travels as Marketplace metadata only. Nothing in the manifest
    // may set ArtifactVersion.certificationStatus — that is what review and
    // certification are for.
    const manifest = marketplaceOfferingToManifest(
      offering({ certificationStatus: 'CERTIFIED' }),
    )!;
    expect(manifest).not.toHaveProperty('certificationStatus');
    expect(manifest.spec).not.toHaveProperty('certificationStatus');
    expect(
      (manifest.spec?.[MARKETPLACE_SPEC_KEY] as Record<string, unknown>)
        .certificationStatus,
    ).toBe('CERTIFIED');
  });

  it('gives nothing back for an offering it cannot map', () => {
    expect(
      marketplaceOfferingToManifest(offering({ version: 'nightly' })),
    ).toBeUndefined();
  });
});

describe('manifest back to offering', () => {
  it('round-trips every stored field', () => {
    const original = offering({
      templateReference: 'template:default/acme-connector',
      catalogEntityRef: 'component:default/acme-connector',
      contractApiRef: 'api:default/acme-connector--acme-event',
    });
    const manifest = marketplaceOfferingToManifest(original)!;
    expect(marketplaceViewOfManifest(manifest)).toEqual(
      marketplaceOfferingView(original),
    );
  });

  it('round-trips an offering with no optional references', () => {
    const original = offering();
    const manifest = marketplaceOfferingToManifest(original)!;
    const view = marketplaceViewOfManifest(manifest);
    expect(view).toEqual(marketplaceOfferingView(original));
    expect(view).not.toHaveProperty('templateReference');
    expect(view).not.toHaveProperty('catalogEntityRef');
    expect(view).not.toHaveProperty('contractApiRef');
  });

  it('gives nothing back for a manifest with no marketplace metadata', () => {
    const manifest = marketplaceOfferingToManifest(offering())!;
    expect(
      marketplaceViewOfManifest({ ...manifest, spec: {} }),
    ).toBeUndefined();
  });

  it('gives nothing back when a required marketplace field is missing', () => {
    const manifest = marketplaceOfferingToManifest(offering())!;
    const fields = {
      ...(manifest.spec?.[MARKETPLACE_SPEC_KEY] as Record<string, unknown>),
    };
    delete fields.category;
    expect(
      marketplaceViewOfManifest({
        ...manifest,
        spec: { ...manifest.spec, [MARKETPLACE_SPEC_KEY]: fields },
      }),
    ).toBeUndefined();
  });

  it('gives nothing back for a manifest the registry would reject', () => {
    const manifest = marketplaceOfferingToManifest(offering())!;
    expect(
      marketplaceViewOfManifest({
        ...manifest,
        metadata: { ...manifest.metadata, version: 'nightly' },
      }),
    ).toBeUndefined();
  });
});
