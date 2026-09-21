/**
 * @deprecated GP-8 migration in progress (W3-2).
 *
 * This file (`nexora-industrial.ts`) contains 589 lines of manufacturing
 * vocabulary (equipment, site, area, line, OEE, equipment-state, connectivity)
 * that belong in a POLICY_PACK or COMPONENT Artifact, not in the platform
 * kernel. Core should be domain-neutral.
 *
 * Migration plan:
 *   1. Create `plugins/nexora-industrial-artifact/` as a standalone workspace.
 *   2. Register a `nexora/industrial-vocabulary@1.0.0` COMPONENT Artifact.
 *   3. Move all exports there.
 *   4. Replace all imports in this codebase to use the Artifact's public API.
 *   5. Delete this file.
 *
 * Tracked as GP-8 in HARDCODED_DOMAIN_INVENTORY.md.
 * Do NOT add new industrial vocabulary to this file.
 */
import type { CatalogEntityLike } from './platform-components';

export const NEXORA_ANNOTATION_PREFIX = 'nexora.io';

export const NEXORA_ANNOTATIONS = {
  equipmentId: `${NEXORA_ANNOTATION_PREFIX}/equipment-id`,
  site: `${NEXORA_ANNOTATION_PREFIX}/site`,
  area: `${NEXORA_ANNOTATION_PREFIX}/area`,
  line: `${NEXORA_ANNOTATION_PREFIX}/line`,
  equipmentType: `${NEXORA_ANNOTATION_PREFIX}/equipment-type`,
  manufacturer: `${NEXORA_ANNOTATION_PREFIX}/manufacturer`,
  model: `${NEXORA_ANNOTATION_PREFIX}/model`,
  connectivityApi: `${NEXORA_ANNOTATION_PREFIX}/connectivity-api`,
  dataQualityApi: `${NEXORA_ANNOTATION_PREFIX}/data-quality-api`,
  metricsApi: `${NEXORA_ANNOTATION_PREFIX}/metrics-api`,
  oeeApi: `${NEXORA_ANNOTATION_PREFIX}/oee-api`,
  equipmentStateApi: `${NEXORA_ANNOTATION_PREFIX}/equipment-state-api`,
  capabilitiesApi: `${NEXORA_ANNOTATION_PREFIX}/capabilities-api`,
  contractApi: `${NEXORA_ANNOTATION_PREFIX}/contract-api`,
  productType: `${NEXORA_ANNOTATION_PREFIX}/product-type`,
} as const;

export const EQUIPMENT_COMPONENT_TYPE = 'equipment';
export const EQUIPMENT_PATH = '/equipment';
export const INDUSTRIAL_CONTRACTS_PATH = '/contracts';
export const INDUSTRIAL_QUALITY_PATH = '/quality';

export const CONNECTIVITY_STATUSES = [
  'CONNECTED',
  'DEGRADED',
  'DISCONNECTED',
  'UNKNOWN',
] as const;

export type ConnectivityStatus = (typeof CONNECTIVITY_STATUSES)[number];

export const CONNECTIVITY_KINDS = [
  'MQTT',
  'REST',
  'OPC UA',
  'Kafka',
  'Files',
  'Events',
] as const;

export type ConnectivityKind = (typeof CONNECTIVITY_KINDS)[number];

export const HEALTH_STATES = [
  'HEALTHY',
  'WARNING',
  'ERROR',
  'UNKNOWN',
] as const;

export type HealthState = (typeof HEALTH_STATES)[number];

export const EQUIPMENT_STATES = [
  'RUNNING',
  'STOPPED',
  'IDLE',
  'MAINTENANCE',
  'UNKNOWN',
] as const;

export type EquipmentRuntimeState = (typeof EQUIPMENT_STATES)[number];

export const CONTRACT_COMPATIBILITY = [
  'COMPATIBLE',
  'BREAKING_CHANGE',
  'UNKNOWN',
] as const;

export type ContractCompatibility = (typeof CONTRACT_COMPATIBILITY)[number];

export const CAPABILITY_LEVELS = [
  'INCLUDED',
  'FOUNDATION',
  'PLANNED',
] as const;

export type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

export const PROVIDER_RESULT_STATUSES = [
  'ok',
  'unconfigured',
  'unavailable',
  'invalid',
] as const;

export type ProviderResultStatus = (typeof PROVIDER_RESULT_STATUSES)[number];

export interface HealthCheck {
  state: HealthState;
  label: string;
  value?: string | number;
  message?: string;
  updatedAt?: string;
}

