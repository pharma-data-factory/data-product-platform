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
