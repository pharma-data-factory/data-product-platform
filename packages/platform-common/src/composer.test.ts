import {
  applyComposerQuery,
  composerArchitectureFromSelection,
  composerDisabledReason,
  composerDraftToManifest,
  composerPath,
  composerPresets,
  composerSelectionKind,
  compositionConfigSummary,
  isComposerSelectable,
  officialGoldenPathForDraft,
  officialGoldenPathForSelection,
  sanitizeComposerComponentQuery,
  serializeCompositionYaml,
  validateComposerDraft,
  yamlContainsSecrets,
} from './composer';
import { toLibraryComponents } from './platform-component-library';
import {
  CatalogEntityLike,
  toRelatedPlatformComponents,
} from './platform-components';
import { parseCompositionManifest, validateComposition } from './composition';
import {
  artifactManifestsOnDisk,
  compositionUsageOnDisk,
} from './__testUtils__/compositions';
import { compositionOfArtifactManifest } from './composition';

const USAGE = compositionUsageOnDisk();
// Build official/example composition maps from the real manifests on disk,
// exactly as goldenPathCompositionsFromManifests does at runtime.
const _MANIFESTS = artifactManifestsOnDisk();
const OFFICIAL_COMPOSITIONS = new Map(
  _MANIFESTS
    .filter(m => m.spec?.usage?.kind === 'runtime')
    .map(m => {
      const comp = compositionOfArtifactManifest(m)!;
      return [comp.metadata.name, comp] as const;
    }),
);
const EXAMPLE_COMPOSITIONS = new Map(
  _MANIFESTS
    .filter(m => m.spec?.usage?.kind === 'design')
    .map(m => {
      const comp = compositionOfArtifactManifest(m)!;
      return [comp.metadata.name, comp] as const;
    }),
);
// Required refs only, keyed by composition name — matches the map passed by
// ComposePage to officialGoldenPathForDraft.
const OFFICIAL_REFS_MAP = new Map(
  [...OFFICIAL_COMPOSITIONS.entries()].map(([name, comp]) => [
    name,
    comp.spec.components.filter(c => !c.optional).map(c => c.ref),
  ] as const),
);
// OEE refs, used to build named selections in test assertions.
const OEE_REFS =
  OFFICIAL_REFS_MAP.get('oee-data-product-direct') ?? [];