export interface DataProductHealth {
  freshness?: HealthCheck;
  completeness?: HealthCheck;
  schema?: HealthCheck;
  volume?: HealthCheck;
  uniqueness?: HealthCheck;
  timeliness?: HealthCheck;
  nullRate?: HealthCheck;
  contractViolations?: HealthCheck;
}

export interface DataProductRef {
  name: string;
  title?: string;
  version?: string;
  entityRef?: string;
  apiRef?: string;
  productType?: string;
}

export interface NexoraAsset {
  equipmentId: string;
  name: string;
  title: string;
  description?: string;
  site?: string;
  area?: string;
  line?: string;
  equipmentType?: string;
  manufacturer?: string;
  model?: string;
  owner?: string;
  lifecycle?: string;
  entityRef: string;
  system?: string;
  tags: string[];
}

export interface MetricValue {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  updatedAt?: string;
}

export interface EquipmentStateView {
  state: EquipmentRuntimeState;
  updatedAt?: string;
  message?: string;
}

export interface ConnectivityInterface {
  kind: ConnectivityKind | string;
  name: string;
  state: ConnectivityStatus;
  endpoint?: string;
  broker?: string;
  lastMessage?: string;
  rate?: string;
  latency?: string;
  lastCheck?: string;
  message?: string;
}

export interface CapabilityItem {
  name: string;
  level: CapabilityLevel;
}

export interface CapabilityGroup {
  level: CapabilityLevel;
  items: string[];
}

export interface ContractHistoryEntry {
  from?: string;
  to: string;
  status: ContractCompatibility;
  current?: boolean;
}

export interface ContractView {
  name: string;
  version?: string;
  format?: string;
  compatibility: ContractCompatibility;
  fields: string[];
  history: ContractHistoryEntry[];
  catalogApiRef?: string;
  sourceLabel?: string;
}

export interface ProviderResult<T> {
  status: ProviderResultStatus;
  data?: T;
  message?: string;
  code?: number;
}

export interface IndustrialDataProduct {
  name: string;
  title: string;
  description?: string;
  owner?: string;
  lifecycle?: string;
  domain?: string;
  version?: string;
  productType?: string;
  entityRef: string;
  equipmentId?: string;
  providesApis: string[];
  dependsOn: string[];
}

function annotation(entity: CatalogEntityLike, key: string): string | undefined {
  const value = entity.metadata.annotations?.[key]?.trim();
  return value || undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => String(item).trim())
    .filter((item, index, all) => item && all.indexOf(item) === index);
}

export function entityRefOf(entity: CatalogEntityLike): string {
  const namespace = entity.metadata.namespace || 'default';
  return `${entity.kind.toLowerCase()}:${namespace}/${entity.metadata.name}`;
}

export function entityNameFromRef(entityRef?: string): string | undefined {
  if (!entityRef) {
    return undefined;
  }
  const slash = entityRef.lastIndexOf('/');
  return slash >= 0 ? entityRef.slice(slash + 1) : entityRef;
}

export function isEquipmentEntity(entity: CatalogEntityLike): boolean {
  return (
    entity.kind === 'Component' &&
    (asString(entity.spec?.type) === EQUIPMENT_COMPONENT_TYPE ||
      Boolean(annotation(entity, NEXORA_ANNOTATIONS.equipmentId)))
  );
}

export function isIndustrialDataProduct(entity: CatalogEntityLike): boolean {
  if (entity.kind !== 'Component') {
    return false;
  }
  const type = asString(entity.spec?.type);
  return (
    type === 'data-product' &&
    Boolean(
      annotation(entity, NEXORA_ANNOTATIONS.equipmentId) ||
        annotation(entity, NEXORA_ANNOTATIONS.productType) ||
        annotation(entity, NEXORA_ANNOTATIONS.oeeApi) ||
        annotation(entity, NEXORA_ANNOTATIONS.dataQualityApi),
    )
  );
}

export function hasIndustrialAnnotation(
  entity: CatalogEntityLike,
  key: keyof typeof NEXORA_ANNOTATIONS,
): boolean {
  return Boolean(annotation(entity, NEXORA_ANNOTATIONS[key]));
}

