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

export const PRODUCT_TYPES = [
  'DATA_PRODUCT',
  'SERVICE',
  /**
   * The platform itself, managed as a Product (7-R5 / "Nexora manages Nexora").
   * PLATFORM_PRODUCT follows the same lifecycle as all other Products:
   * Requirements → Baselines → Validation → Release Gate.
   */
  'PLATFORM_PRODUCT',
] as const;

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
  /**
   * Policy Pack coordinates this product must satisfy before release.
   * Each entry is `namespace/name@version` pointing at a POLICY_PACK Artifact.
   * The release gate resolves these and adds `POLICY_OBLIGATION_UNMET` blockers.
   * 5-R1 / Phase 5 release gate integration.
   */
  declaredPolicies?: string[];
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

/**
 * A declared quality assertion that must pass before the contract is
 * considered satisfied.
 *
 * The _declaration_ lives here; the _execution_ happens at runtime in the
 * deployed data product (Python SDK `dataprod.quality.run_check`,
 * `dataprod.quality.unique_field_check`). The rule vocabulary maps directly
 * to the check types the SDK implements so that declarations and executions
 * stay in step. Phase 4 (P4-S6).
 */
export const QUALITY_RULE_TYPES = [
  'completeness',  // no nulls / missing values in the named field
  'uniqueness',    // no duplicate values in the named field
  'range',         // numeric value within [min, max]
  'regex',         // string value matches a regular expression
] as const;

export type QualityRuleType = (typeof QUALITY_RULE_TYPES)[number];

export function isQualityRuleType(value: string): value is QualityRuleType {
  return (QUALITY_RULE_TYPES as readonly string[]).includes(value);
}

export interface QualityRule {
  /** Short identifier, unique within the contract. */
  name: string;
  /** What kind of check to run. */
  rule: QualityRuleType;
  /** The field (property name) this rule applies to. */
  field: string;
  /**
   * Rule-specific parameters.
   * - range: `{ min?: number; max?: number }`
   * - regex: `{ pattern: string }`
   * - completeness / uniqueness: unused
   */
  params?: Record<string, unknown>;
  /** Whether a failure here blocks the contract from being satisfied. */
  mandatory: boolean;
}

export interface DataContract {
  id: string;
  productComponentId: string;
  /**
   * Human-readable contract name, unique (case-insensitive) per component.
   *
   * Required on all new contracts. Existing rows created before Phase 4 carry
   * null here; the migration adds the column as nullable so the database does
   * not reject them. The service rejects any new request that omits a name.
   *
   * Phase 4 (P4-S1) — NXD-034. Phase 4 later slices will promote contracts
   * to a first-class namespace so they can be referenced across products.
   */
  name: string;
  /**
   * Who is responsible for this contract (e.g. a group entity ref).
   *
   * Optional for now. The release gate does not yet check it; that is Phase 5.
   */
  owner?: string;
  schemaType: DataContractSchemaType;
  schemaRef?: string;
  contractSpec?: Record<string, unknown>;
  status: DataContractStatus;
  version: string;
  /**
   * Declared quality rules — see `QualityRule`. Phase 4 (P4-S6).
   * Empty array when no quality obligations have been declared.
   */
  qualityRules: QualityRule[];
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  revision: number;
}

/**
 * A declared data dependency between a Product version and a DataContract.
 *
 * ProductDependency answers "which data contracts does this product consume?"
 * It is the Phase 4 mechanism for expressing data exchange: the consuming
 * product declares what it needs, and the platform can check whether the
 * supplying contract still exists and is compatible.
 *
 * Modelled at the ProductVersion level (not the Product level) so that
 * different versions can depend on different contracts, and the baseline
 * snapshot can include the exact dependency state at freeze time.
 *
 * Phase 4 (P4-S3). Subscription semantics (a consumer registering to receive
 * updates) are a later Phase 4 slice — they build on this foundation.
 */
export interface ProductDependency {
  id: string;
  productVersionId: string;
  /** ID of the DataContract this version depends on. */
  contractId: string;
  /** Optional human note about why this dependency exists. */
  description?: string;
  createdBy: string;
  createdAt: Date;
  revision: number;
}

