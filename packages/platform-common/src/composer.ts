import {
  CompositionIssueCode,
  GOLDEN_PATH_COMPOSITION_API_VERSION,
  GOLDEN_PATH_COMPOSITION_KIND,
  GoldenPathComposition,
  validateComposition,
} from './composition';
import {
  LibraryPlatformComponent,
  componentNameFromRef,
} from './platform-component-library';
import {
  PlatformComponent,
  PlatformComponentCategory,
  findPlatformComponent,
  normalizeEntityRef,
} from './platform-components';

export const COMPOSER_PATH = '/compose';
export const COMPOSER_STANDARD_RANGE = '1.x';
export const COMPOSER_STANDARD_VERSION = '1.0.0';
export const COMPOSER_COMPONENT_VERSION = '1.x';

export type ComposerSelectionKind =
  | 'selectable'
  | 'selectable-warning'
  | 'selectable-development'
  | 'disabled-planned'
  | 'disabled-catalog-only'
  | 'disabled';

export interface ComposerUxIssue {
  code: CompositionIssueCode | 'NO_RUNTIME' | 'NOT_SELECTABLE' | 'QUERY_IGNORED';
  message: string;
}

export interface ComposerChecklist {
  componentsExist: boolean;
  runtimeAvailable: boolean;
  versionsCompatible: boolean;
  standardCompatible: boolean;
  dependenciesSatisfied: boolean;
  noConflicts: boolean;
}

export interface ComposerValidationView {
  compatible: boolean;
  validated: boolean;
  checklist: ComposerChecklist;
  issues: ComposerUxIssue[];
  certifiedCount: number;
  selectedCount: number;
}

export interface ComposerPreset {
  id: string;
  title: string;
  description: string;
  names: string[];
  optionalNames?: string[];
  /**
   * `'baseline'` — generic platform pattern (static, not from a manifest).
   * `'official'` — a GOLDEN_PATH composition with usage.kind === 'runtime'.
   * `'example'`  — a GOLDEN_PATH composition with usage.kind === 'design'.
   */
  kind: 'baseline' | 'official' | 'example';
}

export interface ComposerDraft {
  name: string;
  description: string;
  owner: string;
  domain: string;
  selectedNames: string[];
}

export function composerPath(component?: string): string {
  if (!component) {
    return COMPOSER_PATH;
  }
  return `${COMPOSER_PATH}?component=${encodeURIComponent(component)}`;
}

export function composerSelectionKind(
  component: Pick<
    LibraryPlatformComponent,
    'certificationStatus' | 'runtimeAvailability'
  >,
): ComposerSelectionKind {
  if (component.certificationStatus === 'PLANNED') {
    return 'disabled-planned';
  }
  if (component.runtimeAvailability === 'catalog-only') {
    return 'disabled-catalog-only';
  }
  if (component.certificationStatus === 'DEVELOPMENT') {
    return 'selectable-development';
  }
  if (component.certificationStatus === 'TESTED') {
    return 'selectable-warning';
  }
  if (component.certificationStatus === 'CERTIFIED') {
    return 'selectable';
  }
  return 'disabled';
}

export function isComposerSelectable(
  component: Pick<
    LibraryPlatformComponent,
    'certificationStatus' | 'runtimeAvailability'
  >,
): boolean {
  const kind = composerSelectionKind(component);
  return (
    kind === 'selectable' ||
    kind === 'selectable-warning' ||
    kind === 'selectable-development'
  );
}

export function composerDisabledReason(
  component: LibraryPlatformComponent,
): string | undefined {
  const kind = composerSelectionKind(component);
  if (kind === 'disabled-catalog-only') {
    return `${component.title} cannot be selected. Catalog entity exists, but no reusable runtime implementation is available.`;
  }
  if (kind === 'disabled-planned') {
    return `${component.title} is PLANNED and is not ready to consume.`;
  }
  if (kind === 'disabled') {
    return `${component.title} cannot be used in a new composition.`;
  }
  return undefined;
}

export function sanitizeComposerComponentQuery(
  raw: string | null | undefined,
  catalogNames: Iterable<string>,
): string | undefined {
  const name = raw?.trim().toLowerCase() || '';
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(name)) {
    return undefined;
  }
  const allowed = new Set(
    [...catalogNames].map(value => value.trim().toLowerCase()),
  );
  return allowed.has(name) ? name : undefined;
}

