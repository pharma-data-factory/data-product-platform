/**
 * URS Composer Domain Types
 *
 * Immutable stable identifiers and domain models for:
 * - Business Capabilities
 * - Business Needs
 * - Requirement Sets (URS)
 * - Requirements
 * - Approvals
 * - Audit Events
 * - Relationships
 */


import type { RequirementClassification } from '@internal/platform-common';

/**
 * Solution Types
 * What is being built?
 */
export enum SolutionType {
  PROJECT = 'PROJECT',
  PLUGIN = 'PLUGIN',
  COMPONENT = 'COMPONENT',
  DATA_PRODUCT = 'DATA_PRODUCT',
}

/**
 * Requirement/Requirement Set/Baseline Status
 *
 * Shared across the three entities; which subset an entity may use, and which
 * moves between them are legal, is defined by the transition maps in
 * ./domain/transitions.ts.
 *
 * Requirement version lifecycle:
 *   DRAFT → IN_REVIEW → REVIEWED → IN_APPROVAL → APPROVED
 *   APPROVED → SUPERSEDED | OBSOLETE
 *   IN_REVIEW | IN_APPROVAL → REJECTED
 *
 * Baseline lifecycle:
 *   DRAFT → IN_REVIEW → IN_APPROVAL → APPROVED → SUPERSEDED
 *
 * APPROVED is the released state. The spec calls it `released`; renaming it is
 * pure nomenclature and would reach across plugin boundaries (see
 * composer-backend/src/urs-baseline-resolver.ts), so it is deliberately
 * deferred to its own change.
 */
export enum URSStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  REVIEWED = 'REVIEWED',
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  BASELINED = 'BASELINED',
  SUPERSEDED = 'SUPERSEDED',
  OBSOLETE = 'OBSOLETE',
  REJECTED = 'REJECTED',
  RETIRED = 'RETIRED',
}

/**
 * Approval Status
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAIVED = 'WAIVED',
}

/**
 * Approval Roles
 */
export enum ApprovalRole {
  AUTHOR = 'AUTHOR',
  BUSINESS_REVIEWER = 'BUSINESS_REVIEWER',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  QUALITY_REVIEWER = 'QUALITY_REVIEWER',
  ADMIN = 'ADMIN',
}

/**
 * GxP Relevance
 */
export enum GxPRelevance {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  NONE = 'NONE',
}

/**
 * Requirement Priority
 */
export enum RequirementPriority {
  MUST = 'MUST',
  SHOULD = 'SHOULD',
  COULD = 'COULD',
  WONT = 'WONT',
}

/**
 * Relationship Type
 * Semantic relationships for traceability
 */
export enum RelationshipType {
  ENABLED_BY = 'ENABLED_BY',
  REQUIRES = 'REQUIRES',
  DEFINED_BY = 'DEFINED_BY',
  IMPLEMENTS = 'IMPLEMENTS',
  USES = 'USES',
  VERIFIED_BY = 'VERIFIED_BY',
  PRODUCES = 'PRODUCES',
  TRACES_TO = 'TRACES_TO',
  AFFECTS = 'AFFECTS',
  SUPERSEDES = 'SUPERSEDES',
}

/**
 * Business Capability
 * Reference to canonical business capability
 * (Loaded from capability-matrix.md seed)
 */
export interface BusinessCapability {
  id: string; // business-capability:domain/name
  name: string;
  description: string;
  domain: string;
  source: 'DOCUMENTATION' | 'USER';
  documentationRef?: string;
}

/**
 * Requirement Set (URS)
 * Aggregate containing business context + requirements
 */
export interface RequirementSet {
  id: string; // UUID
  requirementSetId: string; // Human-readable: URS-WD, URS-EQ, etc. (generated server-side)
  versionNumber: number;
  revision?: number; // Optimistic concurrency control

  // BUSINESS LAYER
  businessCapabilityRefs: string[]; // ["business-capability:make/equipment-performance-management"]
  businessNeed: string; // WHY
  desiredOutcome?: string;
  businessValue?: string;
  stakeholders?: string[];
  processContext?: string;

