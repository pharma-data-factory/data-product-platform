/**
 * Product Composer domain model: a Data Product or Service defined as a
 * Blackbox of typed components, with versioned definitions and data contracts.
 *
 * Distinct from the commercial `CommercialProduct` model and from the Catalog
 * `data-product.*` permissions — this is the persisted Product Composer model.
 */

import {
  ComponentType,
  DataClassification,
  InterfaceType,
} from './classification';

export const PRODUCT_TYPES = ['DATA_PRODUCT', 'SERVICE'] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_LIFECYCLES = [
  'EXPERIMENTAL',
  'PRODUCTION',
  'DEPRECATED',
] as const;

export type ProductLifecycle = (typeof PRODUCT_LIFECYCLES)[number];

export const PRODUCT_STATUSES = ['ACTIVE', 'RETIRED'] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_VERSION_STATUSES = [
  'DRAFT',
  'APPROVED',
  'RELEASE_CANDIDATE',
  'RELEASED',
  'SUPERSEDED',
] as const;

export type ProductVersionStatus = (typeof PRODUCT_VERSION_STATUSES)[number];

export const DATA_CONTRACT_STATUSES = ['DRAFT', 'ACTIVE'] as const;

export type DataContractStatus = (typeof DATA_CONTRACT_STATUSES)[number];

export const DATA_CONTRACT_SCHEMA_TYPES = [
  'JSON_SCHEMA',
  'AVRO',
  'PROTOBUF',
  'OPENAPI',
  'ASYNCAPI',
] as const;

export type DataContractSchemaType = (typeof DATA_CONTRACT_SCHEMA_TYPES)[number];

export const TRACEABILITY_RELATIONSHIP_TYPES = [
  'IMPLEMENTS',
  'VERIFIED_BY',
  'TRACES_TO',
] as const;

export type TraceabilityRelationshipType =
  (typeof TRACEABILITY_RELATIONSHIP_TYPES)[number];

export interface Product {
  id: string;
  name: string;
  description?: string;
  businessPurpose?: string;
  productType: ProductType;
  domain?: string;
  subdomain?: string;
  owner?: string;
  team?: string;
  lifecycle: ProductLifecycle;
  status: ProductStatus;
  criticality?: string;
  gxpRelevance?: string;
  dataClassification?: DataClassification;
  consumers?: string[];
  slo?: Record<string, unknown>;
  costInfo?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  revision: number;
}

export interface ProductVersion {
  id: string;
  productId: string;
  version: string;
  versionNumber: number;
  status: ProductVersionStatus;
  changelog?: string;
  parentVersionId?: string;
  releaseCommitSha?: string;
  artifactDigest?: string;
  baselineId?: string;
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  revision: number;
}

export interface ProductComponent {
  id: string;
  productVersionId: string;
  componentType: ComponentType;
  name: string;
  description?: string;
  ref?: string;
  interfaceType?: InterfaceType;
  sourceSystem?: string;
  targetSystem?: string;
  config?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  revision: number;
}

export interface DataContract {
  id: string;
  productComponentId: string;
  schemaType: DataContractSchemaType;
  schemaRef?: string;
  contractSpec?: Record<string, unknown>;
  status: DataContractStatus;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  revision: number;
}

