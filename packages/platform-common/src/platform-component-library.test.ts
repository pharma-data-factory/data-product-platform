import {
  CATALOG_ONLY_COMPONENT_NAMES,
  RUNTIME_PACKAGE_COMPONENT_NAMES,
  compositionSnippetFor,
  filterLibraryComponents,
  hasRuntimePackage,
  libraryProfileFor,
  builtWithSummary,
  toLibraryComponents,
  usageLabelsForComponent,
} from './platform-component-library';
import { CatalogEntityLike, toRelatedPlatformComponents } from './platform-components';
import { validateComposition } from './composition';
import {
  compositionOnDisk,
  compositionRefsOnDisk,
  compositionUsageOnDisk,
  optionalCompositionRefsOnDisk,
} from './__testUtils__/compositions';

const USAGE = compositionUsageOnDisk();
const OEE_REFS = compositionRefsOnDisk('oee-data-product-direct');
const MACHINE_METRICS_REFS = compositionRefsOnDisk('machine-metrics-reference');
const MQTT_CONCEPTUAL_REFS = compositionRefsOnDisk('mqtt-temperature-conceptual');
const REST_EQUIPMENT_REFS = compositionRefsOnDisk('rest-equipment-conceptual');

function component(partial: {
  name: string;
  title?: string;
  description?: string;
  category?: string;
  version?: string;
  certification?: string;
  owner?: string;
}): CatalogEntityLike {
  return {
    kind: 'Component',
    metadata: {
      name: partial.name,
      title: partial.title || partial.name,
      description: partial.description || `${partial.name} platform component`,
      annotations: {
        'dataprod.platform/kind': 'platform-component',
        'dataprod.platform/version': partial.version || '1.0.0',
        'dataprod.platform/category': partial.category || 'integration',
        'dataprod.platform/certification-status':
          partial.certification || 'CERTIFIED',
        'dataprod.platform/compatible-standard-versions': '1.x',
      },
    },
    spec: {
      type: 'platform-component',
      lifecycle: 'experimental',
      owner: partial.owner || 'group:default/platform-team',
    },
  };
}

const catalog = toRelatedPlatformComponents([
  component({ name: 'health', title: 'Health', category: 'operations' }),
  component({
    name: 'observability',
    title: 'Observability',
    category: 'operations',
  }),
  component({ name: 'rest-api', title: 'REST API' }),
  component({
    name: 'rest-source',
    title: 'REST Source',
    description: 'Consume governed REST endpoints using the Nexora runtime standard.',
  }),
  component({ name: 'mqtt-consumer', title: 'MQTT Consumer' }),
  component({
    name: 'timeseries',
    title: 'Time-Series Storage',
    category: 'data',
  }),
  component({
    name: 'kafka-consumer',
    title: 'Kafka Consumer',
    certification: 'DEVELOPMENT',
    description: 'Reusable Kafka consumer',
  }),
  component({
    name: 'postgres',
    title: 'PostgreSQL',
    category: 'data',
    certification: 'DEVELOPMENT',
  }),
  component({
    name: 'document-loader',
    title: 'Document Loader',
    category: 'intelligence',
    version: '0.0.0',
    certification: 'PLANNED',
  }),
  {
    kind: 'Component',
    metadata: { name: 'sample-oee-data-product', title: 'Sample OEE Data Product' },
    spec: {
      type: 'data-product',
      dependsOn: [
        'component:default/health',
        'component:default/rest-source',
        'component:default/mqtt-consumer',
      ],
    },
  },
  {
    kind: 'Component',
    metadata: {
      name: 'sample-rest-equipment-product',
      title: 'REST Equipment Data Product',
    },
    spec: { type: 'data-product', dependsOn: [] },
  },
  {
    kind: 'Component',
    metadata: {
      name: 'sample-mqtt-temperature-product',
      title: 'MQTT Temperature Data Product',
    },
    spec: { type: 'data-product', dependsOn: [] },
  },
]);

const library = toLibraryComponents(catalog, USAGE);