  // SOLUTION CONTEXT
  solutionType: SolutionType;
  solutionName: string;
  solutionCatalogRef?: string; // Optional: component:default/oee

  // SCOPE
  scope?: string;
  outOfScope?: string;

  // REGULATORY
  gxpRelevance?: GxPRelevance;
  patientImpact?: boolean;
  dataIntegrityImpact?: boolean;
  electronicRecords?: boolean;

  // METADATA
  status: URSStatus;
  templateVersion?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  versionComment?: string;
  /** Internal UUID of the predecessor set this version revises. */
  supersedesRef?: string;
}

/**
 * URS Requirement
 * Individual requirement within a requirement set
 */
export interface URSRequirement {
  id: string; // UUID
  requirementSetId: string; // FK to RequirementSet
  requirementId: string; // URS-WD-001, URS-WD-002, etc. (generated server-side)

  // REQUIREMENT DATA
  title: string;
  statement: string; // "The solution shall..."
  rationale?: string; // Why is this required?
  category?: string; // Functional, Non-Functional, etc.
  priority: RequirementPriority;
  acceptanceIntent?: string; // How will you know it's satisfied?

  // CLASSIFICATION
  classification?: RequirementClassification;
  gxpRelevance?: GxPRelevance;
  source?: string;
  owner?: string;

  // STATUS
  status: URSStatus;
  createdBy: string;
  createdAt: Date;
}

/**
 * Approval Record
 * Workflow state for requirement set review
 */
export interface Approval {
  id: string; // UUID
  requirementSetId: string; // FK
  approvalRole: ApprovalRole;
  status: ApprovalStatus;
  approver?: string;
  comment?: string;
  decidedAt?: Date;
  sequenceNumber: number;
}

/**
 * Audit Event
 * Append-only record of significant actions
 */
export interface AuditEvent {
  id: string; // UUID
  entityType:
    | 'REQUIREMENT_SET'
    | 'REQUIREMENT'
    | 'APPROVAL'
    | 'RELATIONSHIP'
    | 'REQUIREMENT_VERSION'
    | 'BASELINE'
    | 'APPROVAL_INSTANCE'
    | 'APPROVAL_STEP'
    | 'BUSINESS_CAPABILITY'
    | 'BUSINESS_ROLE'
    | 'SIGNATURE_CREDENTIAL';
  entityId: string;
  eventType: string;
  // Semantic/string version identifier of the audited entity when relevant
  // (e.g. RequirementVersion.version = "1.0", Baseline.baselineVersion = "1.0").
  // This is NOT the integer `revision`/`versionNumber` optimistic-concurrency
  // counter. Stored as text so audit history is never lossy.
  entityVersion?: string;
  oldValue?: unknown;
  newValue?: unknown;
  actor: string; // Authenticated user
  timestamp: Date;
  correlationId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Relationship
 * Traceability edges for future graph traversal
 */
export interface Relationship {
  id: string; // UUID
  sourceType: string; // BUSINESS_CAPABILITY, URS_REQUIREMENT_SET, SOLUTION, etc.
  sourceId: string;
  relationshipType: RelationshipType;
  targetType: string;
  targetId?: string; // When target is internal
  targetExternalRef?: string; // When target is Catalog ref (component:default/mqtt-consumer)
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Quality Check Result
 */
export interface QualityCheckResult {
  requirementId?: string;
  issue: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  recommendation?: string;
}

/**
 * API Request/Response Types
 */

export interface CreateRequirementSetRequest {
  /**
   * Optional stable business key (e.g. "URS-WD"). When omitted the server
   * generates a timestamp-based key. Supplying it keeps requirement IDs
   * (URS-WD-001, …) stable across environments, which validation documents
   * depend on. Must be unique and match /^URS-[A-Z0-9]{2,12}$/.
   */
  requirementSetId?: string;
  businessCapabilityRefs: string[];
  businessNeed: string;
  desiredOutcome?: string;
  businessValue?: string;
  stakeholders?: string[];
  processContext?: string;
  solutionType: SolutionType;
  solutionName: string;
  solutionCatalogRef?: string;
  gxpRelevance?: GxPRelevance;
  patientImpact?: boolean;
  dataIntegrityImpact?: boolean;
  electronicRecords?: boolean;
  scope?: string;
  outOfScope?: string;
}

export interface UpdateRequirementSetRequest
  extends Partial<CreateRequirementSetRequest> {
  versionComment?: string;
}

export interface CreateRequirementRequest {
  requirementSetId: string;
  title: string;
  statement: string;
  rationale?: string;
  priority: RequirementPriority;
  acceptanceIntent?: string;
  classification?: RequirementClassification;
  gxpRelevance?: GxPRelevance;
  source?: string;
  owner?: string;
}

export interface QualityCheckRequest {
  requirementId?: string;
  title?: string;
  statement?: string;
  gxpRelevance?: GxPRelevance;
}

export interface QualityCheckSetRequest {
  requirementSetId: string;
}

export interface SubmitForReviewRequest {
  reason?: string;
}

export interface ApproveRequest {
  comment?: string;
}

export interface RejectRequest {
  reason: string;
  comment?: string;
}

/**
 * ============================================================================
 * P1A: VERSIONING, BASELINES, AND CONFIGURABLE WORKFLOWS
 * ============================================================================
 */

/**
 * Approval Status (Instance Level)
 */
export enum ApprovalInstanceStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Approval Step Status
 */
export enum ApprovalStepStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SKIPPED = 'SKIPPED',
}

/**
 * Requirement Version
 * Immutable snapshot of a requirement at a point in time
 */
export interface RequirementVersion {
  id: string; // UUID
  requirementId: string; // Logical requirement ID (e.g., URS-OEE-001)
  version: string; // e.g., "1.0", "1.1", "2.0"
  versionNumber: number; // numeric for comparison