export function applyComposerQuery(
  raw: string | null | undefined,
  catalog: LibraryPlatformComponent[],
): { selectedNames: string[]; notice?: string } {
  const name = sanitizeComposerComponentQuery(
    raw,
    catalog.map(item => item.name),
  );
  if (!name) {
    if (raw?.trim()) {
      return {
        selectedNames: [],
        notice: 'Unknown or invalid component query was ignored.',
      };
    }
    return { selectedNames: [] };
  }
  const match = catalog.find(item => item.name === name);
  if (!match || !isComposerSelectable(match)) {
    return {
      selectedNames: [],
      notice:
        composerDisabledReason(
          match ||
            ({
              name,
              title: name,
              certificationStatus: 'PLANNED',
              runtimeAvailability: 'catalog-only',
            } as LibraryPlatformComponent),
        ) || 'Component query was ignored.',
    };
  }
  return { selectedNames: [name] };
}

export function slugifyCompositionName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'composition';
}

/**
 * Canonical display order for a set of component refs.
 *
 * `preferredOrder` is the official Golden Path's own component order, which
 * reads as a layering rather than an alphabet. It used to be a constant in
 * Core; it comes from the composition in the registry now. Anything not in it
 * sorts alphabetically after. An empty order means alphabetical throughout,
 * which is correct wherever the result is not displayed.
 */
export function sortCompositionRefs(
  refs: readonly string[],
  preferredOrder: readonly string[] = [],
): string[] {
  const preferred = [...preferredOrder];
  return [...refs].sort((left, right) => {
    const leftIndex = preferred.indexOf(left);
    const rightIndex = preferred.indexOf(right);
    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }
    if (leftIndex >= 0) {
      return -1;
    }
    if (rightIndex >= 0) {
      return 1;
    }
    return left.localeCompare(right);
  });
}

export function composerDraftToManifest(
  draft: ComposerDraft,
  preferredOrder: readonly string[] = [],
): GoldenPathComposition {
  const extras = [
    draft.description.trim(),
    draft.owner.trim() ? `Owner: ${draft.owner.trim()}` : '',
    draft.domain.trim() ? `Domain: ${draft.domain.trim()}` : '',
  ].filter(Boolean);
  const refs = sortCompositionRefs(
    draft.selectedNames.map(name => `component:default/${name}`),
    preferredOrder,
  );
  return {
    apiVersion: GOLDEN_PATH_COMPOSITION_API_VERSION,
    kind: GOLDEN_PATH_COMPOSITION_KIND,
    metadata: {
      name: slugifyCompositionName(draft.name),
      title: draft.name.trim() || slugifyCompositionName(draft.name),
      description: extras.join('\n') || undefined,
    },
    spec: {
      standardVersion: COMPOSER_STANDARD_VERSION,
      components: refs.map(ref => ({
        ref,
        version: COMPOSER_COMPONENT_VERSION,
      })),
    },
  };
}

function yamlScalar(value: string): string {
  if (/^[A-Za-z0-9._/-]+$/.test(value) && !value.includes(':')) {
    return value;
  }
  return JSON.stringify(value);
}

function yamlBlock(value: string, indent: string): string {
  if (!value.includes('\n') && value.length < 80) {
    return yamlScalar(value);
  }
  return `>\n${value
    .split('\n')
    .map(line => `${indent}${line}`)
    .join('\n')}`;
}

export function serializeCompositionYaml(
  composition: GoldenPathComposition,
  preferredOrder: readonly string[] = [],
): string {
  const description = composition.metadata.description
    ? `  description: ${yamlBlock(composition.metadata.description, '    ')}\n`
    : '';
  const title = composition.metadata.title
    ? `  title: ${yamlScalar(composition.metadata.title)}\n`
    : '';
  const components = sortCompositionRefs(
    composition.spec.components.map(item => item.ref),
    preferredOrder,
  )
    .map(ref => {
      const version =
        composition.spec.components.find(item => item.ref === ref)?.version ||
        COMPOSER_COMPONENT_VERSION;
      return `    - ref: ${ref}\n      version: ${JSON.stringify(version)}`;
    })
    .join('\n');
  return `apiVersion: ${composition.apiVersion}
kind: ${composition.kind}

metadata:
  name: ${yamlScalar(composition.metadata.name)}
${title}${description}spec:
  standardVersion: ${JSON.stringify(
    composition.spec.standardVersion || COMPOSER_STANDARD_VERSION,
  )}
  components:
${components || '    []'}
`;
}

