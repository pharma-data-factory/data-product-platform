import {
  CatalogEntityLike,
  filterPlatformComponents,
  isDeprecatedPlatformComponent,
  isPlatformComponentEntity,
  isValidVersionConstraint,
  parsePlatformComponentCategory,
  parsePlatformComponentCertification,
  parsePlatformComponentVersion,
  toRelatedPlatformComponents,
  versionSatisfiesConstraint,
} from './platform-components';
import { parseCompositionManifest, validateComposition } from './composition';

function component(partial: {
  name: string;
  title?: string;
  category?: string;
  version?: string;
  certification?: string;
  standard?: string;
  dependsOn?: string[];
  conflictsWith?: string[];
  lifecycle?: string;
  relations?: CatalogEntityLike['relations'];
}): CatalogEntityLike {
  return {
    kind: 'Component',
    metadata: {
      name: partial.name,
      title: partial.title || partial.name,
      description: `${partial.name} platform component`,
      tags: ['platform-component', partial.category || 'integration'],
      annotations: {
        'dataprod.platform/kind': 'platform-component',
        'dataprod.platform/version': partial.version || '1.0.0',
        'dataprod.platform/category': partial.category || 'integration',
        'dataprod.platform/certification-status': partial.certification || 'DEVELOPMENT',
        'dataprod.platform/compatible-standard-versions': partial.standard || '1.x',
        'dataprod.platform/conflicts-with': (partial.conflictsWith || []).join(','),
      },
    },
    spec: {
      type: 'platform-component',
      lifecycle: partial.lifecycle || 'experimental',
      owner: 'group:default/platform-team',
      dependsOn: partial.dependsOn || [],
    },
    relations: partial.relations,
  };
}

describe('platform component model', () => {
  it('identifies Catalog type platform-component and categories', () => {
    const kafka = component({ name: 'kafka-consumer', category: 'integration' });
    expect(isPlatformComponentEntity(kafka)).toBe(true);
    expect(
      isPlatformComponentEntity({
        kind: 'Component',
        metadata: { name: 'sample-orders-product' },
        spec: { type: 'data-product' },
      }),
    ).toBe(false);
    expect(parsePlatformComponentCategory('DATA')).toBe('data');
    expect(parsePlatformComponentCategory('intelligence')).toBe('intelligence');
    expect(parsePlatformComponentCategory('asset-semantic')).toBe('asset-semantic');
    expect(parsePlatformComponentCertification('CERTIFIED')).toBe('CERTIFIED');
    expect(parsePlatformComponentCertification('planned')).toBe('PLANNED');
  });

  it('parses SemVer and certification status', () => {
    expect(parsePlatformComponentVersion('1.2.0')).toEqual({
      major: 1,
      minor: 2,
      patch: 0,
    });
    expect(parsePlatformComponentVersion('1.x')).toBeUndefined();
    expect(isValidVersionConstraint('1.x')).toBe(true);
    expect(isValidVersionConstraint('1.2.0')).toBe(true);
    expect(isValidVersionConstraint('latest')).toBe(false);
    expect(versionSatisfiesConstraint('1.2.0', '1.x')).toBe(true);
    expect(versionSatisfiesConstraint('2.0.0', '1.x')).toBe(false);
  });

  it('derives Used By from inverse Catalog relations, not stored annotations', () => {
    const kafka = component({
      name: 'kafka-consumer',
      relations: [
        {
          type: 'dependencyOf',
          targetRef: 'component:default/example-oee-data-product',
        },
      ],
    });
    const oee: CatalogEntityLike = {
      kind: 'Component',
      metadata: {
        name: 'example-oee-data-product',
        title: 'Example OEE Data Product',
      },
      spec: {
        type: 'data-product',
        dependsOn: ['component:default/kafka-consumer'],
      },
    };
    const [mapped] = toRelatedPlatformComponents([kafka, oee]);
    expect(mapped.usedBy).toEqual(['Example OEE Data Product']);
    expect(kafka.metadata.annotations?.['dataprod.platform/used-by']).toBeUndefined();
  });
});