  // Structured version number. Computed server-side by ./domain/versioning and
  // never accepted from a client. `version` carries the same label and is kept
  // for readers that predate these fields.
  major?: number;
  minor?: number;
  versionLabel?: string;

  // Content
  title: string;
  statement: string;
  rationale?: string;
  category?: string;
  priority: RequirementPriority;
  acceptanceIntent?: string;

  // Classification
  classification?: RequirementClassification;
  gxpRelevance?: GxPRelevance;
  source?: string;
  owner?: string;

  // Versioning metadata
  status: URSStatus; // DRAFT, IN_REVIEW, APPROVED, SUPERSEDED, RETIRED
  revisionOf?: string; // ID of previous version if this is a revision
  revisionReason?: string;
  supersededBy?: string; // ID of version that superseded this

  // Audit
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  /** Set when the version reaches APPROVED; the effective date of the record. */
  releasedAt?: Date;
  /**
   * SHA-256 over the signed content, from computeContentHash in
   * @internal/platform-common. Bound to every signature on this version.
   */
  contentHash?: string;
  revision: number; // Optimistic concurrency control
}

/**
 * What a signatory is attesting to.
 *
 * The meanings are ordered: a version is authored, then reviewed, then
 * approved by quality. Each is a distinct statement by a distinct person
 * (see the segregation-of-duties rules in domain/signature-service.ts).
 */
export enum SignatureMeaning {
  AUTHORED = 'AUTHORED',
  REVIEWED = 'REVIEWED',
  APPROVED_QA = 'APPROVED_QA',
}

/** What a signature can be applied to. */
export enum SignatureTargetType {
  REQUIREMENT_VERSION = 'REQUIREMENT_VERSION',
  BASELINE = 'BASELINE',
}

/**
 * An electronic signature (21 CFR Part 11 / EU Annex 11).
 *
 * Append-only: enforced by a database trigger, not just by convention.
 */
export interface Signature {
  id: string;
  targetType: SignatureTargetType;
  targetId: string;
  meaning: SignatureMeaning;
  /** Entity ref of the signatory, e.g. "user:default/jane". */
  signedBy: string;
  signedAt: Date;
  /**
   * The content hash as it stood when this signature was applied. Recomputing
   * the hash later and finding a difference proves the record was altered
   * after signing.
   */
  contentHashAtSigning: string;
  comment?: string;
}

/**
 * A user's signing credential.
 *
 * The secret itself is never stored; only a salted scrypt hash.
 */
export interface SignatureCredential {
  userRef: string;
  pinHash: string;
  salt: string;
  algo: string;
  createdAt: Date;
  updatedAt?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
}

/**
 * Baseline
 * Immutable snapshot of a requirement set at a specific point (approval)
 */
export interface Baseline {
  id: string; // UUID
  requirementSetId: string;
  baselineVersion: string; // e.g., "1.0", "1.1"
  status: URSStatus; // DRAFT, APPROVED, SUPERSEDED, RETIRED