export function yamlContainsSecrets(yaml: string): boolean {
  return /(password|token|secret|api[_-]?key)/i.test(yaml);
}

/**
 * Which official GOLDEN_PATH composition the draft's component selection
 * matches, if any.
 *
 * `officialCompositions` is a map of composition name → required refs (refs
 * with `optional: true` excluded), derived from the GOLDEN_PATH manifests in
 * the registry whose `spec.usage.kind === 'runtime'`. Design examples and
 * conceptual compositions are excluded by the caller, not here.
 *
 * Returns the composition name (e.g. `'oee-data-product-direct'`) rather than
 * a domain-specific literal, so that a second Golden Path can be recognised
 * without touching Core. GP-2 closed.
 */
export function officialGoldenPathForDraft(
  draft: Pick<ComposerDraft, 'name' | 'description' | 'selectedNames'>,
  officialCompositions: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  return officialGoldenPathForSelection(draft.selectedNames, officialCompositions);
}

/**
 * Which official GOLDEN_PATH composition the given component selection matches.
 *
 * Iterates over `officialCompositions` (name → required refs of runtime
 * compositions) and returns the name of the first one whose required component
 * set is equal to `selectedNames` as a set. Returns `undefined` when no
 * composition matches or the map is empty.
 */
export function officialGoldenPathForSelection(
  selectedNames: readonly string[],
  officialCompositions: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  const selected = new Set(selectedNames);
  for (const [name, refs] of officialCompositions) {
    const required = new Set(refs.map(componentNameFromRef));
    if (
      required.size === selected.size &&
      [...required].every(n => selected.has(n))
    ) {
      return name;
    }
  }
  return undefined;
}

/**
 * Compose the Composer's preset list from registered Golden Path compositions.
 *
 * Three static baseline presets (generic platform patterns, not domain
 * specific) are always present. Beyond those, every `officialCompositions`
 * entry becomes a preset with kind `'official'`, and every `exampleCompositions`
 * entry becomes a preset with kind `'example'`. Both maps come from the
 * GOLDEN_PATH manifests in the registry — GP-3 closed.
 *
 * The caller derives the maps from the registry's own manifests:
 * `officialCompositions` holds those with `spec.usage.kind === 'runtime'`,
 * `exampleCompositions` holds those with `spec.usage.kind === 'design'`.
 */
export function composerPresets(
  officialCompositions: ReadonlyMap<string, GoldenPathComposition>,
  exampleCompositions: ReadonlyMap<string, GoldenPathComposition>,
): ComposerPreset[] {
  const baselinePresets: ComposerPreset[] = [
    {
      id: 'api-data-product',
      title: 'API Data Product',
      description: 'Health, Observability, and REST API.',
      names: ['health', 'observability', 'rest-api'],
      kind: 'baseline',
    },
    {
      id: 'rest-ingestion',
      title: 'REST Ingestion Product',
      description: 'Health, Observability, REST Source, and REST API.',
      names: ['health', 'observability', 'rest-source', 'rest-api'],
      kind: 'baseline',
    },
    {
      id: 'event-data-product',
      title: 'Event Data Product',
      description:
        'Health, Observability, MQTT Consumer, Time-Series Storage, and REST API.',
      names: [
        'health',
        'observability',
        'mqtt-consumer',
        'timeseries',
        'rest-api',
      ],
      kind: 'baseline',
    },
  ];

  const fromComposition = (
    comp: GoldenPathComposition,
    kind: 'official' | 'example',
  ): ComposerPreset => ({
    id: comp.metadata.name,
    title: comp.metadata.title || comp.metadata.name,
    description: comp.metadata.description || '',
    names: comp.spec.components
      .filter(c => !c.optional)
      .map(c => componentNameFromRef(c.ref)),
    optionalNames: comp.spec.components
      .filter(c => c.optional)
      .map(c => componentNameFromRef(c.ref)),
    kind,
  });

  return [
    ...baselinePresets,
    ...[...officialCompositions.values()].map(comp =>
      fromComposition(comp, 'official'),
    ),
    ...[...exampleCompositions.values()].map(comp =>
      fromComposition(comp, 'example'),
    ),
  ];
}