export function toNexoraAsset(entity: CatalogEntityLike): NexoraAsset | undefined {
  if (!isEquipmentEntity(entity)) {
    return undefined;
  }
  return {
    equipmentId:
      annotation(entity, NEXORA_ANNOTATIONS.equipmentId) || entity.metadata.name,
    name: entity.metadata.name,
    title: entity.metadata.title || entity.metadata.name,
    description: entity.metadata.description,
    site: annotation(entity, NEXORA_ANNOTATIONS.site),
    area: annotation(entity, NEXORA_ANNOTATIONS.area),
    line: annotation(entity, NEXORA_ANNOTATIONS.line),
    equipmentType: annotation(entity, NEXORA_ANNOTATIONS.equipmentType),
    manufacturer: annotation(entity, NEXORA_ANNOTATIONS.manufacturer),
    model: annotation(entity, NEXORA_ANNOTATIONS.model),
    owner: asString(entity.spec?.owner),
    lifecycle: asString(entity.spec?.lifecycle),
    entityRef: entityRefOf(entity),
    system: asString(entity.spec?.system),
    tags: entity.metadata.tags ?? [],
  };
}

export function toIndustrialDataProduct(
  entity: CatalogEntityLike,
): IndustrialDataProduct | undefined {
  if (entity.kind !== 'Component' || asString(entity.spec?.type) !== 'data-product') {
    return undefined;
  }
  return {
    name: entity.metadata.name,
    title: entity.metadata.title || entity.metadata.name,
    description: entity.metadata.description,
    owner: asString(entity.spec?.owner),
    lifecycle: asString(entity.spec?.lifecycle),
    domain: annotation(entity, 'dataprod.platform/domain'),
    version: annotation(entity, 'dataprod.platform/version'),
    productType: annotation(entity, NEXORA_ANNOTATIONS.productType),
    entityRef: entityRefOf(entity),
    equipmentId: annotation(entity, NEXORA_ANNOTATIONS.equipmentId),
    providesApis: asStringArray(entity.spec?.providesApis),
    dependsOn: [
      ...asStringArray(entity.spec?.dependsOn),
      ...(entity.relations ?? [])
        .filter(relation => relation.type === 'dependsOn')
        .map(relation => relation.targetRef),
    ],
  };
}

export function relatedDataProducts(
  equipment: NexoraAsset,
  entities: CatalogEntityLike[],
): DataProductRef[] {
  return entities
    .map(toIndustrialDataProduct)
    .filter((product): product is IndustrialDataProduct => Boolean(product))
    .filter(
      product =>
        product.equipmentId === equipment.equipmentId ||
        product.dependsOn.some(
          ref =>
            ref === equipment.entityRef ||
            entityNameFromRef(ref) === equipment.name,
        ),
    )
    .map(product => ({
      name: product.name,
      title: product.title,
      version: product.version,
      entityRef: product.entityRef,
      apiRef: product.providesApis[0],
      productType: product.productType,
    }));
}

export function relatedResources(
  equipment: CatalogEntityLike,
  entities: CatalogEntityLike[],
): CatalogEntityLike[] {
  const refs = new Set([
    ...asStringArray(equipment.spec?.dependsOn),
    ...(equipment.relations ?? [])
      .filter(relation => relation.type === 'dependsOn')
      .map(relation => relation.targetRef),
  ]);
  return entities.filter(entity => refs.has(entityRefOf(entity)));
}

export function interfaceLabels(entities: CatalogEntityLike[]): string[] {
  const labels = new Set<string>();
  for (const entity of entities) {
    if (entity.kind === 'Resource') {
      labels.add(asString(entity.spec?.type) || entity.metadata.title || entity.metadata.name);
    }
    if (entity.kind === 'System') {
      labels.add(entity.metadata.title || entity.metadata.name);
    }
  }
  return [...labels];
}

export interface AssetFilters {
  site?: string;
  area?: string;
  line?: string;
  equipmentType?: string;
  owner?: string;
  lifecycle?: string;
  query?: string;
}