// ── Upgrade Notification (P-EXT-S5) ──────────────────────────────────────────

/**
 * An Upgrade Notification is generated when a DataContract or Artifact that
 * a product depends on has a new version available. It powers the
 * "Upgrade Available" badge and the notification feed.
 *
 * Rather than polling for upgrades, the platform generates notifications
 * at registration time (when a new ArtifactVersion is registered or a
 * DataContract version is bumped). Consumers who have Subscriptions or
 * ProductDependencies receive a notification record they can dismiss.
 */
export const UPGRADE_NOTIFICATION_TYPES = [
  'CONTRACT_VERSION_BUMP',   // new version of a DataContract
  'ARTIFACT_VERSION_BUMP',   // new version of an Artifact
  'BREAKING_CHANGE',         // a change that breaks compatibility
  'DEPRECATION',             // a version is being deprecated
  'SECURITY_UPDATE',         // a security fix is available
] as const;

export type UpgradeNotificationType = (typeof UPGRADE_NOTIFICATION_TYPES)[number];

export interface UpgradeNotification {
  id: string;
  type: UpgradeNotificationType;
  /** The artifact or contract name that changed. */
  subjectName: string;
  /** The new version that is available. */
  newVersion: string;
  /** The version the consumer is currently using, if known. */
  currentVersion?: string;
  /** Human-readable summary of what changed. */
  summary: string;
  /** Whether the change breaks compatibility with the current version. */
  breaking: boolean;
  /** Consumer entity ref this notification is addressed to. */
  consumerRef: string;
  read: boolean;
  createdAt: Date;
}

// ── Contract Subscription (P-EXT-S4) ─────────────────────────────────────────

/**
 * A Subscription represents a consumer's active use of a DataContract.
 *
 * Where ProductDependency is a *declared* design-time dependency ("version A
 * is designed to consume contract B"), a Subscription is an *operational*
 * runtime registration ("team X is currently consuming contract B in
 * production"). Subscriptions power:
 *   - Usage tracking (who is actively consuming)
 *   - Change Impact Notifications (when contract changes, notify subscribers)
 *   - Upgrade pressure (if B releases v2, subscribers are prompted to migrate)
 *   - Consumer SLA (provider knows how many active consumers before deprecating)
 *
 * Phase-EXT-S4.
 */
export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'CANCELLED',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface ContractSubscription {
  id: string;
  /** The DataContract this subscription is for. */
  contractId: string;
  /** Consumer entity ref (e.g. "group:default/team-oee" or a product component ID). */
  consumerRef: string;
  /** Human label for the consuming system, e.g. "OEE Dashboard v2". */
  consumerLabel: string;
  /** Semver range of contract versions the consumer is compatible with. */
  compatibleVersions: string;
  status: SubscriptionStatus;
  /** Why the consumer subscribed — helps the provider understand use cases. */
  purpose?: string;
  createdBy: string;
  createdAt: Date;
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
// VERSION LABELS
// ============================================================================

/**
 * `MAJOR.MINOR` or `MAJOR.MINOR.PATCH`, non-negative, no leading zeros.
 *
 * Leading zeros are rejected on purpose: "01.0" and "1.0" would be two
 * distinct rows naming the same version, and a version label is an identity
 * that baselines, validation contexts and releases point at.
 *
 * Shared by ProductVersion, DataContract and Artifact versions. The name is
 * deliberately neutral: it started out as the Product rule and now governs
 * three concepts. A concept that needs a different grammar (pre-release tags,
 * for instance) should get its own validator rather than widen this one.
 */
const PRODUCT_VERSION_LABEL = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;

export interface VersionLabelParts {
  major: number;
  minor: number;
  patch?: number;
}

export function parseVersionLabel(
  label: string,
): VersionLabelParts | undefined {
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

export function isVersionLabel(label: string): boolean {
  return parseVersionLabel(label) !== undefined;
}

export function validateVersionLabel(label: string): string[] {
  if (!label.trim()) {
    return ['Product version is required'];
  }
  if (!isVersionLabel(label)) {
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
    const parsed = parseVersionLabel(label ?? '');
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