export function groupedLibraryComponents(
  components: LibraryPlatformComponent[],
): Array<{ category: PlatformComponentCategory; items: LibraryPlatformComponent[] }> {
  const order: PlatformComponentCategory[] = [
    'integration',
    'data',
    'operations',
    'asset-semantic',
    'intelligence',
  ];
  return order
    .map(category => ({
      category,
      items: components
        .filter(item => item.category === category)
        .sort((left, right) => left.title.localeCompare(right.title)),
    }))
    .filter(group => group.items.length > 0);
}

export interface ComposerArchitectureLayer {
  id: 'sources' | 'domain' | 'storage' | 'outputs' | 'operations';
  label: string;
  names: string[];
  titles: string[];
}

export function composerArchitectureFromSelection(
  selected: LibraryPlatformComponent[],
): ComposerArchitectureLayer[] {
  const sources = selected.filter(
    item => item.category === 'integration' && item.name !== 'rest-api',
  );
  const storage = selected.filter(item => item.category === 'data');
  const outputs = selected.filter(item => item.name === 'rest-api');
  const operations = selected.filter(item => item.category === 'operations');
  const layers: ComposerArchitectureLayer[] = [];
  if (sources.length > 0) {
    layers.push({
      id: 'sources',
      label: 'Integration',
      names: sources.map(item => item.name),
      titles: sources.map(item => item.title),
    });
  }
  layers.push({
    id: 'domain',
    label: 'Domain logic',
    names: [],
    titles: ['Domain logic'],
  });
  if (storage.length > 0) {
    layers.push({
      id: 'storage',
      label: 'Storage',
      names: storage.map(item => item.name),
      titles: storage.map(item => item.title),
    });
  }
  if (outputs.length > 0) {
    layers.push({
      id: 'outputs',
      label: 'API',
      names: outputs.map(item => item.name),
      titles: outputs.map(item => item.title),
    });
  }
  if (operations.length > 0) {
    layers.push({
      id: 'operations',
      label: 'Cross-cutting',
      names: operations.map(item => item.name),
      titles: operations.map(item => item.title),
    });
  }
  return layers;
}

export function validateComposerDraft(
  draft: ComposerDraft,
  catalog: PlatformComponent[],
  library: LibraryPlatformComponent[],
): ComposerValidationView {
  const selected = draft.selectedNames
    .map(name => library.find(item => item.name === name))
    .filter((item): item is LibraryPlatformComponent => Boolean(item));
  const uxIssues: ComposerUxIssue[] = [];
  for (const component of selected) {
    const disabled = composerDisabledReason(component);
    if (disabled) {
      uxIssues.push({
        code:
          composerSelectionKind(component) === 'disabled-catalog-only'
            ? 'NO_RUNTIME'
            : 'NOT_SELECTABLE',
        message: disabled,
      });
    }
  }
  const manifest = composerDraftToManifest(draft);
  const result =
    draft.selectedNames.length === 0
      ? { compatible: false, issues: [] }
      : validateComposition(manifest, catalog);
  uxIssues.push(
    ...result.issues.map(issue => ({
      code: issue.code,
      message: humanizeCompositionIssue(issue.message, catalog),
    })),
  );
  const unique = uniqueIssues(uxIssues);
  const runtimeAvailable =
    selected.length > 0 &&
    selected.every(item => item.runtimeAvailability === 'runtime') &&
    unique.every(issue => issue.code !== 'NO_RUNTIME');
  const checklist: ComposerChecklist = {
    componentsExist:
      draft.selectedNames.length > 0 &&
      unique.every(issue => issue.code !== 'MISSING_COMPONENT'),
    runtimeAvailable,
    versionsCompatible: unique.every(
      issue =>
        issue.code !== 'VERSION_INCOMPATIBLE' &&
        issue.code !== 'INVALID_VERSION_CONSTRAINT',
    ),
    standardCompatible: unique.every(
      issue => issue.code !== 'STANDARD_INCOMPATIBLE',
    ),
    dependenciesSatisfied: unique.every(
      issue => issue.code !== 'MISSING_DEPENDENCY',
    ),
    noConflicts: unique.every(issue => issue.code !== 'CONFLICTING_COMPONENTS'),
  };
  const schemaOk = draft.selectedNames.length > 0 && result.compatible;
  const validated = schemaOk && runtimeAvailable && unique.length === 0;
  return {
    compatible: schemaOk,
    validated,
    checklist,
    issues: unique,
    certifiedCount: selected.filter(
      item => item.certificationStatus === 'CERTIFIED',
    ).length,
    selectedCount: selected.length,
  };
}