export interface TraceabilityLink {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceRevision?: number;
  relationshipType: TraceabilityRelationshipType;
  targetType: string;
  targetId: string;
  targetRevision?: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export function isProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

export function isProductVersionStatus(
  value: string,
): value is ProductVersionStatus {
  return (PRODUCT_VERSION_STATUSES as readonly string[]).includes(value);
}

export function isDataContractStatus(value: string): value is DataContractStatus {
  return (DATA_CONTRACT_STATUSES as readonly string[]).includes(value);
}

export function isDataContractSchemaType(
  value: string,
): value is DataContractSchemaType {
  return (DATA_CONTRACT_SCHEMA_TYPES as readonly string[]).includes(value);
}

/**
 * A contract's schema type has to be one Nexora can actually interpret.
 *
 * The match is exact rather than case-insensitive: the stored value is the
 * discriminant every consumer switches on, so accepting "json_schema" and
 * storing it verbatim would produce a value the type says cannot exist.
 */
export function validateDataContractSchemaType(value: string): string[] {
  if (!value.trim()) {
    return ['Data contract schemaType is required'];
  }
  if (!isDataContractSchemaType(value)) {
    return [
      `Unsupported data contract schemaType "${value}": expected one of ${DATA_CONTRACT_SCHEMA_TYPES.join(
        ', ',
      )}`,
    ];
  }
  return [];
}

export const PRODUCT_BASELINE_STATUSES = [
  'DRAFT',
  'APPROVED',
  'SUPERSEDED',
] as const;

export type ProductBaselineStatus = (typeof PRODUCT_BASELINE_STATUSES)[number];

export interface ProductBaseline {
  id: string;
  productVersionId: string;
  baselineVersion: string;
  status: ProductBaselineStatus;
  snapshot: Record<string, unknown>;
  ursBaselineIds?: string[];
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  supersededBy?: string;
  revision: number;
}

export function isProductBaselineStatus(
  value: string,
): value is ProductBaselineStatus {
  return (PRODUCT_BASELINE_STATUSES as readonly string[]).includes(value);
}

// ============================================================================
// PRODUCT BASELINE DELTA — Snapshot comparison between two baselines
// ============================================================================

export type ProductChangeType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';

export interface SnapshotItemChange {
  itemId: string;
  itemType: 'component' | 'contract' | 'traceabilityLink';
  changeType: ProductChangeType;
  previous?: Record<string, unknown>;
  current?: Record<string, unknown>;
  changedFields?: string[];
}

export interface ProductBaselineDelta {
  id: string;
  baselineId: string;
  previousBaselineId?: string;
  baselineVersion: string;
  previousBaselineVersion?: string;
  changes: SnapshotItemChange[];
  summary: {
    added: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
  computedAt: Date;
  computedBy: string;
}

// ============================================================================
// PRODUCT VERSION LABELS
// ============================================================================

/**
 * `MAJOR.MINOR` or `MAJOR.MINOR.PATCH`, non-negative, no leading zeros.
 *
 * Leading zeros are rejected on purpose: "01.0" and "1.0" would be two
 * distinct rows naming the same version, and a ProductVersion label is an
 * identity that baselines, validation contexts and releases point at.
 */
const PRODUCT_VERSION_LABEL = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;

export interface ProductVersionLabelParts {
  major: number;
  minor: number;
  patch?: number;
}

export function parseProductVersionLabel(
  label: string,
): ProductVersionLabelParts | undefined {
  const match = PRODUCT_VERSION_LABEL.exec(label.trim());
  if (!match) {
    return undefined;
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    ...(match[3] === undefined ? {} : { patch: parseInt(match[3], 10) }),
  };
}

export function isProductVersionLabel(label: string): boolean {
  return parseProductVersionLabel(label) !== undefined;
}

export function validateProductVersionLabel(label: string): string[] {
  if (!label.trim()) {
    return ['Product version is required'];
  }
  if (!isProductVersionLabel(label)) {
    return [
      `Unsupported product version "${label}": expected MAJOR.MINOR or ` +
        `MAJOR.MINOR.PATCH with no leading zeros`,
    ];
  }
  return [];
}

/**
 * The next `N.0` label above the highest existing one.
 *
 * Derived from the highest existing label rather than from how many labels
 * exist, so an explicitly numbered entry cannot cause the next generated one
 * to collide with it. Unparseable labels are skipped rather than throwing:
 * rows predating this validation must not be able to block a new entry.
 *
 * Shared by ProductVersion labels and ProductBaseline labels — the two have
 * different validation rules but the same "what comes next" question.
 */
export function nextMajorVersionLabel(
  existingLabels: readonly string[],
): string {
  let highestMajor = 0;
  for (const label of existingLabels) {
    const parsed = parseProductVersionLabel(label ?? '');
    if (parsed) {
      highestMajor = Math.max(highestMajor, parsed.major);
      continue;
    }
    // Tolerate historical free text of the form "2.x-something".
    const leading = /^\s*(\d+)/.exec(label ?? '');
    if (leading) {
      highestMajor = Math.max(highestMajor, parseInt(leading[1], 10));
    }
  }
  return `${highestMajor + 1}.0`;
}

// ============================================================================
// BASELINE LABELS
// ============================================================================

/**
 * A baseline label is checked for presence, not for format.
 *
 * Unlike a ProductVersion label, a baseline identifier often has to match a
 * document number in an external QMS ("SOP-1234 Rev B"), so imposing a version
 * grammar here would reject legitimate identifiers. What must hold is that the
 * label exists and names exactly one baseline within its parent.
 */
export function validateBaselineLabel(label: string): string[] {
  return label.trim() ? [] : ['A baseline version label is required'];
}

/**
 * The existing label that collides with `candidate`, if any.
 *
 * Comparison ignores case and surrounding space, so "Rev-A" and "rev-a" are
 * the same baseline identity rather than two.
 */
export function findVersionLabelClash(
  existingLabels: readonly string[],
  candidate: string,
): string | undefined {
  const normalized = candidate.trim().toLowerCase();
  return existingLabels.find(
    label => (label ?? '').trim().toLowerCase() === normalized,
  );
}

export function validateProduct(product: {
  name?: string;
  productType?: string;
}): string[] {
  const issues: string[] = [];
  if (!product.name?.trim()) {
    issues.push('Product name is required');
  }
  if (!product.productType || !isProductType(product.productType)) {
    issues.push(`Unsupported productType: ${product.productType ?? ''}`);
  }
  return issues;
}

export function validateTraceabilityLink(link: {
  sourceId?: string;
  targetId?: string;
  relationshipType?: string;
}): string[] {
  const issues: string[] = [];
  if (!link.sourceId?.trim()) {
    issues.push('Traceability link sourceId is required');
  }
  if (!link.targetId?.trim()) {
    issues.push('Traceability link targetId is required');
  }
  if (!link.relationshipType?.trim()) {
    issues.push('Traceability link relationshipType is required');
  }
  return issues;
}
