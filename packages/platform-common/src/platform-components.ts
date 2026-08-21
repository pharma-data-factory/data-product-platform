import { parseSemverParts } from './releases';

export const PLATFORM_COMPONENT_TYPE = 'platform-component';
export const PLATFORM_COMPONENT_KIND_ANNOTATION = 'dataprod.platform/kind';
export const PLATFORM_COMPONENT_REGISTRY_PATH = '/platform-components';

export const PLATFORM_COMPONENT_CATEGORIES = [
  'integration',
  'data',
  'operations',
  'intelligence',
  'asset-semantic',
] as const;

export type PlatformComponentCategory =
  (typeof PLATFORM_COMPONENT_CATEGORIES)[number];

export const PLATFORM_COMPONENT_CERTIFICATION_STATUSES = [
  'DEVELOPMENT',
  'TESTED',
  'CERTIFIED',
  'DEPRECATED',
  'PLANNED',
] as const;

export type PlatformComponentCertificationStatus =
  (typeof PLATFORM_COMPONENT_CERTIFICATION_STATUSES)[number];

export const SUPPORTED_PLATFORM_COMPONENT_STATUSES: readonly PlatformComponentCertificationStatus[] =
  ['DEVELOPMENT', 'TESTED', 'CERTIFIED'];

const ANNOTATION_PREFIX = 'dataprod.platform';

export interface CatalogEntityLike {
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    title?: string;
    description?: string;
    annotations?: Record<string, string>;
    tags?: string[];
    links?: Array<{ url: string; title?: string }>;
  };
  spec?: {
    type?: unknown;
    lifecycle?: unknown;
    owner?: unknown;
    system?: unknown;
    providesApis?: unknown;
    consumesApis?: unknown;
    dependsOn?: unknown;
  };
  relations?: Array<{ type: string; targetRef: string }>;
}

export interface PlatformComponent {
  name: string;
  title: string;
  description: string;
  category: PlatformComponentCategory;
  version: string;
  lifecycle: string;
  owner: string;
  certificationStatus: PlatformComponentCertificationStatus;
  compatibleStandardVersions: string[];
  documentation?: string;
  repository?: string;
  providesApis: string[];
  consumesApis: string[];
  dependsOn: string[];
  usedBy: string[];
  conflictsWith: string[];
  entityRef: string;
  system?: string;
}

export interface PlatformComponentFilters {
  category?: PlatformComponentCategory | 'ALL';
  certification?: PlatformComponentCertificationStatus | 'ALL';
}

export function isPlatformComponentEntity(entity: CatalogEntityLike): boolean {
  if (entity.kind !== 'Component') {
    return false;
  }
  const type = asString(entity.spec?.type);
  const kind = annotationValue(entity, `${ANNOTATION_PREFIX}/kind`);
  return type === PLATFORM_COMPONENT_TYPE || kind === PLATFORM_COMPONENT_TYPE;
}

export function parsePlatformComponentCategory(
  value?: string,
): PlatformComponentCategory {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'integration' ||
    normalized === 'data' ||
    normalized === 'operations' ||
    normalized === 'intelligence' ||
    normalized === 'asset-semantic'
  ) {
    return normalized;
  }
  return 'integration';
}

export function parsePlatformComponentCertification(
  value?: string,
): PlatformComponentCertificationStatus {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === 'DEVELOPMENT' ||
    normalized === 'TESTED' ||
    normalized === 'CERTIFIED' ||
    normalized === 'DEPRECATED' ||
    normalized === 'PLANNED'
  ) {
    return normalized;
  }
  return 'DEVELOPMENT';
}

export function parsePlatformComponentVersion(
  version: string,
): { major: number; minor: number; patch: number } | undefined {
  return parseSemverParts(version);
}

export function isValidVersionConstraint(constraint: string): boolean {
  const trimmed = constraint.trim();
  if (trimmed === '*' || /^\d+\.x$/i.test(trimmed)) {
    return true;
  }
  return Boolean(parseSemverParts(trimmed));
}