export function dependencyLabelsFor(
  component: LibraryPlatformComponent,
  catalog: LibraryPlatformComponent[],
): string[] {
  return component.dependsOn
    .map(ref => {
      const match =
        findPlatformComponent(catalog, ref) ||
        catalog.find(item => item.name === componentNameFromRef(ref));
      return match?.title || componentNameFromRef(ref);
    })
    .filter(Boolean);
}

function humanizeCompositionIssue(
  message: string,
  catalog: PlatformComponent[],
): string {
  const conflict = /(.+) conflicts with (.+)/.exec(message);
  if (conflict) {
    return `${conflict[1]} cannot be combined with ${conflict[2]} according to the current compatibility model.`;
  }
  const missing = /requires (.+), which is missing/.exec(message);
  if (missing) {
    const title =
      findPlatformComponent(catalog, missing[1])?.title ||
      componentNameFromRef(normalizeEntityRef(missing[1]));
    return message.replace(missing[1], title);
  }
  return message;
}

// ============================================================================
// Composition development context — configuration summary (Phase 3)
// ============================================================================

/**
 * One environment variable required by a platform component.
 *
 * Aggregated across all selected components by `compositionConfigSummary`
 * to give a developer the complete configuration checklist for the
 * composition they are building.
 */
export interface CompositionConfigKey {
  /** Environment variable name, e.g. `'MQTT_HOST'`. */
  key: string;
  /** Display title of the component that owns this key. */
  componentTitle: string;
  /** Catalog name of the component, e.g. `'mqtt-consumer'`. */
  componentName: string;
}

export interface CompositionConfigSummary {
  /** All env vars across the selected components, in component order. */
  keys: CompositionConfigKey[];
  /**
   * Components that carry a `configurationNote`, e.g. "Host identity only.
   * No source credentials in this component."
   */
  notes: Array<{ componentTitle: string; note: string }>;
  /** Total count of configuration keys, for quick display. */
  totalCount: number;
}

/**
 * Aggregates the configuration keys and notes from every selected component
 * into a single composition-level summary.
 *
 * This is the development-context view of the composition: after the user
 * has chosen components and validated the composition, this tells them what
 * to put in `.env`. It is derived from `LibraryPlatformComponent.profile`
 * fields that already exist per component; the Composer just did not expose
 * the cross-component aggregate before Phase 3.
 *
 * Order is preserved: components appear in the order they were selected, and
 * their keys appear in the order the profile declares them.
 */
export function compositionConfigSummary(
  selected: LibraryPlatformComponent[],
): CompositionConfigSummary {
  const keys: CompositionConfigKey[] = [];
  const notes: Array<{ componentTitle: string; note: string }> = [];

  for (const comp of selected) {
    for (const key of comp.profile.configurationKeys) {
      keys.push({
        key,
        componentTitle: comp.title,
        componentName: comp.name,
      });
    }
    if (comp.profile.configurationNote) {
      notes.push({
        componentTitle: comp.title,
        note: comp.profile.configurationNote,
      });
    }
  }

  return { keys, notes, totalCount: keys.length };
}

function uniqueIssues(issues: ComposerUxIssue[]): ComposerUxIssue[] {
  const seen = new Set<string>();
  const result: ComposerUxIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(issue);
  }
  return result;
}