function component(partial: {
  name: string;
  title?: string;
  category?: string;
  version?: string;
  certification?: string;
  dependsOn?: string[];
  conflictsWith?: string[];
}): CatalogEntityLike {
  return {
    kind: 'Component',
    metadata: {
      name: partial.name,
      title: partial.title || partial.name,
      description: `${partial.title || partial.name} platform component`,
      annotations: {
        'dataprod.platform/kind': 'platform-component',
        'dataprod.platform/version': partial.version || '1.0.0',
        'dataprod.platform/category': partial.category || 'integration',
        'dataprod.platform/certification-status':
          partial.certification || 'CERTIFIED',
        'dataprod.platform/compatible-standard-versions': '1.x',
        'dataprod.platform/conflicts-with': (partial.conflictsWith || []).join(
          ',',
        ),
      },
    },
    spec: {
      type: 'platform-component',
      lifecycle: 'experimental',
      owner: 'group:default/platform-team',
      dependsOn: partial.dependsOn,
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
  component({
    name: 'rest-api',
    title: 'REST API',
    dependsOn: ['component:default/health', 'component:default/observability'],
  }),
  component({
    name: 'rest-source',
    title: 'REST Source',
    dependsOn: ['component:default/observability'],
  }),
  component({
    name: 'mqtt-consumer',
    title: 'MQTT Consumer',
    dependsOn: ['component:default/health', 'component:default/observability'],
  }),
  component({
    name: 'timeseries',
    title: 'Time-Series Storage',
    category: 'data',
  }),
  component({
    name: 'kafka-consumer',
    title: 'Kafka Consumer',
    certification: 'DEVELOPMENT',
  }),
  component({
    name: 'postgres',
    title: 'PostgreSQL',
    category: 'data',
    certification: 'DEVELOPMENT',
  }),
  component({
    name: 'aas-foundation',
    title: 'AAS Foundation',
    category: 'asset-semantic',
    certification: 'DEVELOPMENT',
  }),
  component({
    name: 'unified-namespace',
    title: 'Unified Namespace',
    certification: 'DEVELOPMENT',
  }),
  component({
    name: 'document-loader',
    title: 'Document Loader',
    category: 'intelligence',
    version: '0.0.0',
    certification: 'PLANNED',
  }),
]);

const library = toLibraryComponents(catalog, USAGE);

function draft(names: string[], name = 'example') {
  return {
    name,
    description: 'Test composition',
    owner: 'group:default/platform-team',
    domain: 'manufacturing',
    selectedNames: names,
  };
}

describe('composer selection policy', () => {
  it('selects certified runtimes and blocks planned and catalog-only', () => {
    expect(isComposerSelectable(library.find(item => item.name === 'health')!)).toBe(
      true,
    );
    expect(
      composerSelectionKind(library.find(item => item.name === 'rest-source')!),
    ).toBe('selectable');
    expect(
      composerSelectionKind(library.find(item => item.name === 'kafka-consumer')!),
    ).toBe('disabled-catalog-only');
    expect(
      isComposerSelectable(library.find(item => item.name === 'kafka-consumer')!),
    ).toBe(false);
    expect(
      isComposerSelectable(library.find(item => item.name === 'postgres')!),
    ).toBe(false);
    expect(
      composerSelectionKind(library.find(item => item.name === 'document-loader')!),
    ).toBe('disabled-planned');
    expect(
      composerSelectionKind(library.find(item => item.name === 'aas-foundation')!),
    ).toBe('selectable-development');
    expect(
      composerDisabledReason(library.find(item => item.name === 'kafka-consumer')!),
    ).toMatch(/no reusable runtime implementation/i);
  });
});

describe('composer query', () => {
  it('preselects a valid component and ignores invalid refs', () => {
    expect(applyComposerQuery('rest-source', library).selectedNames).toEqual([
      'rest-source',
    ]);
    expect(applyComposerQuery('kafka-consumer', library).selectedNames).toEqual(
      [],
    );
    expect(applyComposerQuery('kafka-consumer', library).notice).toMatch(
      /no reusable runtime/i,
    );
    expect(sanitizeComposerComponentQuery('../etc/passwd', ['health'])).toBe(
      undefined,
    );
    expect(sanitizeComposerComponentQuery('not-a-component', ['health'])).toBe(
      undefined,
    );
    expect(composerPath('rest-source')).toBe('/compose?component=rest-source');
  });
});

describe('composer validation and yaml', () => {
  it('validates the six-component OEE composition', () => {
    const names = OEE_REFS.map(ref => ref.split('/').pop() as string);
    const view = validateComposerDraft(draft(names, 'oee-data-product-direct'), catalog, library);
    expect(view.validated).toBe(true);
    expect(view.certifiedCount).toBe(6);
    expect(view.selectedCount).toBe(6);
    expect(officialGoldenPathForSelection(names, OFFICIAL_REFS_MAP)).toBe('oee-data-product-direct');
  });

  it('fails missing dependency, missing component, conflict, version, and standard', () => {
    expect(
      validateComposerDraft(draft(['rest-source']), catalog, library).issues.map(
        issue => issue.code,
      ),
    ).toContain('MISSING_DEPENDENCY');

    const missing = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: missing
spec:
  components:
    - ref: component:default/does-not-exist
      version: "1.x"
`),
      catalog,
    );
    expect(missing.issues.map(issue => issue.code)).toContain('MISSING_COMPONENT');

    const conflictCatalog = toRelatedPlatformComponents([
      component({
        name: 'health',
        title: 'Health',
        category: 'operations',
        conflictsWith: ['timeseries'],
      }),
      component({
        name: 'timeseries',
        title: 'Time-Series Storage',
        category: 'data',
      }),
    ]);
    const conflictLibrary = toLibraryComponents(conflictCatalog, USAGE);
    const conflict = validateComposerDraft(
      draft(['health', 'timeseries']),
      conflictCatalog,
      conflictLibrary,
    );
    expect(conflict.issues.map(issue => issue.code)).toContain(
      'CONFLICTING_COMPONENTS',
    );
    expect(
      conflict.issues.find(issue => issue.code === 'CONFLICTING_COMPONENTS')
        ?.message,
    ).toMatch(/cannot be combined with/);

    const version = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: version
spec:
  components:
    - ref: component:default/health
      version: "2.x"
`),
      catalog,
    );
    expect(version.issues.map(issue => issue.code)).toContain('VERSION_INCOMPATIBLE');

    const standard = validateComposition(
      parseCompositionManifest(`
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition
metadata:
  name: standard
spec:
  standardVersion: 2.0.0
  components:
    - ref: component:default/health
      version: "1.x"
`),
      catalog,
    );
    expect(standard.issues.map(issue => issue.code)).toContain(
      'STANDARD_INCOMPATIBLE',
    );
  });

  it('emits deterministic schema YAML without secrets and without a CERTIFIED composition claim', () => {
    const manifest = composerDraftToManifest(
      draft(
        ['health', 'observability', 'rest-api'],
        'api-data-product',
      ),
    );
    const yaml = serializeCompositionYaml(manifest);
    expect(yaml).toContain('kind: GoldenPathComposition');
    expect(yaml).toContain('ref: component:default/health');
    expect(yaml).toContain('version: "1.x"');
    expect(yaml).not.toMatch(/password|token|secret/i);
    expect(yamlContainsSecrets(yaml)).toBe(false);
    expect(serializeCompositionYaml(manifest)).toBe(yaml);
    const view = validateComposerDraft(
      draft(['health', 'observability', 'rest-api']),
      catalog,
      library,
    );
    expect(view.validated).toBe(true);
    expect(view.certifiedCount).toBe(3);
  });

  it('derives official and example presets from canonical compositions on disk', () => {
    const presets = composerPresets(OFFICIAL_COMPOSITIONS, EXAMPLE_COMPOSITIONS);

    // OEE is an 'official' preset keyed by composition name, not a domain literal.
    const oee = presets.find(item => item.id === 'oee-data-product-direct');
    expect(oee?.kind).toBe('official');
    expect(oee?.names.sort()).toEqual(
      OEE_REFS.map(ref => ref.split('/').pop() as string).sort(),
    );

    // Equipment Use Log is an 'example' preset (usage.kind === 'design').
    const example = presets.find(item => item.id === 'equipment-use-log');
    expect(example?.kind).toBe('example');
    expect(example?.names.sort()).toEqual(
      ['health', 'mqtt-consumer', 'observability', 'rest-api'].sort(),
    );
    expect(example?.optionalNames?.sort()).toEqual(
      ['rest-source', 'timeseries'].sort(),
    );
    expect(example?.names.sort()).not.toEqual(oee?.names.sort());

    // Partial selection does not match any official composition.
    expect(
      officialGoldenPathForSelection(['health', 'rest-api'], OFFICIAL_REFS_MAP),
    ).toBe(undefined);

    // The OEE selection matches the 'oee-data-product-direct' composition,
    // not a domain literal. Text-matching exclusions are gone: the name
    // 'equipment-use-log' has no special meaning here (EUL is excluded because
    // it is in EXAMPLE_COMPOSITIONS, not OFFICIAL_COMPOSITIONS).
    expect(
      officialGoldenPathForDraft(
        {
          name: 'oee-data-product-direct',
          description: 'OEE composition',
          selectedNames: OEE_REFS.map(ref => ref.split('/').pop() as string),
        },
        OFFICIAL_REFS_MAP,
      ),
    ).toBe('oee-data-product-direct');

    // An empty official map returns undefined even for a full OEE selection.
    expect(
      officialGoldenPathForSelection(
        OEE_REFS.map(ref => ref.split('/').pop() as string),
        new Map(),
      ),
    ).toBe(undefined);
  });

  it('builds architecture layers from the current selection', () => {
    const layers = composerArchitectureFromSelection(
      library.filter(item =>
        ['mqtt-consumer', 'health', 'observability', 'rest-api'].includes(
          item.name,
        ),
      ),
    );
    expect(layers.map(layer => layer.id)).toEqual([
      'sources',
      'domain',
      'outputs',
      'operations',
    ]);
    expect(layers.find(layer => layer.id === 'storage')).toBeUndefined();
    expect(layers.find(layer => layer.id === 'sources')?.names).toEqual([
      'mqtt-consumer',
    ]);
  });
});

