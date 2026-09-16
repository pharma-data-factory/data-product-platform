import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {
  catalogGraphPathForRef,
  isOfficialGoldenPath,
  parseCompositionManifest,
  toRelatedPlatformComponents,
  validateComposition,
  type CatalogEntityLike,
  type PlatformComponent,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function loadYamlDocs(relative: string): CatalogEntityLike[] {
  return yaml
    .parseAllDocuments(read(relative))
    .map(doc => doc.toJSON())
    .filter(Boolean) as CatalogEntityLike[];
}

function loadCatalogEntities(): CatalogEntityLike[] {
  const fromEntities = [
    ...loadYamlDocs('catalog/entities.yaml'),
    ...loadYamlDocs('catalog/samples/entities.yaml'),
  ];
  const location = loadYamlDocs('platform-components/catalog.yaml');
  const fromLibrary = location.flatMap(entity => {
    if (entity.kind !== 'Location') {
      return entity.kind ? [entity] : [];
    }
    return ((entity.spec as { targets?: string[] } | undefined)?.targets ?? []).flatMap(
      (target: string) =>
        loadYamlDocs(path.join('platform-components', target.replace(/^\.\//, ''))),
    );
  });
  return [...fromEntities, ...fromLibrary];
}

function catalogComponents(): PlatformComponent[] {
  return toRelatedPlatformComponents(loadCatalogEntities());
}

function requireComponent(name: string): CatalogEntityLike {
  const match = loadCatalogEntities().find(
    entity => entity.kind === 'Component' && entity.metadata.name === name,
  );
  if (!match) {
    throw new Error(`Missing catalog component ${name}`);
  }
  return match;
}

describe('UNS Machine State Consumer composition proof', () => {
  it('parses the version-controlled composition and validates Unified Namespace', () => {
    const composition = parseCompositionManifest(
      read('catalog/compositions/machine-state-consumer.yaml'),
    );
    expect(composition.apiVersion).toBe('dataprod.platform/v1alpha1');
    expect(composition.kind).toBe('GoldenPathComposition');
    expect(composition.metadata.name).toBe('machine-state-consumer');
    expect(composition.spec.components).toEqual([
      { ref: 'component:default/unified-namespace', version: '1.x' },
    ]);
    expect(composition.spec.components.map(item => item.ref)).not.toEqual(
      expect.arrayContaining([
        'component:default/rest-api',
        'component:default/observability',
      ]),
    );

    const result = validateComposition(composition, catalogComponents());
    expect(result.issues).toEqual([]);
    expect(result.compatible).toBe(true);

    const uns = catalogComponents().find(item => item.name === 'unified-namespace');
    expect(uns?.entityRef).toBe('component:default/unified-namespace');
    expect(uns?.certificationStatus).not.toBe('DEPRECATED');
    expect(uns?.compatibleStandardVersions).toEqual(
      expect.arrayContaining(['1.x']),
    );
  });

  it('rejects a missing Unified Namespace component', () => {
    const result = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: missing-uns
spec:
  standardVersion: 1.0.0
  components:
    - ref: component:default/missing-unified-namespace
      version: 1.x
`),
      catalogComponents(),
    );
    expect(result.compatible).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain('MISSING_COMPONENT');
  });

  it('rejects a deprecated Unified Namespace component', () => {
    const catalog = catalogComponents().map(component =>
      component.name === 'unified-namespace'
        ? { ...component, certificationStatus: 'DEPRECATED' as const }
        : component,
    );
    const result = validateComposition(
      parseCompositionManifest(
        read('catalog/compositions/machine-state-consumer.yaml'),
      ),
      catalog,
    );
    expect(result.compatible).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain(
      'DEPRECATED_COMPONENT',
    );
  });

  it('rejects an incompatible Unified Namespace version constraint', () => {
    const result = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: incompatible-uns
spec:
  standardVersion: 1.0.0
  components:
    - ref: component:default/unified-namespace
      version: 2.x
`),
      catalogComponents(),
    );
    expect(result.compatible).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain(
      'VERSION_INCOMPATIBLE',
    );
  });

  it('registers native Catalog dependsOn, inverse Used By, and Catalog Graph', () => {
    const entities = loadCatalogEntities();
    const consumer = requireComponent('sample-machine-state-consumer');
    const uns = requireComponent('unified-namespace');
    expect(consumer.spec?.type).toBe('data-product');
    expect(consumer.spec?.dependsOn).toEqual([
      'component:default/unified-namespace',
    ]);
    expect(consumer.spec?.consumesApis).toEqual([
      'unified-namespace--machine-state-event',
    ]);
    expect(consumer.spec?.providesApis).toEqual([
      'sample-machine-state-consumer--machine-state-event',
    ]);
    expect(consumer.metadata.annotations?.['dataprod.platform/depends-on']).toBeUndefined();
    expect(uns.spec?.type).toBe('platform-component');
    expect(uns.spec?.providesApis).toContain(
      'unified-namespace--machine-state-event',
    );

    const related = toRelatedPlatformComponents(entities);
    const unsRelated = related.find(item => item.name === 'unified-namespace');
    expect(unsRelated?.usedBy).toContain('Machine State Consumer Data Product');
    expect(catalogGraphPathForRef('component:default/unified-namespace')).toBe(
      '/catalog-graph?rootEntityRefs=component%3Adefault%2Funified-namespace',
    );
    expect(
      catalogGraphPathForRef('component:default/sample-machine-state-consumer'),
    ).toBe(
      '/catalog-graph?rootEntityRefs=component%3Adefault%2Fsample-machine-state-consumer',
    );
    // Entity links must be absolute URLs. A relative shortcut here made the
    // Backstage catalog reject the whole entity, so the Catalog Graph is
    // reached through its entity-page tab instead (see the helper assertions
    // above, which cover the in-app navigation path).
    for (const link of consumer.metadata.links ?? []) {
      expect(() => new URL(link.url)).not.toThrow();
    }
  });

  it('does not treat the composition proof as an official Golden Path', () => {
    expect(isOfficialGoldenPath('machine-state-consumer-data-product')).toBe(
      false,
    );
    expect(isOfficialGoldenPath('mqtt-temperature-data-product')).toBe(true);
    expect(isOfficialGoldenPath('rest-equipment-data-product')).toBe(true);
    expect(isOfficialGoldenPath('oee-data-product')).toBe(true);
  });
});