describe('platform component library honesty', () => {
  it('treats Wave 1 packages as runtime and Kafka/Postgres as catalog-only', () => {
    for (const name of RUNTIME_PACKAGE_COMPONENT_NAMES) {
      if (name === 'aas-foundation' || name === 'unified-namespace') {
        continue;
      }
      expect(hasRuntimePackage(name)).toBe(true);
    }
    for (const name of ['kafka-consumer', 'postgres', 'audit', 'rag']) {
      expect(hasRuntimePackage(name)).toBe(false);
      expect(CATALOG_ONLY_COMPONENT_NAMES).toContain(name);
    }
    expect(library.find(item => item.name === 'kafka-consumer')?.runtimeAvailability).toBe(
      'catalog-only',
    );
    expect(library.find(item => item.name === 'rest-source')?.runtimeAvailability).toBe(
      'runtime',
    );
  });

  it('derives OEE runtime Used By from the Mode A composition, not conceptual Golden Paths', () => {
    const restSource = library.find(item => item.name === 'rest-source');
    const mqtt = library.find(item => item.name === 'mqtt-consumer');
    expect(restSource?.runtimeUsedBy).toEqual(
      expect.arrayContaining(['OEE Data Product']),
    );
    expect(restSource?.runtimeUsedBy).not.toContain('REST Equipment');
    expect(restSource?.conceptualUsedBy).toEqual(
      expect.arrayContaining(['REST Equipment']),
    );
    expect(mqtt?.runtimeUsedBy).toEqual(expect.arrayContaining(['OEE Data Product']));
    expect(mqtt?.runtimeUsedBy).not.toContain('MQTT Temperature');
    expect(mqtt?.conceptualUsedBy).toEqual(
      expect.arrayContaining(['MQTT Temperature']),
    );
    expect(mqtt?.designUsedBy).toEqual([
      'Equipment Use Log (design example)',
    ]);
    expect(mqtt?.runtimeUsedBy).not.toContain(
      'Equipment Use Log (design example)',
    );
    expect(restSource?.designUsedBy).toEqual([]);
    expect(usageLabelsForComponent('rest-source', 'runtime', USAGE)).not.toContain(
      'REST Equipment',
    );
    expect(MQTT_CONCEPTUAL_REFS).toContain(
      'component:default/mqtt-consumer',
    );
    expect(REST_EQUIPMENT_REFS).toContain(
      'component:default/rest-source',
    );
  });

  it('builds OEE Built With from the six Mode A refs as CERTIFIED', () => {
    expect(OEE_REFS).toHaveLength(6);
    const summary = builtWithSummary(catalog, OEE_REFS, 'OEE Golden Path');
    expect(summary.reusableCount).toBe(6);
    expect(summary.certifiedCount).toBe(6);
    expect(summary.items.map(item => item.name).sort()).toEqual(
      [...OEE_REFS]
        .map(ref => ref.split('/').pop())
        .sort(),
    );
    expect(summary.items.map(item => item.title).sort()).toEqual([
      'Health',
      'MQTT Consumer',
      'Observability',
      'REST API',
      'REST Source',
      'Time-Series Storage',
    ]);
    expect(MACHINE_METRICS_REFS).not.toContain(
      'component:default/rest-source',
    );
  });

  it('filters by search, category, status, runtime, and compatibility', () => {
    expect(
      filterLibraryComponents(library, { query: 'kafka' }).map(item => item.name),
    ).toEqual(['kafka-consumer']);
    expect(
      filterLibraryComponents(library, { category: 'intelligence' }).map(
        item => item.name,
      ),
    ).toEqual(['document-loader']);
    expect(
      filterLibraryComponents(library, { certification: 'PLANNED' }).map(
        item => item.name,
      ),
    ).toEqual(['document-loader']);
    expect(
      filterLibraryComponents(library, { runtime: 'catalog-only' }).map(
        item => item.name,
      ),
    ).toEqual(expect.arrayContaining(['kafka-consumer', 'postgres', 'document-loader']));
    expect(
      filterLibraryComponents(library, { runtime: 'catalog-only' }).every(
        item => item.runtimeAvailability === 'catalog-only',
      ),
    ).toBe(true);
    expect(
      filterLibraryComponents(library, { query: 'platform-team', compatibility: '1.x' })
        .length,
    ).toBeGreaterThan(0);
  });

  it('exposes real REST Source configuration keys and OEE import', () => {
    const profile = libraryProfileFor({
      name: 'rest-source',
      title: 'REST Source',
      description: '',
    });
    expect(profile.configurationKeys).toEqual([
      'SOURCE_API_URL',
      'SOURCE_API_TOKEN',
      'SOURCE_API_TIMEOUT',
      'SOURCE_API_RETRIES',
      'SOURCE_API_AUTH_HEADER',
      'SOURCE_API_AUTH_SCHEME',
    ]);
    expect(profile.importExample).toContain(
      'from pdf_rest_source import RestSource, RestSourceSettings',
    );
    expect(compositionSnippetFor('rest-source')).toContain(
      'component:default/rest-source',
    );
  });

  it('validates the Equipment Use Log design example against the real schema', () => {
    // The composition now lives in catalog/artifacts/nexora/equipment-use-log.yaml.
    // EQUIPMENT_USE_LOG_COMPOSITION_YAML and parseEquipmentUseLogExample were
    // deleted (GP-6) — the manifest is the single source of truth.
    const composition = compositionOnDisk('equipment-use-log');
    expect(composition.metadata.name).toBe('equipment-use-log');
    expect(validateComposition(composition, catalog).compatible).toBe(true);
    const required = compositionRefsOnDisk('equipment-use-log');
    const optional = optionalCompositionRefsOnDisk('equipment-use-log');
    expect(required).toEqual([
      'component:default/health',
      'component:default/observability',
      'component:default/mqtt-consumer',
      'component:default/rest-api',
    ]);
    // REST Source and Time-Series are offered as optional, not required.
    expect(required).not.toContain('component:default/rest-source');
    expect(required).not.toContain('component:default/timeseries');
    expect(optional).toContain('component:default/rest-source');
    expect(optional).toContain('component:default/timeseries');
  });
});