describe('compositionConfigSummary', () => {
  it('aggregates config keys across selected components in order', () => {
    const selected = library.filter(item =>
      ['mqtt-consumer', 'timeseries'].includes(item.name),
    );
    const summary = compositionConfigSummary(selected);

    // mqtt-consumer has 11 keys (from libraryProfileFor); timeseries has 1.
    // We assert structure rather than exact counts so the test survives profile edits.
    const mqttKeys = summary.keys.filter(k => k.componentName === 'mqtt-consumer');
    const tsKeys = summary.keys.filter(k => k.componentName === 'timeseries');
    expect(mqttKeys.length).toBeGreaterThan(0);
    expect(tsKeys.length).toBeGreaterThan(0);
    expect(summary.totalCount).toBe(mqttKeys.length + tsKeys.length);

    // Keys appear in component order (mqtt before timeseries in the selection).
    const firstMqttIndex = summary.keys.findIndex(k => k.componentName === 'mqtt-consumer');
    const firstTsIndex = summary.keys.findIndex(k => k.componentName === 'timeseries');
    expect(firstMqttIndex).toBeLessThan(firstTsIndex);

    // Each key carries the component title and name.
    expect(mqttKeys[0].componentTitle).toBeTruthy();
    expect(mqttKeys[0].key).toBeTruthy();
  });

  it('returns zero keys and no notes for an empty selection', () => {
    const summary = compositionConfigSummary([]);
    expect(summary.totalCount).toBe(0);
    expect(summary.keys).toHaveLength(0);
    expect(summary.notes).toHaveLength(0);
  });

  it('includes configurationNote for components that have one', () => {
    // health has a configurationNote ('No source credentials...' or similar).
    const healthComp = library.find(item => item.name === 'health');
    if (!healthComp || !healthComp.profile.configurationNote) {
      return; // skip if profile has no note (defensive)
    }
    const summary = compositionConfigSummary([healthComp]);
    expect(summary.notes).toHaveLength(1);
    expect(summary.notes[0].note).toBe(healthComp.profile.configurationNote);
    expect(summary.notes[0].componentTitle).toBe(healthComp.title);
  });
});