export function filterAssets(
  assets: NexoraAsset[],
  filters: AssetFilters,
): NexoraAsset[] {
  const query = filters.query?.trim().toLowerCase();
  return assets.filter(asset => {
    if (filters.site && asset.site !== filters.site) {
      return false;
    }
    if (filters.area && asset.area !== filters.area) {
      return false;
    }
    if (filters.line && asset.line !== filters.line) {
      return false;
    }
    if (filters.equipmentType && asset.equipmentType !== filters.equipmentType) {
      return false;
    }
    if (filters.owner && asset.owner !== filters.owner) {
      return false;
    }
    if (filters.lifecycle && asset.lifecycle !== filters.lifecycle) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      asset.title,
      asset.name,
      asset.equipmentId,
      asset.site,
      asset.area,
      asset.line,
      asset.equipmentType,
      asset.owner,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export interface ProductFilters {
  domain?: string;
  owner?: string;
  lifecycle?: string;
  productType?: string;
  version?: string;
  query?: string;
}

export function filterIndustrialProducts(
  products: IndustrialDataProduct[],
  filters: ProductFilters,
): IndustrialDataProduct[] {
  const query = filters.query?.trim().toLowerCase();
  return products.filter(product => {
    if (filters.domain && product.domain !== filters.domain) {
      return false;
    }
    if (filters.owner && product.owner !== filters.owner) {
      return false;
    }
    if (filters.lifecycle && product.lifecycle !== filters.lifecycle) {
      return false;
    }
    if (filters.productType && product.productType !== filters.productType) {
      return false;
    }
    if (filters.version && product.version !== filters.version) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      product.title,
      product.name,
      product.productType,
      product.domain,
      product.owner,
      product.equipmentId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function groupAssetsByHierarchy(assets: NexoraAsset[]): Array<{
  site: string;
  areas: Array<{
    area: string;
    lines: Array<{ line: string; equipment: NexoraAsset[] }>;
  }>;
}> {
  const sites = new Map<string, Map<string, Map<string, NexoraAsset[]>>>();
  for (const asset of assets) {
    const site = asset.site || 'Unassigned site';
    const area = asset.area || 'Unassigned area';
    const line = asset.line || 'Unassigned line';
    const areas = sites.get(site) ?? new Map();
    const lines = areas.get(area) ?? new Map();
    const equipment = lines.get(line) ?? [];
    equipment.push(asset);
    lines.set(line, equipment);
    areas.set(area, lines);
    sites.set(site, areas);
  }
  return [...sites.entries()].map(([site, areas]) => ({
    site,
    areas: [...areas.entries()].map(([area, lines]) => ({
      area,
      lines: [...lines.entries()].map(([line, equipment]) => ({
        line,
        equipment,
      })),
    })),
  }));
}

export function uniqueValues<T extends object>(items: T[], key: keyof T): string[] {
  const values = items
    .map(item => item[key])
    .filter((value): value is Extract<T[keyof T], string> => typeof value === 'string' && value.length > 0);
  return [...new Set(values.map(value => String(value)))].sort();
}

export function parseHealthState(value?: string): HealthState {
  return HEALTH_STATES.includes(value as HealthState)
    ? (value as HealthState)
    : 'UNKNOWN';
}

export function parseConnectivityStatus(value?: string): ConnectivityStatus {
  return CONNECTIVITY_STATUSES.includes(value as ConnectivityStatus)
    ? (value as ConnectivityStatus)
    : 'UNKNOWN';
}

export function parseEquipmentState(value?: string): EquipmentRuntimeState {
  return EQUIPMENT_STATES.includes(value as EquipmentRuntimeState)
    ? (value as EquipmentRuntimeState)
    : 'UNKNOWN';
}

export function parseCompatibility(value?: string): ContractCompatibility {
  return CONTRACT_COMPATIBILITY.includes(value as ContractCompatibility)
    ? (value as ContractCompatibility)
    : 'UNKNOWN';
}

export function parseCapabilityLevel(value?: string): CapabilityLevel {
  return CAPABILITY_LEVELS.includes(value as CapabilityLevel)
    ? (value as CapabilityLevel)
    : 'PLANNED';
}

export function unconfiguredResult<T>(message: string): ProviderResult<T> {
  return { status: 'unconfigured', message };
}

export function unavailableResult<T>(
  message: string,
  code?: number,
): ProviderResult<T> {
  return { status: 'unavailable', message, code };
}

export function okResult<T>(data: T): ProviderResult<T> {
  return { status: 'ok', data };
}

export function equipmentPath(name: string): string {
  return `${EQUIPMENT_PATH}/${encodeURIComponent(name)}`;
}

export function industrialContractPath(name: string): string {
  return `${INDUSTRIAL_CONTRACTS_PATH}/${encodeURIComponent(name)}`;
}

export function industrialQualityPath(name: string): string {
  return `${INDUSTRIAL_QUALITY_PATH}/${encodeURIComponent(name)}`;
}

export function catalogEntityPath(entityRef: string): string {
  const [kind, rest] = entityRef.split(':');
  const [namespace, name] = (rest || 'default/unknown').split('/');
  return `/catalog/${namespace || 'default'}/${kind}/${name}`;
}

export function apiDocsPath(apiName: string): string {
  return `/catalog/default/api/${apiName}`;
}
