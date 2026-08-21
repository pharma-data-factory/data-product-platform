import {
  Entity,
  getEntitySourceLocation,
  stringifyEntityRef,
} from '@backstage/catalog-model';

import { logicalContractName } from './apiIdentity';
import {
  CompatibilityStatus,
  ContractConsumer,
  evaluateCompatibility,
} from './compatibility';
import { ProductUpgrade, evaluateProductUpgrade } from './upgrade';

export const QUALITY_STATUSES = [
  'DEVELOPMENT',
  'TESTED',
  'CERTIFIED',
] as const;

export type QualityStatus = (typeof QUALITY_STATUSES)[number];
export type CertificationStatus = QualityStatus;
export const CERTIFICATION_STATUSES = QUALITY_STATUSES;

export const RELATION_DEPENDS_ON = 'dependsOn';
export const RELATION_DEPENDENCY_OF = 'dependencyOf';
export const RELATION_PROVIDES_API = 'providesApi';
export const RELATION_CONSUMES_API = 'consumesApi';
export const RELATION_API_CONSUMED_BY = 'apiConsumedBy';

export interface DataProduct {
  name: string;
  title: string;
  description: string;
  owner: string;
  version: string;
  lifecycle: string;
  domain: string;
  sourceSystems: string[];
  interfaces: string[];
  protocol?: string;
  apis: string[];
  dataContracts: string[];
  dataContract?: string;
  dataContractVersion: string;
  qualityStatus: QualityStatus;
  qualityEndpoint?: string;
  requiredChecks: string[];
  providesContract?: string;
  consumesContract?: string;
  compatibleVersions: string[];
  dependsOn: string[];
  usedBy: string[];
  compatibilityStatus: CompatibilityStatus;
  dependencies: string[];
  documentation?: string;
  techDocsUrl?: string;
  repository?: string;
  deployment?: string;
  certificationStatus: CertificationStatus;
  templateName?: string;
  templateVersion?: string;
  dataProductStandardVersion?: string;
  dataProductSdkVersion?: string;
  contractLogicalName?: string;
  contractTitle?: string;
  upgrade?: ProductUpgrade;
  catalogClass?: string;
  entityRef: string;
}

const ANNOTATION_PREFIX = 'dataprod.platform';

export function isDataProductEntity(entity: Entity): boolean {
  return (
    entity.kind === 'Component' &&
    (entity.spec?.type === 'data-product' ||
      entity.metadata.annotations?.[`${ANNOTATION_PREFIX}/kind`] ===
        'data-product')
  );
}

export function parseCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return uniqueNonEmpty(value.split(',').map(item => item.trim()));
}

export function parseQualityStatus(value?: string): QualityStatus {
  if (value === 'TESTED' || value === 'CERTIFIED' || value === 'DEVELOPMENT') {
    return value;
  }
  return 'DEVELOPMENT';
}

export function parseCertificationStatus(value?: string): CertificationStatus {
  return parseQualityStatus(value);
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueNonEmpty(value.map(item => String(item)));
}

function relationTargets(entity: Entity, type: string): string[] {
  return uniqueNonEmpty(
    (entity.relations ?? [])
      .filter(relation => relation.type === type)
      .map(relation => relation.targetRef),
  );
}

function entityName(ref: string): string {
  const slash = ref.lastIndexOf('/');
  if (slash >= 0) {
    return ref.slice(slash + 1);
  }
  const colon = ref.lastIndexOf(':');
  if (colon >= 0) {
    return ref.slice(colon + 1);
  }
  return ref;
}