  // References to exact requirement versions
  requirementVersionIds: string[]; // List of RequirementVersion IDs

  // Metadata
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  supersededBy?: string; // Baseline ID that superseded this
  approvalInstanceId?: string; // Linked ApprovalInstance when submitted for approval

  revision: number; // Optimistic concurrency
}

/**
 * Approval Workflow Definition
 * Template for approval process
 */
export interface ApprovalWorkflow {
  id: string; // e.g., "standard-gxp-urs", "non-gxp-urs"
  name: string;
  description?: string;

  steps: WorkflowStep[];

  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Workflow Step Definition
 */
export interface WorkflowStep {
  sequence: number;
  role: ApprovalRole;
  required: boolean;
  allowSkip?: boolean;
}

/**
 * Approval Instance
 * Concrete approval workflow execution for a specific baseline
 */
export interface ApprovalInstance {
  id: string; // UUID
  workflowId: string; // Reference to ApprovalWorkflow
  baselineId: string; // Reference to Baseline
  status: ApprovalInstanceStatus;

  currentStepSequence: number;

  // Audit
  startedBy: string;
  startedAt: Date;
  completedBy?: string;
  completedAt?: Date;

  steps: ApprovalStep[];

  revision: number; // Optimistic concurrency
}

/**
 * Approval Step Instance
 * A step within an approval instance
 */
export interface ApprovalStep {
  id: string; // UUID
  approvalInstanceId: string; // Reference to ApprovalInstance
  sequence: number;
  role: ApprovalRole;
  status: ApprovalStepStatus;
  /**
   * Whether this step must be decided before the instance can complete.
   * Persisted, because approveApprovalStep derives "is this the final step?"
   * from it — an unpersisted value silently collapses multi-step workflows.
   */
  required?: boolean;

  assignedTo?: string; // User entity ref
  decision?: 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment?: string;

  actedBy?: string; // User who took action
  actedAt?: Date;
}

/**
 * Business Capability (P1A: Persisted)
 */
export interface BusinessCapabilityPersisted extends BusinessCapability {
  id: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'RETIRED';
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
  version: number; // For optimistic concurrency
}

/**
 * Business Role (P1B: Persisted)
 *
 * The executing roles that perform a business capability (e.g. "Weighing
 * Operator", "Line Lead"). Attached to a URS via `RequirementSet.stakeholders`.
 */
export interface BusinessRolePersisted {
  id: string; // role:<slug>
  name: string;
  description?: string;
  status: 'ACTIVE' | 'RETIRED';
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;
}

/**
 * API Request/Response Types for P1A
 */

export interface CreateRevisionRequest {
  revisionReason: string;
}

export interface CreateBaselineRequest {
  baselineVersion?: string; // Optional; auto-generated if not provided
  requirementVersionIds: string[];
}

export interface ApproveApprovalStepRequest {
  comment?: string;
}

export interface RejectApprovalStepRequest {
  reason: string;
  comment?: string;
}

/**
 * ============================================================================
 * CHANGE SET — Delta between two URS Baselines
 * ============================================================================
 */

export type ChangeType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';

export interface RequirementChange {
  requirementId: string;
  changeType: ChangeType;
  previousVersion?: RequirementVersion;
  currentVersion?: RequirementVersion;
  changedFields?: string[];
}

export interface ChangeSet {
  id: string;
  baselineId: string;
  previousBaselineId?: string;
  baselineVersion: string;
  previousBaselineVersion?: string;
  changes: RequirementChange[];
  summary: {
    added: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
  computedAt: Date;
  computedBy: string;
}