describe('composition validation', () => {
  const catalog = toRelatedPlatformComponents([
    component({ name: 'rest-source', version: '1.0.0', certification: 'DEVELOPMENT' }),
    component({ name: 'kafka-consumer', version: '1.2.0', certification: 'DEVELOPMENT' }),
    component({ name: 'timeseries', category: 'data', version: '1.0.0' }),
    component({ name: 'rest-api', version: '1.2.0', certification: 'TESTED' }),
    component({ name: 'observability', category: 'operations', version: '1.0.0' }),
    component({
      name: 'health',
      category: 'operations',
      version: '1.0.0',
      dependsOn: ['component:default/observability'],
    }),
    component({
      name: 'mqtt-consumer',
      version: '1.0.0',
      conflictsWith: ['kafka-consumer'],
    }),
    component({
      name: 'rag',
      category: 'intelligence',
      version: '0.0.0',
      certification: 'PLANNED',
      standard: '1.x',
    }),
    component({
      name: 'legacy-source',
      version: '1.0.0',
      certification: 'DEPRECATED',
      lifecycle: 'deprecated',
    }),
    component({
      name: 'v2-only',
      version: '2.0.0',
      standard: '2.x',
    }),
  ]);

  const oeeYaml = `
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: oee-data-product
spec:
  standardVersion: 1.0.0
  components:
    - ref: component:default/rest-source
      version: 1.x
    - ref: component:default/kafka-consumer
      version: 1.x
    - ref: component:default/timeseries
      version: 1.x
    - ref: component:default/rest-api
      version: 1.x
    - ref: component:default/observability
      version: 1.x
`;

  it('parses a composition manifest and accepts compatible versions', () => {
    const composition = parseCompositionManifest(oeeYaml);
    expect(composition.kind).toBe('GoldenPathComposition');
    expect(composition.metadata.name).toBe('oee-data-product');
    const result = validateComposition(composition, catalog);
    expect(result.issues).toEqual([]);
    expect(result.compatible).toBe(true);
  });

  it('detects missing, deprecated, unsupported, and incompatible components', () => {
    const missing = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: missing
spec:
  components:
    - ref: component:default/does-not-exist
      version: 1.x
`),
      catalog,
    );
    expect(missing.compatible).toBe(false);
    expect(missing.issues.map(issue => issue.code)).toContain('MISSING_COMPONENT');

    const deprecated = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: deprecated
spec:
  components:
    - ref: component:default/legacy-source
      version: 1.x
`),
      catalog,
    );
    expect(isDeprecatedPlatformComponent(catalog.find(item => item.name === 'legacy-source')!)).toBe(
      true,
    );
    expect(deprecated.issues.map(issue => issue.code)).toContain('DEPRECATED_COMPONENT');

    const planned = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: rag
spec:
  components:
    - ref: component:default/rag
      version: 0.0.0
`),
      catalog,
    );
    expect(planned.issues.map(issue => issue.code)).toContain('UNSUPPORTED_COMPONENT');

    const incompatible = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: range
spec:
  components:
    - ref: component:default/kafka-consumer
      version: 2.x
`),
      catalog,
    );
    expect(incompatible.issues.map(issue => issue.code)).toContain('VERSION_INCOMPATIBLE');

    const invalid = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: invalid
spec:
  components:
    - ref: component:default/rest-source
      version: latest
`),
      catalog,
    );
    expect(invalid.issues.map(issue => issue.code)).toContain('INVALID_VERSION_CONSTRAINT');
  });

  it('detects missing required dependencies, conflicts, and standard incompatibility', () => {
    const missingDep = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: health-only
spec:
  components:
    - ref: component:default/health
      version: 1.x
`),
      catalog,
    );
    expect(missingDep.issues.map(issue => issue.code)).toContain('MISSING_DEPENDENCY');

    const conflict = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: transports
spec:
  components:
    - ref: component:default/mqtt-consumer
      version: 1.x
    - ref: component:default/kafka-consumer
      version: 1.x
    - ref: component:default/observability
      version: 1.x
`),
      catalog,
    );
    expect(conflict.issues.map(issue => issue.code)).toContain('CONFLICTING_COMPONENTS');

    const standard = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: v2
spec:
  standardVersion: 1.0.0
  components:
    - ref: component:default/v2-only
      version: 2.0.0
`),
      catalog,
    );
    expect(standard.issues.map(issue => issue.code)).toContain('STANDARD_INCOMPATIBLE');
  });

  it('filters registry rows by category and certification', () => {
    const rows = filterPlatformComponents(catalog, {
      category: 'intelligence',
      certification: 'PLANNED',
    });
    expect(rows.map(item => item.name)).toEqual(['rag']);
  });
});
