import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {
  isPlatformComponentEntity,
  compositionUsageFromManifests,
  RUNTIME_PACKAGE_SOURCE_PATHS,
  toRelatedPlatformComponents,
  usageLabelsForComponent,
  validateComposition,
} from '@internal/platform-common';
import {
  artifactManifestsOnDisk,
  readGoldenPathComposition,
} from './__testUtils__/goldenPathCompositions';

// The usage table is derived from the manifests now, not restated in Core.
// See NXD-029.
const USAGE = compositionUsageFromManifests(artifactManifestsOnDisk());

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function loadYamlDocs(relative: string): Array<Record<string, any>> {
  return yaml
    .parseAllDocuments(read(relative))
    .map(doc => doc.toJSON())
    .filter(Boolean);
}

function loadPlatformComponentCatalog() {
  const fromEntities = [
    ...loadYamlDocs('catalog/entities.yaml'),
    ...loadYamlDocs('catalog/samples/entities.yaml'),
  ];
  const location = loadYamlDocs('platform-components/catalog.yaml');
  const fromLibrary = location.flatMap(entity => {
    if (entity.kind !== 'Location') {
      return entity.kind ? [entity] : [];
    }
    return (entity.spec?.targets ?? []).flatMap((target: string) =>
      loadYamlDocs(path.join('platform-components', target.replace(/^\.\//, ''))),
    );
  });
  return [...fromEntities, ...fromLibrary];
}

describe('Platform Component library', () => {
  it('registers Catalog type platform-component with categories', () => {
    const entities = loadPlatformComponentCatalog();
    const components = entities.filter(
      entity => entity.kind === 'Component' && isPlatformComponentEntity(entity),
    );
    const names = components.map(entity => entity.metadata.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'unified-namespace',
        'rest-source',
        'rest-api',
        'mqtt-consumer',
        'kafka-consumer',
        'postgres',
        'timeseries',
        'observability',
        'rag',
        'knowledge-graph',
        'aas-foundation',
      ]),
    );
    expect(
      components.find(entity => entity.metadata.name === 'unified-namespace')
        ?.metadata.annotations['dataprod.platform/category'],
    ).toBe('integration');
    expect(
      components.find(entity => entity.metadata.name === 'unified-namespace')
        ?.metadata.annotations['dataprod.platform/certification-status'],
    ).toBe('DEVELOPMENT');
    expect(
      components.find(entity => entity.metadata.name === 'health')?.metadata
        .annotations['dataprod.platform/certification-status'],
    ).toBe('CERTIFIED');
    expect(
      components.find(entity => entity.metadata.name === 'mqtt-consumer')
        ?.metadata.annotations['dataprod.platform/certification-status'],
    ).toBe('CERTIFIED');
    expect(
      components.find(entity => entity.metadata.name === 'rag')?.metadata
        .annotations['dataprod.platform/certification-status'],
    ).toBe('PLANNED');
    expect(names).not.toContain('mqtt-temperature-data-product');
  });

  it('keeps Platform Components out of the Data Product type', () => {
    const entities = loadPlatformComponentCatalog();
    for (const entity of entities.filter(isPlatformComponentEntity)) {
      expect(entity.spec.type).toBe('platform-component');
      expect(entity.metadata.annotations['dataprod.platform/kind']).toBe(
        'platform-component',
      );
    }
  });

  it('derives example OEE Used By from native dependsOn', () => {
    const entities = loadPlatformComponentCatalog();
    const oee = entities.find(
      entity =>
        entity.kind === 'Component' &&
        entity.metadata.name === 'example-oee-data-product',
    );
    expect(oee.spec.dependsOn).toEqual(
      expect.arrayContaining([
        'component:default/unified-namespace',
        'component:default/mqtt-consumer',
        'component:default/rest-source',
        'component:default/timeseries',
        'component:default/rest-api',
        'component:default/health',
        'component:default/observability',
      ]),
    );
    const related = toRelatedPlatformComponents(entities);
    const mqtt = related.find(item => item.name === 'mqtt-consumer');
    expect(mqtt?.usedBy).toContain('Example OEE Data Product');
  });

  it('exposes Machine Metrics native dependsOn for Catalog Graph', () => {
    const entities = loadPlatformComponentCatalog();
    const metrics = entities.find(
      entity =>
        entity.kind === 'Component' &&
        entity.metadata.name === 'machine-metrics-reference',
    );
    expect(metrics?.spec.dependsOn).toEqual(
      expect.arrayContaining([
        'component:default/mqtt-consumer',
        'component:default/rest-api',
        'component:default/timeseries',
        'component:default/health',
        'component:default/observability',
      ]),
    );
    const related = toRelatedPlatformComponents(entities);
    expect(related.find(item => item.name === 'mqtt-consumer')?.usedBy).toContain(
      'Machine Metrics Reference',
    );
    expect(related.find(item => item.name === 'rest-api')?.usedBy).toContain(
      'Machine Metrics Reference',
    );
    expect(related.find(item => item.name === 'timeseries')?.usedBy).toContain(
      'Machine Metrics Reference',
    );
  });

  it('validates composition manifests without a custom Catalog kind', () => {
    const catalog = toRelatedPlatformComponents(loadPlatformComponentCatalog());
    const oee = readGoldenPathComposition('oee-data-product-uns');
    expect(oee.kind).toBe('GoldenPathComposition');
    expect(validateComposition(oee, catalog).compatible).toBe(true);

    const oeeDirect = readGoldenPathComposition('oee-data-product-direct');
    expect(oeeDirect.spec.components.map(item => item.ref)).not.toContain(
      'component:default/unified-namespace',
    );
    expect(oeeDirect.spec.components.map(item => item.ref)).not.toContain(
      'component:default/aas-foundation',
    );
    expect(validateComposition(oeeDirect, catalog).compatible).toBe(true);
    expect(oeeDirect.spec.components.map(item => item.version).every(v => v === '1.x')).toBe(
      true,
    );

    const rag = readGoldenPathComposition('rag-foundation');
    expect(validateComposition(rag, catalog).issues.map(issue => issue.code)).toContain(
      'UNSUPPORTED_COMPONENT',
    );

    const mqtt = readGoldenPathComposition('mqtt-temperature-conceptual');
    expect(validateComposition(mqtt, catalog).compatible).toBe(true);

    const metrics = readGoldenPathComposition('machine-metrics-reference');
    expect(validateComposition(metrics, catalog).compatible).toBe(true);

    const machineState = readGoldenPathComposition('machine-state-consumer');
    expect(validateComposition(machineState, catalog).compatible).toBe(true);
    expect(machineState.spec.components).toEqual([
      { ref: 'component:default/unified-namespace', version: '1.x' },
    ]);
  });

  it('does not move existing Golden Path templates', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'templates/mqtt-temperature-product/template.yaml')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(ROOT, 'templates/rest-equipment-product/template.yaml')),
    ).toBe(true);
    expect(read('templates/mqtt-temperature-product/template.yaml')).not.toContain(
      'platform-components/',
    );
  });

  it('exposes Developer Hub and Search discovery for the library', () => {
    expect(
      fs.readFileSync(
        path.join(ROOT, 'packages/app/src/modules/platform-components/index.tsx'),
        'utf8',
      ),
    ).toContain("path: '/platform-components'");
    expect(
      fs.readFileSync(
        path.join(ROOT, 'packages/app/src/modules/composer/index.tsx'),
        'utf8',
      ),
    ).toContain("path: '/compose'");
    expect(
      fs.readFileSync(
        path.join(ROOT, 'packages/app/src/modules/nav/Sidebar.tsx'),
        'utf8',
      ),
    ).toContain('to="/platform-components"');
    expect(read('mkdocs.yml')).toContain('platform-components/index.md');
    expect(read('docs/platform-components/composition.md')).toContain(
      'GoldenPathComposition',
    );
    expect(read('app-config.yaml')).toContain('platform-components/catalog.yaml');
  });

  it('locks library usage to disk compositions and real runtime packages', () => {
    const oeeDirect = readGoldenPathComposition('oee-data-product-direct');
    expect(oeeDirect.spec.components).not.toHaveLength(0);
    expect(usageLabelsForComponent('rest-source', 'runtime', USAGE)).toContain(
      'OEE Data Product',
    );
    expect(usageLabelsForComponent('rest-source', 'runtime', USAGE)).not.toContain(
      'REST Equipment',
    );
    expect(usageLabelsForComponent('mqtt-consumer', 'runtime', USAGE)).not.toContain(
      'MQTT Temperature',
    );
    expect(usageLabelsForComponent('mqtt-consumer', 'conceptual', USAGE)).toContain(
      'MQTT Temperature',
    );
    for (const [name, relative] of Object.entries(RUNTIME_PACKAGE_SOURCE_PATHS)) {
      expect(fs.existsSync(path.join(ROOT, relative, 'pyproject.toml'))).toBe(
        true,
      );
      expect(name).toBeTruthy();
    }
    expect(
      fs.existsSync(
        path.join(ROOT, 'platform-components/integration/kafka-consumer/pyproject.toml'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(ROOT, 'platform-components/data/postgres/pyproject.toml')),
    ).toBe(false);
    const catalog = toRelatedPlatformComponents(loadPlatformComponentCatalog());
    // GP-6 removed: the embedded EQUIPMENT_USE_LOG_COMPOSITION_YAML is gone;
    // the manifest on disk is the single source of truth.
    const equipmentUseLog = readGoldenPathComposition('equipment-use-log');
    expect(validateComposition(equipmentUseLog, catalog).compatible).toBe(true);
    expect(
      equipmentUseLog.spec.components
        .filter(item => !item.optional)
        .map(item => item.ref),
    ).toEqual([
      'component:default/health',
      'component:default/observability',
      'component:default/mqtt-consumer',
      'component:default/rest-api',
    ]);
    expect(usageLabelsForComponent('mqtt-consumer', 'design', USAGE)).toContain(
      'Equipment Use Log (design example)',
    );
    expect(usageLabelsForComponent('mqtt-consumer', 'runtime', USAGE)).not.toContain(
      'Equipment Use Log (design example)',
    );
    expect(usageLabelsForComponent('rest-source', 'design', USAGE)).not.toContain(
      'Equipment Use Log (design example)',
    );
    expect(read('docs/platform-components/using.md')).not.toContain(
      'Do not implement OEE from this page',
    );
    expect(read('docs/platform-components/creating.md')).toContain(
      'catalog-info.yaml',
    );
    expect(read('docs/platform-components/equipment-use-log-example.md')).toContain(
      'DESIGN EXAMPLE ONLY',
    );
  });
});
