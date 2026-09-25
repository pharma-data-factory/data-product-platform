/**
 * Product Composer domain model: a Data Product or Service defined as a
 * Blackbox of typed components, with versioned definitions and data contracts.
 *
 * Distinct from the commercial `CommercialProduct` model and from the Catalog
 * `data-product.*` permissions — this is the persisted Product Composer model.
 */

import {
  ComponentType,
  DATA_CLASSIFICATIONS,
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

/**
 * GxP relevance a Product may declare, least to most involved.
 *
 * The same three values the URS domain uses, named here so the product side
 * has one vocabulary instead of a free string. The release gate already treats
 * anything other than `NONE` as GxP-relevant
 * (`gxpRelevance && gxpRelevance !== 'NONE'`), so `NONE` is a stated answer and
 * not the absence of one — which is the whole point of the
 * `gxp-relevance-declared` obligation.
 *
 * `Product.gxpRelevance` stays `string`: the column is free-form and holds rows
 * written before this list existed, and nothing relabels a stored classification
 * unattended (the rule NXD-009 set for version labels).
 *
 * That is a statement about *reading*. It was mistaken for one about writing:
 * `POST /products` with `gxpRelevance: 'TOTALLY_MADE_UP_VALUE'` returned 201 and
 * stored it, on the field that classifies regulatory relevance — and because the
 * release gate only asks whether the field is set, the garbage *satisfied*
 * `gxp-relevance-set`. Found by running the API, not by a test. New writes are
 * now checked against this list in `validateProductGovernance`; the type and the
 * existing rows are untouched.
 */
export const GXP_RELEVANCE_LEVELS = ['NONE', 'INDIRECT', 'DIRECT'] as const;

export type GxpRelevanceLevel = (typeof GXP_RELEVANCE_LEVELS)[number];

/** Criticality a Product may declare. Required once it is GxP-relevant. */
export const PRODUCT_CRITICALITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export type ProductCriticality = (typeof PRODUCT_CRITICALITIES)[number];

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

/**
 * Where a Product Requirement came from.
 *
 * Only `PRODUCT` is produced today — a requirement inherited from the approved
 * URS baseline the version is bound to. The other two exist so the Effective
 * Requirement Set named in `PRODUCT_STRATEGY.md` has somewhere to grow without
 * a second migration: `ORGANIZATION` for requirements every product in the
 * organisation carries, `ARTIFACT` for requirements an Artifact brings with it
 * (`ArtifactManifest.spec.requirements`). Reading code must not assume the set
 * is single-origin.
 */
export const REQUIREMENT_ORIGINS = [
  'PRODUCT',
  'ORGANIZATION',
  'ARTIFACT',
] as const;

export type RequirementOrigin = (typeof REQUIREMENT_ORIGINS)[number];

/**
 * The verification/validation state of one requirement, as the Product sees it.
 *
 * Two independent axes, deliberately not collapsed into one status —
 * `NEXORA_STRATEGY.md`: "Engineering Verification and formal Pharma Validation
 * are separate but traceable." A requirement can be verified by a CI test and
 * still not be formally validated, and that difference is the whole point.
 */
export const REQUIREMENT_MAPPING_STATES = ['MAPPED', 'UNMAPPED'] as const;

export type RequirementMappingState =
  (typeof REQUIREMENT_MAPPING_STATES)[number];

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
  /**
   * Where the code lives, and which Catalog entity describes it.
   *
   * Both are written once, by the `nexora:product:create` scaffolder action,
   * from the repository the task published and the entity it registered. Step 2
   * of the URS → Product roadmap: until it landed, a Product and the Catalog
   * entity for the same thing had no identity in common, so `/products` could
   * not show a repository and `/data-products` could not find its governance.
   *
   * Optional, and that is a decision rather than an oversight. A Product may
   * still be created by `POST /products`, by applying an AI spec draft, or by
   * the platform bootstrap, and none of those has a repository. "One door"
   * means one path that produces a whole product, not the abolition of the
   * others — so absence here means "not created from a template", which the
   * Development tab says in as many words.
   */
  repositoryUrl?: string;
  /**
   * `kind:namespace/name` of the Catalog entity. Unique across products where
   * it is set, in the database as well as the service (NXD-009): two products
   * claiming one entity is exactly the ambiguity this field exists to remove.
   */
  catalogEntityRef?: string;
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
  /**
   * The approved URS baseline this version implements.
   *
   * Set once, by `bindUrsBaseline`, which also snapshots the baseline's
   * requirements into `ProductRequirement` rows. Distinct from `baselineId`
   * above, which points at a *ProductBaseline* — two unrelated things that have
   * shared the word "baseline" in this domain since Phase 1.
   *
   * Nullable because a product may legitimately exist before it is bound; the
   * release gate is where the binding becomes mandatory.
   */
  ursBaselineId?: string;
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

// ============================================================================
// PROVIDER-NEUTRAL EXCHANGE
// ============================================================================

/**
 * How a consumer is granted access to the data a contract describes.
 *
 * A closed set, unlike the delivery mechanism, because these three are
 * statements about governance rather than about technology, and a fourth would
 * mean a new governance concept rather than a new transport.
 */
export const CONTRACT_ACCESS_MODES = [
  /** Anyone who can see the contract may consume it. */
  'OPEN',
  /** Consumption requires an agreement with the owner, arranged out of band. */
  'REQUEST',
  /** Consumption is governed by the entitlement system. */
  'ENTITLEMENT',
] as const;

export type ContractAccessMode = (typeof CONTRACT_ACCESS_MODES)[number];

/** What the producer commits to. Every field optional: a contract may promise nothing. */
export interface ContractSla {
  /** Availability as a percentage, e.g. 99.5. */
  availabilityPercent?: number;
  /** Upper bound on delivery latency. */
  maxLatencySeconds?: number;
  /** How stale the data may be before it breaks the promise. */
  freshnessSeconds?: number;
  /** Free text, e.g. "24x7" or "Mon-Fri 08:00-18:00 CET". */
  supportHours?: string;
}

/**
 * How the data described by a contract is actually obtained.
 *
 * Phase 4's "provider-neutral exchange definitions". Provider-neutral is the
 * whole point and it is why `deliveryMechanism` is a **string, not an enum**:
 * `ProductComponent.interfaceType` is a closed set (`REST | EVENT | MQTT |
 * KAFKA | DB | FILE`), so adding a transport there means changing Core. The
 * strategy says exchange technologies are providers, not Nexora domain truth,
 * so a team publishing over something Core has never heard of must not need a
 * Core release. The validator therefore checks the *shape* of the value, never
 * its membership in a list.
 *
 * `endpoint` is deliberately opaque: its meaning belongs to the mechanism (a
 * URL for `rest`, a topic for `kafka`, a bucket path for `s3-parquet`). Core
 * stores and returns it and makes no claim about it.
 */
export interface ContractExchange {
  /**
   * Lowercase kebab-case identifier of the transport, e.g. `rest`, `kafka`,
   * `mqtt`, `s3-parquet`. Open vocabulary — see above.
   */
  deliveryMechanism: string;
  /** Mechanism-specific locator. Opaque to Core. */
  endpoint?: string;
  /** How access is granted. Defaults to `REQUEST` when unstated. */
  accessMode?: ContractAccessMode;
  /**
   * Sensitivity of the data flowing over this contract. Reuses the platform
   * classification rather than introducing a second scale.
   */
  classification?: DataClassification;
  /** Producer commitments, if any. */
  sla?: ContractSla;
}

export function isContractAccessMode(
  value: string,
): value is ContractAccessMode {
  return (CONTRACT_ACCESS_MODES as readonly string[]).includes(value);
}

/**
 * Why `exchange` is not usable, or `[]` if it is.
 *
 * Validates shape, not vocabulary. An unknown `deliveryMechanism` is accepted
 * by design; a malformed one is not, because the value is an identifier that
 * consumers match on.
 */
export function validateContractExchange(
  exchange: ContractExchange,
): string[] {
  const issues: string[] = [];

  issues.push(
    ...validateNameSegment(
      String(exchange.deliveryMechanism ?? ''),
      'deliveryMechanism',
    ),
  );

  if (
    exchange.accessMode !== undefined &&
    !isContractAccessMode(exchange.accessMode)
  ) {
    issues.push(
      `Unknown accessMode "${exchange.accessMode}". Supported: ` +
        `${CONTRACT_ACCESS_MODES.join(', ')}`,
    );
  }

  if (
    exchange.classification !== undefined &&
    !(DATA_CLASSIFICATIONS as readonly string[]).includes(
      exchange.classification,
    )
  ) {
    issues.push(
      `Unknown classification "${exchange.classification}". Supported: ` +
        `${DATA_CLASSIFICATIONS.join(', ')}`,
    );
  }

  const sla = exchange.sla;
  if (sla) {
    const { availabilityPercent } = sla;
    if (
      availabilityPercent !== undefined &&
      (typeof availabilityPercent !== 'number' ||
        availabilityPercent < 0 ||
        availabilityPercent > 100)
    ) {
      issues.push('sla.availabilityPercent must be a number between 0 and 100');
    }
    for (const key of ['maxLatencySeconds', 'freshnessSeconds'] as const) {
      const value = sla[key];
      if (value !== undefined && (typeof value !== 'number' || value < 0)) {
        issues.push(`sla.${key} must be a non-negative number`);
      }
    }
  }

  return issues;
}

export interface DataContract {
  id: string;
  /**
   * The component that provides this contract.
   *
   * A relation, not the identity. Until Slice 1 of the phase-closure plan a
   * contract was keyed by this column, so it could not be named from outside
   * the component that happened to declare it. Identity is now
   * `namespace/name@version` — see `contractRef`.
   */
  productComponentId: string;
  /**
   * Owning namespace, the first segment of the contract's coordinate.
   *
   * Lowercase kebab-case, same grammar as an Artifact namespace. This is what
   * makes a contract referenceable from another Product: a consumer writes
   * down `namespace/name@version`, which survives the producer moving the
   * contract to a different component.
   */
  namespace: string;
  /**
   * Contract name, the second segment of the coordinate.
   *
   * Lowercase kebab-case. Unique per `(namespace, name, version)`, not per
   * component — two components may no longer both declare `orders` in the same
   * namespace at the same version, because that would make the coordinate
   * ambiguous.
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
  /**
   * How consumers obtain this data — Phase 4's provider-neutral exchange
   * definition. Optional so that contracts predating it stay valid; the
   * release gate is where it becomes required, not the model.
   */
  exchange?: ContractExchange;
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

/**
 * One requirement, as held by a Product Version.
 *
 * A **copy**, not a reference. The product implements the requirements in the
 * wording they had when it was bound, which is what makes "which text was
 * tested?" answerable in an inspection — the question a pointer into a living
 * URS cannot answer. `contentHash` carries the URS side's own SHA-256 over the
 * signed content, so the copy can be proven to be that wording and no other.
 *
 * Rows are written once by `bindUrsBaseline` and never updated. A revised URS
 * baseline produces a new binding on a new version, not an edit here.
 */
export interface ProductRequirement {
  id: string;
  productVersionId: string;
  /** The URS baseline this row was snapshotted from. */
  ursBaselineId: string;
  /**
   * The URS `RequirementVersion.id` — the exact immutable version pinned by
   * the baseline. Unique per product version; this is the identity key.
   */
  ursRequirementVersionId: string;
  /**
   * The URS `RequirementVersion.requirementId` — the stable logical id a human
   * says out loud, e.g. `URS-OEE-014`. Not unique across versions of the same
   * requirement, so it is the *display* and *join* key, never the identity.
   *
   * This is also the key the Validation Expert speaks: `ValidationContext`
   * carries stable logical ids, not version UUIDs.
   */
  requirementRef: string;
  title: string;
  statement: string;
  category?: string;
  priority?: string;
  /**
   * The URS side's GxP classification, carried through so verification and
   * validation can be required proportionally rather than uniformly. GAMP 5 is
   * risk-based; a gate that demands formal validation of every requirement
   * regardless of relevance gets routed around.
   */
  gxpRelevance?: string;
  /** The requirement version label, e.g. `2.0`. */
  versionLabel?: string;
  /** SHA-256 over the signed URS content. Absent on requirements that predate it. */
  contentHash?: string;
  origin: RequirementOrigin;
  /** Position within the baseline, so the product lists them in URS order. */
  position: number;
  createdBy: string;
  createdAt: Date;
}

/** One row of the requirement coverage report. */
export interface ProductRequirementCoverageRow {
  requirementRef: string;
  ursRequirementVersionId: string;
  title: string;
  gxpRelevance?: string;
  origin: RequirementOrigin;
  /** Engineering: components this requirement is mapped to via `IMPLEMENTS`. */
  mapping: RequirementMappingState;
  componentIds: string[];
  /**
   * Engineering verification: components linked by `VERIFIED_BY`, and tests
   * the Validation Expert has executed against this requirement id.
   */
  verified: boolean;
  /** Protocol test ids from the Validation Context, when one is resolvable. */
  testIds: string[];
  runIds: string[];
  findingIds: string[];
  /**
   * Formal validation: the requirement is covered by an executed protocol test
   * *and* its Validation Context carries an APPROVED ValidationDecision.
   * `undefined` when no context could be resolved — unknown, not false.
   */
  validated?: boolean;
}

/**
 * Requirement coverage for one Product Version.
 *
 * Replaces nothing — `getProductTraceability` still reports *component*
 * coverage, which answers a different question ("does every component trace to
 * something?"). This answers the regulated one: "is every requirement
 * implemented, verified and validated?"
 */
export interface ProductRequirementCoverage {
  productVersionId: string;
  ursBaselineId?: string;
  total: number;
  mapped: number;
  unmapped: number;
  verified: number;
  validated: number;
  /**
   * Absent when no ValidationContext could be resolved for the bound baseline.
   * Distinguishes "not validated" from "we could not find out", which the
   * release gate and the UI must not conflate.
   */
  validationContextId?: string;
  byRequirement: ProductRequirementCoverageRow[];
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

/**
 * What the release build asserts about the artifact a baseline describes.
 *
 * Phase 5 names the chain "CI evidence -> ProductBaseline". Until closure
 * Slice 3 the two provenance fields existed on `ProductVersion` and were
 * copied into the baseline snapshot, but nothing ever wrote them: the only
 * writers were a request body and that copy, so a field meant to identify the
 * exact build was whatever a human last typed. These are written by the system
 * that produced the artifact and by nothing else.
 *
 * Deliberately **not** part of `snapshot`. That object carries a
 * `_provenance.snapshotChecksum` (P-EXT-S1) computed over its own canonical
 * JSON; writing CI evidence into it after the baseline exists would invalidate
 * the checksum the block exists to provide. Snapshot tamper-evidence and build
 * provenance are two different claims and stay in two different places.
 */
export interface ReleaseProvenance {
  /** Commit the release artifact was built from. */
  releaseCommitSha: string;
  /** Content digest of the published artifact, `sha256:<64 hex>`. */
  artifactDigest: string;
  /** When CI recorded this. ISO-8601. */
  provenanceTimestamp: string;
  /** Service principal that posted it. Never a human. */
  provenanceRecordedBy?: string;
}

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
  /**
   * Build evidence from CI. Absent until a release build posts it — absent
   * rather than null so "not built yet" stays distinguishable from
   * "explicitly unknown", the same distinction P5-S5 drew in the snapshot.
   */
  provenance?: ReleaseProvenance;
  revision: number;
}

/** A 40-hex git SHA-1, or a 64-hex SHA-256 for repositories that have moved. */
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/;

/** OCI content digest as `docker/build-push-action` emits it. */
const ARTIFACT_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

/**
 * Why this provenance is not recordable, or `[]` if it is.
 *
 * Both values are checked against a grammar rather than merely for presence,
 * which is the opposite of the choice made for baseline *labels* (NXD-007) —
 * and for the opposite reason. A baseline label often has to match a document
 * number in an external QMS, so Nexora cannot impose a shape on it. A commit
 * SHA and an artifact digest have exactly one shape each, both machine-issued,
 * and a malformed one means the CI step is broken. Accepting it would put an
 * unresolvable reference into a controlled record.
 */
export function validateReleaseProvenance(input: {
  releaseCommitSha?: unknown;
  artifactDigest?: unknown;
}): string[] {
  const issues: string[] = [];

  const sha = typeof input.releaseCommitSha === 'string' ? input.releaseCommitSha.trim() : '';
  if (!sha) {
    issues.push('releaseCommitSha is required');
  } else if (!COMMIT_SHA_PATTERN.test(sha.toLowerCase())) {
    issues.push(
      `releaseCommitSha "${sha}" is not a full commit SHA. Expected 40 or 64 ` +
        'hex characters — an abbreviated SHA is ambiguous and cannot be ' +
        'resolved back to one commit years later.',
    );
  }

  const digest = typeof input.artifactDigest === 'string' ? input.artifactDigest.trim() : '';
  if (!digest) {
    issues.push('artifactDigest is required');
  } else if (!ARTIFACT_DIGEST_PATTERN.test(digest.toLowerCase())) {
    issues.push(
      `artifactDigest "${digest}" is not an OCI content digest. Expected ` +
        '"sha256:" followed by 64 hex characters.',
    );
  }

  return issues;
}

/**
 * Whether two provenance records make the same claim.
 *
 * A release build can re-run — a retried job, a re-pushed tag — and post the
 * same evidence twice. That is not a conflict. A *different* SHA or digest for
 * one baseline is, because only one of them can describe the artifact that was
 * validated.
 */
export function isSameProvenance(
  a: Pick<ReleaseProvenance, 'releaseCommitSha' | 'artifactDigest'>,
  b: Pick<ReleaseProvenance, 'releaseCommitSha' | 'artifactDigest'>,
): boolean {
  return (
    a.releaseCommitSha.toLowerCase() === b.releaseCommitSha.toLowerCase() &&
    a.artifactDigest.toLowerCase() === b.artifactDigest.toLowerCase()
  );
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
// COORDINATE SEGMENTS
// ============================================================================

/**
 * Lowercase kebab-case, no leading, trailing or doubled separator.
 *
 * The grammar for one segment of a platform coordinate — the `namespace` and
 * `name` of `namespace/name@version`. Lowercase because a coordinate is an
 * identity: `Orders` and `orders` naming two different things is a defect
 * waiting to happen, and naming the same thing means every comparison has to
 * remember to fold case.
 *
 * It lives here rather than in `artifact.ts` because `artifact.ts` already
 * imports this module for version labels; putting the shared grammar in the
 * lower layer keeps the dependency one-way. `isArtifactSegment` delegates to
 * it, so Artifacts and DataContracts cannot drift apart on what a valid name
 * is.
 */
const COORDINATE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const COORDINATE_SEGMENT_MAX_LENGTH = 64;

export function isNameSegment(value: string): boolean {
  return (
    value.length <= COORDINATE_SEGMENT_MAX_LENGTH &&
    COORDINATE_SEGMENT.test(value)
  );
}

/**
 * Why `value` is not a usable coordinate segment, or `[]` if it is.
 *
 * Returns the reason rather than a boolean so callers can put it in front of
 * the person who typed it. `label` names the field, so one validator serves
 * both halves of a coordinate.
 */
export function validateNameSegment(value: string, label: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [`${label} is required`];
  }
  if (trimmed.length > COORDINATE_SEGMENT_MAX_LENGTH) {
    return [
      `${label} "${trimmed}" is longer than ${COORDINATE_SEGMENT_MAX_LENGTH} characters`,
    ];
  }
  if (!isNameSegment(trimmed)) {
    return [
      `${label} "${trimmed}" must be lowercase kebab-case: letters and digits ` +
        `separated by single hyphens, e.g. "order-events"`,
    ];
  }
  return [];
}

// ============================================================================
// CATALOG ENTITY REFERENCE
// ============================================================================

/**
 * One part of an entity reference, by Backstage's grammar and not this file's.
 *
 * Deliberately **not** `COORDINATE_SEGMENT`. That grammar is lowercase
 * kebab-case because a platform coordinate is an identity this repository
 * issues; an entity ref is an identity the *Catalog* issues, and it permits
 * dots, underscores and mixed case. Validating it more strictly than the
 * Catalog does would mean refusing to record an entity that demonstrably
 * exists — the field would reject the very thing it is there to point at.
 *
 * Length and character set follow `@backstage/catalog-model`'s own rule.
 */
const ENTITY_REF_PART = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const ENTITY_REF_PART_MAX_LENGTH = 63;

/** Split `kind:namespace/name`, or `undefined` if it is not one. */
export function parseCatalogEntityRef(
  value: string,
): { kind: string; namespace: string; name: string } | undefined {
  const [kindPart, rest] = value.split(':', 2);
  if (!rest) {
    return undefined;
  }
  const [namespace, name, ...extra] = rest.split('/');
  if (extra.length > 0) {
    return undefined;
  }
  const parts = [kindPart, namespace, name];
  if (
    parts.some(
      part =>
        !part ||
        part.length > ENTITY_REF_PART_MAX_LENGTH ||
        !ENTITY_REF_PART.test(part),
    )
  ) {
    return undefined;
  }
  return { kind: kindPart, namespace, name };
}

/**
 * Why `value` is not a usable entity reference, or `[]` if it is.
 *
 * The full `kind:namespace/name` form only. Backstage's own parser defaults a
 * missing kind or namespace, and this field must not: it is written by a
 * scaffolder action from `catalog:register`'s output, which is always complete,
 * and a stored ref that needs defaults applied to be understood is a ref that
 * two readers can resolve differently.
 */
export function validateCatalogEntityRef(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return ['catalogEntityRef is required'];
  }
  if (!parseCatalogEntityRef(trimmed)) {
    return [
      `catalogEntityRef "${trimmed}" must be a full entity reference of the ` +
        `form kind:namespace/name, e.g. "component:default/oee-data-product"`,
    ];
  }
  return [];
}

// ============================================================================
// CONTRACT COORDINATES
// ============================================================================

/** A specific DataContract at a specific version: `namespace/name@version`. */
export interface ContractCoordinate {
  namespace: string;
  name: string;
  version: string;
}

/**
 * The coordinate of a contract, as a string.
 *
 * This is what a consumer in another Product writes down. It deliberately does
 * not mention the component or the Product that provides the contract: those
 * are relations that may change, and a reference that breaks when a producer
 * reorganises its components is not a stable reference.
 */
export function contractRef(coordinate: ContractCoordinate): string {
  return `${coordinate.namespace}/${coordinate.name}@${coordinate.version}`;
}

/**
 * The coordinate a ref names, or nothing if the string does not name one.
 *
 * Same shape and the same all-or-nothing contract as `parseArtifactRef`:
 * callers get a coordinate or nothing, never a half-parsed value that turns
 * out later not to identify anything.
 */
export function parseContractRef(ref: string): ContractCoordinate | undefined {
  const match = /^([^/@]+)\/([^/@]+)@(.+)$/.exec(ref.trim());
  if (!match) {
    return undefined;
  }
  const [, namespace, name, version] = match;
  if (
    !isNameSegment(namespace) ||
    !isNameSegment(name) ||
    !parseVersionLabel(version)
  ) {
    return undefined;
  }
  return { namespace, name, version };
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

/**
 * Vocabulary checks for the governance fields a write may carry.
 *
 * Each is optional — absence is not an error here, because the release gate is
 * what decides a field is *required*, and it says so per obligation with a
 * message a reviewer can act on. What this refuses is a value outside the
 * vocabulary, which the gate cannot catch: `gxpRelevance: 'MAYBE'` is not an
 * unmet obligation, it reads as a declared answer and satisfies
 * `gxp-relevance-set`.
 *
 * Separated from `validateProduct`'s identity checks so `updateProduct` can
 * apply it to a partial payload without demanding name and productType again.
 */
export function validateProductGovernance(product: {
  gxpRelevance?: string;
  criticality?: string;
  lifecycle?: string;
  dataClassification?: string;
}): string[] {
  const issues: string[] = [];
  const check = (
    value: string | undefined,
    allowed: readonly string[],
    field: string,
  ) => {
    if (value !== undefined && !allowed.includes(value)) {
      issues.push(
        `Unsupported ${field}: ${value}. Expected one of ${allowed.join(', ')}`,
      );
    }
  };
  check(product.gxpRelevance, GXP_RELEVANCE_LEVELS, 'gxpRelevance');
  check(product.criticality, PRODUCT_CRITICALITIES, 'criticality');
  check(product.lifecycle, PRODUCT_LIFECYCLES, 'lifecycle');
  check(product.dataClassification, DATA_CLASSIFICATIONS, 'dataClassification');
  return issues;
}

export function validateProduct(product: {
  name?: string;
  productType?: string;
  gxpRelevance?: string;
  criticality?: string;
  lifecycle?: string;
  dataClassification?: string;
}): string[] {
  const issues: string[] = [];
  if (!product.name?.trim()) {
    issues.push('Product name is required');
  }
  if (!product.productType || !isProductType(product.productType)) {
    issues.push(`Unsupported productType: ${product.productType ?? ''}`);
  }
  issues.push(...validateProductGovernance(product));
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

export function isRequirementOrigin(value: string): value is RequirementOrigin {
  return (REQUIREMENT_ORIGINS as readonly string[]).includes(value);
}

/**
 * Presence and vocabulary checks on a requirement about to be snapshotted.
 *
 * Deliberately not a content check: the URS Composer already validated,
 * reviewed and signed this text, and re-judging it here would put a second
 * opinion in front of an approved record. What this catches is a resolver that
 * handed back something unusable — a requirement with no stable id cannot be
 * mapped, verified or traced, so storing it would create a row that looks like
 * coverage and can never be satisfied.
 */
export function validateProductRequirement(requirement: {
  ursBaselineId?: string;
  ursRequirementVersionId?: string;
  requirementRef?: string;
  title?: string;
  origin?: string;
}): string[] {
  const issues: string[] = [];
  if (!requirement.ursBaselineId?.trim()) {
    issues.push('Product requirement ursBaselineId is required');
  }
  if (!requirement.ursRequirementVersionId?.trim()) {
    issues.push('Product requirement ursRequirementVersionId is required');
  }
  if (!requirement.requirementRef?.trim()) {
    issues.push(
      'Product requirement requirementRef is required — a requirement with ' +
        'no stable URS id cannot be mapped to a component or a test',
    );
  }
  if (!requirement.title?.trim()) {
    issues.push('Product requirement title is required');
  }
  if (!requirement.origin || !isRequirementOrigin(requirement.origin)) {
    issues.push(
      `Unsupported requirement origin: ${requirement.origin ?? ''}`,
    );
  }
  return issues;
}