function contractNames(refs: string[]): string[] {
  return uniqueNonEmpty(refs.map(entityName));
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

export function toDataProduct(entity: Entity): DataProduct {
  const annotations = entity.metadata.annotations ?? {};
  const spec = (entity.spec ?? {}) as Record<string, unknown>;
  const links = entity.metadata.links ?? [];
  const repositoryLink = links.find(link =>
    /repository/i.test(link.title ?? ''),
  );
  const documentationLink = links.find(link =>
    /documentation|docs/i.test(link.title ?? ''),
  );

  let repository = repositoryLink?.url;
  try {
    const source = getEntitySourceLocation(entity);
    repository = repository ?? source.target;
  } catch {
    // Source location is optional for locally registered example entities.
  }

  const namespace = entity.metadata.namespace ?? 'default';
  const techdocsRef = annotations['backstage.io/techdocs-ref'];

  const providedApis = firstPresent(
    contractNames(relationTargets(entity, RELATION_PROVIDES_API)),
    contractNames(asStringArray(spec.providesApis)),
    parseCsv(annotations[`${ANNOTATION_PREFIX}/providesContract`]),
  );
  const consumedApis = firstPresent(
    contractNames(relationTargets(entity, RELATION_CONSUMES_API)),
    contractNames(asStringArray(spec.consumesApis)),
    parseCsv(annotations[`${ANNOTATION_PREFIX}/consumesContract`]),
  );
  const dependsOn = firstPresent(
    relationTargets(entity, RELATION_DEPENDS_ON),
    asStringArray(spec.dependsOn),
    parseCsv(annotations[`${ANNOTATION_PREFIX}/depends-on`]),
  );

  return {
    name: entity.metadata.name,
    title: entity.metadata.title ?? entity.metadata.name,
    description: entity.metadata.description ?? '',
    owner: String(spec.owner ?? 'unknown'),
    version: annotations[`${ANNOTATION_PREFIX}/version`] ?? '0.0.0',
    lifecycle: String(spec.lifecycle ?? 'experimental'),
    domain: annotations[`${ANNOTATION_PREFIX}/domain`] ?? 'unassigned',
    sourceSystems: parseCsv(annotations[`${ANNOTATION_PREFIX}/source-systems`]),
    interfaces: parseCsv(annotations[`${ANNOTATION_PREFIX}/interfaces`]),
    protocol: annotations[`${ANNOTATION_PREFIX}/protocol`],
    apis: providedApis,
    dataContracts: parseCsv(
      annotations[`${ANNOTATION_PREFIX}/data-contracts`],
    ),
    dataContract: annotations[`${ANNOTATION_PREFIX}/dataContract`],
    dataContractVersion:
      annotations[`${ANNOTATION_PREFIX}/dataContractVersion`] ?? '',
    qualityStatus: parseQualityStatus(
      annotations[`${ANNOTATION_PREFIX}/qualityStatus`],
    ),
    qualityEndpoint: annotations[`${ANNOTATION_PREFIX}/quality-endpoint`],
    requiredChecks: parseCsv(
      annotations[`${ANNOTATION_PREFIX}/quality-checks`],
    ),
    providesContract: providedApis[0],
    consumesContract: consumedApis[0],
    compatibleVersions: parseCsv(
      annotations[`${ANNOTATION_PREFIX}/compatibleVersions`],
    ),
    dependsOn,
    usedBy: relationTargets(entity, RELATION_DEPENDENCY_OF),
    compatibilityStatus: 'UNKNOWN',
    dependencies: dependsOn,
    documentation:
      documentationLink?.url ??
      (techdocsRef
        ? `/docs/${namespace}/component/${entity.metadata.name}`
        : undefined),
    techDocsUrl: techdocsRef
      ? `/docs/${namespace}/component/${entity.metadata.name}`
      : undefined,
    repository,
    deployment: annotations[`${ANNOTATION_PREFIX}/deployment`],
    certificationStatus: parseCertificationStatus(
      annotations[`${ANNOTATION_PREFIX}/certification-status`],
    ),
    catalogClass: annotations[`${ANNOTATION_PREFIX}/catalog-class`],
    templateName: annotations[`${ANNOTATION_PREFIX}/template`],
    templateVersion: annotations[`${ANNOTATION_PREFIX}/templateVersion`],
    dataProductStandardVersion:
      annotations[`${ANNOTATION_PREFIX}/dataProductStandardVersion`],
    dataProductSdkVersion:
      annotations[`${ANNOTATION_PREFIX}/dataProductSdkVersion`],
    contractLogicalName: providedApis[0]
      ? logicalContractName(providedApis[0])
      : consumedApis[0]
        ? logicalContractName(consumedApis[0])
        : undefined,
    entityRef: stringifyEntityRef(entity),
  };
}

export function catalogClassOf(product: {
  name: string;
  title?: string;
  catalogClass?: string;
}): string {
  const annotated = product.catalogClass?.trim().toUpperCase();
  if (annotated) {
    return annotated;
  }
  const name = product.name.trim().toLowerCase();
  const title = (product.title ?? '').trim().toLowerCase();
  if (name.startsWith('sample-') || title.startsWith('sample ')) {
    return 'SAMPLE';
  }
  return 'REAL';
}

export function isSampleDataProduct(product: {
  name: string;
  title?: string;
  catalogClass?: string;
}): boolean {
  return catalogClassOf(product) === 'SAMPLE';
}

export function catalogClassLabel(product: {
  name: string;
  title?: string;
  catalogClass?: string;
}): string | undefined {
  const catalogClass = catalogClassOf(product);
  return catalogClass === 'REAL' ? undefined : catalogClass;
}

export function matchesQuery(product: DataProduct, query: string): boolean {
  const haystack = [
    product.name,
    product.title,
    product.description,
    product.owner,
    product.domain,
    product.lifecycle,
    product.version,
    product.dataContractVersion,
    product.qualityStatus,
    product.certificationStatus,
    product.templateName ?? '',
    product.templateVersion ?? '',
    product.dataProductStandardVersion ?? '',
    product.dataProductSdkVersion ?? '',
    product.protocol ?? '',
    product.providesContract ?? '',
    product.consumesContract ?? '',
    product.repository ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function refersTo(ref: string, product: DataProduct): boolean {
  return (
    ref === product.entityRef ||
    ref === product.name ||
    ref.endsWith(`/${product.name}`)
  );
}

function displayRef(ref: string, catalog: DataProduct[]): string {
  const match = catalog.find(product => refersTo(ref, product));
  return match?.title || match?.name || entityName(ref);
}

function usedByFromCatalogRelations(
  product: DataProduct,
  catalog: DataProduct[],
  apiEntities: Entity[],
): string[] {
  const provided = new Set(
    uniqueNonEmpty([product.providesContract, ...product.apis]),
  );
  const fromApis = apiEntities.flatMap(api => {
    if (!provided.has(api.metadata.name)) {
      return [];
    }
    return relationTargets(api, RELATION_API_CONSUMED_BY);
  });

  return uniqueNonEmpty([...product.usedBy, ...fromApis]).map(ref =>
    displayRef(ref, catalog),
  );
}

function annotationValue(entity: Entity | undefined, key: string): string {
  const value = entity?.metadata.annotations?.[key];
  return value ? value.trim() : '';
}

function relatedApiEntity(
  product: DataProduct,
  apiEntities: Entity[],
): Entity | undefined {
  const relatedNames = uniqueNonEmpty([
    product.providesContract,
    ...product.apis,
    product.consumesContract,
  ]);
  for (const name of relatedNames) {
    const api = apiEntities.find(entity => entity.metadata.name === name);
    if (api) {
      return api;
    }
  }
  return undefined;
}

function resolveContractVersion(
  product: DataProduct,
  apiEntities: Entity[],
): string {
  const api = relatedApiEntity(product, apiEntities);
  const fromApi = annotationValue(api, `${ANNOTATION_PREFIX}/contract-version`);
  return fromApi || product.dataContractVersion;
}

export function withCatalogRelationships(
  product: DataProduct,
  catalog: DataProduct[],
  apiEntities: Entity[] = [],
): DataProduct {
  const dataContractVersion = resolveContractVersion(product, apiEntities);

  const consumers: ContractConsumer[] = catalog
    .filter(
      other =>
        Boolean(product.providesContract) &&
        other.consumesContract === product.providesContract,
    )
    .map(other => ({
      name: other.name,
      consumesContract: other.consumesContract ?? '',
      compatibleVersions: other.compatibleVersions,
      active: true,
    }));

  let compatibilityStatus: CompatibilityStatus = 'UNKNOWN';
  if (product.providesContract && dataContractVersion) {
    const schema = { version: dataContractVersion };
    compatibilityStatus = evaluateCompatibility({
      contract: product.providesContract,
      previous: schema,
      next: schema,
      consumers,
    }).status;
  } else if (product.consumesContract) {
    const provider = catalog.find(
      other => other.providesContract === product.consumesContract,
    );
    const providerVersion = resolveContractVersion(
      provider ?? product,
      apiEntities,
    );
    if (providerVersion) {
      const schema = { version: providerVersion };
      compatibilityStatus = evaluateCompatibility({
        contract: product.consumesContract,
        previous: schema,
        next: schema,
        consumers: [
          {
            name: product.name,
            consumesContract: product.consumesContract,
            compatibleVersions: product.compatibleVersions,
            active: true,
          },
        ],
      }).status;
    }
  }

  const relatedApi = relatedApiEntity(product, apiEntities);
  const contractLogicalName = logicalContractName(
    product.providesContract || product.consumesContract || '',
    annotationValue(relatedApi, `${ANNOTATION_PREFIX}/contract`),
  );

  return {
    ...product,
    dataContractVersion,
    contractLogicalName: contractLogicalName || product.contractLogicalName,
    contractTitle: relatedApi?.metadata.title,
    upgrade: evaluateProductUpgrade({
      standardVersion: product.dataProductStandardVersion,
      sdkVersion: product.dataProductSdkVersion,
      templateName: product.templateName,
      templateVersion: product.templateVersion,
    }),
    usedBy: usedByFromCatalogRelations(product, catalog, apiEntities),
    compatibilityStatus,
  };
}

export function toRelatedDataProducts(entities: Entity[]): DataProduct[] {
  const products = entities.filter(isDataProductEntity).map(toDataProduct);
  const apiEntities = entities.filter(entity => entity.kind === 'API');
  return products.map(product =>
    withCatalogRelationships(product, products, apiEntities),
  );
}