export function versionSatisfiesConstraint(
  version: string,
  constraint: string,
): boolean {
  const parsed = parseSemverParts(version);
  const trimmed = constraint.trim();
  if (!parsed || !trimmed) {
    return false;
  }
  if (trimmed === '*') {
    return true;
  }
  const majorX = /^(\d+)\.x$/i.exec(trimmed);
  if (majorX) {
    return parsed.major === Number(majorX[1]);
  }
  const exact = parseSemverParts(trimmed);
  return Boolean(
    exact &&
      exact.major === parsed.major &&
      exact.minor === parsed.minor &&
      exact.patch === parsed.patch,
  );
}

export function isSupportedPlatformComponent(
  component: Pick<PlatformComponent, 'certificationStatus'>,
): boolean {
  return SUPPORTED_PLATFORM_COMPONENT_STATUSES.includes(
    component.certificationStatus,
  );
}

export function isDeprecatedPlatformComponent(
  component: Pick<PlatformComponent, 'certificationStatus' | 'lifecycle'>,
): boolean {
  return (
    component.certificationStatus === 'DEPRECATED' ||
    component.lifecycle.trim().toLowerCase() === 'deprecated'
  );
}

export function catalogGraphPathForRef(entityRef: string): string {
  return `/catalog-graph?rootEntityRefs=${encodeURIContext(entityRef)}`;
}

function encodeURIContext(value: string): string {
  return encodeURIComponent(value);
}

export function platformComponentPath(name: string): string {
  return `${PLATFORM_COMPONENT_REGISTRY_PATH}/${encodeURIComponent(name)}`;
}

export function toPlatformComponent(entity: CatalogEntityLike): PlatformComponent {
  const namespace = entity.metadata.namespace || 'default';
  const providesApis = firstPresent(
    asStringArray(entity.spec?.providesApis),
    relationTargets(entity, 'providesApi').map(entityName),
  );
  const consumesApis = firstPresent(
    asStringArray(entity.spec?.consumesApis),
    relationTargets(entity, 'consumesApi').map(entityName),
  );
  const dependsOn = uniqueNonEmpty([
    ...asStringArray(entity.spec?.dependsOn),
    ...relationTargets(entity, 'dependsOn'),
  ]);
  const usedBy = uniqueNonEmpty(relationTargets(entity, 'dependencyOf'));
  const documentation =
    annotationValue(entity, `${ANNOTATION_PREFIX}/documentation`) ||
    linkUrl(entity, 'Documentation') ||
    annotationValue(entity, 'backstage.io/techdocs-ref');
  const repository =
    annotationValue(entity, 'github.com/project-slug') ||
    linkUrl(entity, 'Repository');

  return {
    name: entity.metadata.name,
    title: entity.metadata.title || entity.metadata.name,
    description: entity.metadata.description || '',
    category: parsePlatformComponentCategory(
      annotationValue(entity, `${ANNOTATION_PREFIX}/category`) ||
        entity.metadata.tags?.find(tag =>
          PLATFORM_COMPONENT_CATEGORIES.includes(
            tag as PlatformComponentCategory,
          ),
        ),
    ),
    version:
      annotationValue(entity, `${ANNOTATION_PREFIX}/version`) || '0.0.0',
    lifecycle: asString(entity.spec?.lifecycle) || 'experimental',
    owner: asString(entity.spec?.owner) || 'unknown',
    certificationStatus: parsePlatformComponentCertification(
      annotationValue(entity, `${ANNOTATION_PREFIX}/certification-status`),
    ),
    compatibleStandardVersions: parseCsv(
      annotationValue(
        entity,
        `${ANNOTATION_PREFIX}/compatible-standard-versions`,
      ) || '1.x',
    ),
    documentation,
    repository,
    providesApis,
    consumesApis,
    dependsOn,
    usedBy,
    conflictsWith: parseCsv(
      annotationValue(entity, `${ANNOTATION_PREFIX}/conflicts-with`),
    ),
    entityRef: `component:${namespace}/${entity.metadata.name}`,
    system: asString(entity.spec?.system) || undefined,
  };
}

export function toRelatedPlatformComponents(
  entities: CatalogEntityLike[],
): PlatformComponent[] {
  const components = entities
    .filter(isPlatformComponentEntity)
    .map(toPlatformComponent);
  const titles = new Map<string, string>();
  for (const entity of entities) {
    if (entity.kind !== 'Component' && entity.kind !== 'API') {
      continue;
    }
    const namespace = entity.metadata.namespace || 'default';
    const kind = entity.kind.toLowerCase();
    titles.set(
      `${kind}:${namespace}/${entity.metadata.name}`,
      entity.metadata.title || entity.metadata.name,
    );
    titles.set(entity.metadata.name, entity.metadata.title || entity.metadata.name);
  }

  const usedBy = new Map<string, string[]>();
  const recordUsedBy = (componentRef: string, consumerRef: string) => {
    const key = normalizeEntityRef(componentRef);
    const existing = usedBy.get(key) ?? [];
    usedBy.set(key, uniqueNonEmpty([...existing, consumerRef]));
  };

  for (const entity of entities) {
    const consumerRef = stringifyRef(entity);
    for (const dep of asStringArray(entity.spec?.dependsOn)) {
      recordUsedBy(dep, consumerRef);
    }
    for (const rel of entity.relations ?? []) {
      if (rel.type === 'dependsOn') {
        recordUsedBy(rel.targetRef, consumerRef);
      }
    }
  }

  return components.map(component => {
    const derived = [
      ...component.usedBy,
      ...(usedBy.get(component.entityRef) ?? []),
      ...(usedBy.get(component.name) ?? []),
    ].filter(ref => normalizeEntityRef(ref) !== component.entityRef);
    return {
      ...component,
      usedBy: uniqueNonEmpty(derived).map(
        ref => titles.get(normalizeEntityRef(ref)) || titles.get(entityName(ref)) || entityName(ref),
      ),
    };
  });
}

export function filterPlatformComponents(
  components: PlatformComponent[],
  filters: PlatformComponentFilters = {},
): PlatformComponent[] {
  return components.filter(component => {
    const categoryOk =
      !filters.category ||
      filters.category === 'ALL' ||
      component.category === filters.category;
    const certOk =
      !filters.certification ||
      filters.certification === 'ALL' ||
      component.certificationStatus === filters.certification;
    return categoryOk && certOk;
  });
}

export function findPlatformComponent(
  components: PlatformComponent[],
  ref: string,
): PlatformComponent | undefined {
  const normalized = normalizeEntityRef(ref);
  const name = entityName(normalized);
  return components.find(
    component =>
      component.entityRef === normalized ||
      component.name === name ||
      component.entityRef.endsWith(`/${name}`),
  );
}

function stringifyRef(entity: CatalogEntityLike): string {
  const namespace = entity.metadata.namespace || 'default';
  return `${entity.kind.toLowerCase()}:${namespace}/${entity.metadata.name}`;
}

export function normalizeEntityRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (!trimmed.includes(':')) {
    return `component:default/${trimmed}`;
  }
  const [kind, rest] = trimmed.split(':', 2);
  if (rest.includes('/')) {
    return `${kind.toLowerCase()}:${rest}`;
  }
  return `${kind.toLowerCase()}:default/${rest}`;
}

function entityName(ref: string): string {
  const slash = ref.lastIndexOf('/');
  if (slash >= 0) {
    return ref.slice(slash + 1);
  }
  const colon = ref.lastIndexOf(':');
  return colon >= 0 ? ref.slice(colon + 1) : ref;
}

function annotationValue(entity: CatalogEntityLike, key: string): string {
  return entity.metadata.annotations?.[key]?.trim() || '';
}

function linkUrl(entity: CatalogEntityLike, title: string): string | undefined {
  return entity.metadata.links?.find(link => link.title === title)?.url;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueNonEmpty(value.map(item => String(item)));
}

function relationTargets(entity: CatalogEntityLike, type: string): string[] {
  return uniqueNonEmpty(
    (entity.relations ?? [])
      .filter(relation => relation.type === type)
      .map(relation => relation.targetRef),
  );
}

function parseCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return uniqueNonEmpty(value.split(',').map(item => item.trim()));
}

function firstPresent(...groups: string[][]): string[] {
  for (const group of groups) {
    const cleaned = uniqueNonEmpty(group);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }
  return [];
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
