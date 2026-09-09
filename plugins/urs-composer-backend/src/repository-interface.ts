/**
 * URS Repository Interface
 * 
 * Abstraction layer supporting both P0 in-memory and P1A PostgreSQL implementations
 */

import {
  RequirementSet,
  URSRequirement,
  RequirementVersion,
  Baseline,
  ApprovalWorkflow,
  ApprovalInstance,
  ApprovalStep,
  Approval,
  AuditEvent,
  BusinessCapabilityPersisted,
  BusinessRolePersisted,
  Signature,
  SignatureCredential,
  SignatureTargetType,
} from './types';

export interface IURSRepository {
  // ============================================================================
  // BUSINESS CAPABILITIES (Persisted in P1A)
  // ============================================================================

  createBusinessCapability(cap: BusinessCapabilityPersisted): Promise<BusinessCapabilityPersisted>;
  getBusinessCapability(id: string): Promise<BusinessCapabilityPersisted | null>;
  listBusinessCapabilities(limit: number, offset: number): Promise<{
    items: BusinessCapabilityPersisted[];
    total: number;
  }>;
  updateBusinessCapability(
    cap: BusinessCapabilityPersisted,
  ): Promise<BusinessCapabilityPersisted>;
  retireBusinessCapability(
    id: string,
    actor: string,
  ): Promise<BusinessCapabilityPersisted>;

  // ============================================================================
  // BUSINESS ROLES (P1B)
  // ============================================================================

  createBusinessRole(role: BusinessRolePersisted): Promise<BusinessRolePersisted>;
  getBusinessRole(id: string): Promise<BusinessRolePersisted | null>;
  listBusinessRoles(limit: number, offset: number): Promise<{
    items: BusinessRolePersisted[];
    total: number;
  }>;
  updateBusinessRole(role: BusinessRolePersisted): Promise<BusinessRolePersisted>;
  retireBusinessRole(id: string, actor: string): Promise<BusinessRolePersisted>;

  // ============================================================================
  // REQUIREMENT SETS (P0 CRUD, preserved for backward compatibility)
  // ============================================================================

  createRequirementSet(set: RequirementSet): Promise<RequirementSet>;
  getRequirementSet(id: string): Promise<RequirementSet | null>;

  /**
   * Look up a requirement set by its human-readable key
   * (`requirementSetId`, e.g. "URS-WD"), as opposed to the internal UUID.
   */
  findRequirementSetByKey(requirementSetId: string): Promise<RequirementSet | null>;

  listRequirementSets(limit: number, offset: number): Promise<{
    items: RequirementSet[];
    total: number;
  }>;
  updateRequirementSet(set: RequirementSet): Promise<void>;

  // ============================================================================
  // REQUIREMENT VERSIONS (P1A: New versioning model)
  // ============================================================================

  createRequirementVersion(version: RequirementVersion): Promise<RequirementVersion>;
  getRequirementVersion(id: string): Promise<RequirementVersion | null>;
  
  /**
   * Get all versions for a logical requirement
   * Ordered by version number (ascending by default)
   */
  getRequirementVersions(
    requirementId: string,
    orderBy?: 'asc' | 'desc',
  ): Promise<RequirementVersion[]>;

  /**
   * Get the current approved version for a logical requirement
   */
  getCurrentApprovedVersion(requirementId: string): Promise<RequirementVersion | null>;

  /**
   * Update version status (used for supersession, approval, retirement)
   */
  updateRequirementVersion(version: RequirementVersion): Promise<void>;

  /**
   * Batch-load requirement versions by their UUIDs.
   * Used for efficient baseline delta computation.
   */
  getRequirementVersionsByIds(ids: string[]): Promise<RequirementVersion[]>;

  // ============================================================================
  // BASELINES (P1A: Immutable requirement set snapshots)
  // ============================================================================

  createBaseline(baseline: Baseline): Promise<Baseline>;
  getBaseline(id: string): Promise<Baseline | null>;

  /**
   * Get baselines for a requirement set
   */
  listBaselines(
    requirementSetId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: Baseline[]; total: number }>;

  /**
   * Get current approved baseline (if any)
   */
  getCurrentApprovedBaseline(requirementSetId: string): Promise<Baseline | null>;

  updateBaseline(baseline: Baseline): Promise<void>;

  // ============================================================================
  // APPROVAL WORKFLOWS (P1A: Configurable templates)
  // ============================================================================

  createApprovalWorkflow(workflow: ApprovalWorkflow): Promise<ApprovalWorkflow>;
  getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | null>;
  listApprovalWorkflows(limit: number, offset: number): Promise<{
    items: ApprovalWorkflow[];
    total: number;
  }>;

  // ============================================================================
  // APPROVAL INSTANCES (P1A: Concrete approval runs)
  // ============================================================================

  createApprovalInstance(instance: ApprovalInstance): Promise<ApprovalInstance>;
  getApprovalInstance(id: string): Promise<ApprovalInstance | null>;
  listApprovalInstances(
    baselineId: string,
  ): Promise<ApprovalInstance[]>;

  updateApprovalInstance(instance: ApprovalInstance): Promise<void>;

  // ============================================================================
  // APPROVAL STEPS (P1A: Steps within approval instances)
  // ============================================================================

  createApprovalStep(step: ApprovalStep): Promise<ApprovalStep>;
  getApprovalStep(id: string): Promise<ApprovalStep | null>;
  listApprovalSteps(approvalInstanceId: string): Promise<ApprovalStep[]>;
  updateApprovalStep(step: ApprovalStep): Promise<void>;

  // ============================================================================
  // REQUIREMENT (P0 CRUD, preserved for backward compatibility)
  // ============================================================================

  createRequirement(req: URSRequirement): Promise<URSRequirement>;
  getRequirements(requirementSetId: string): Promise<URSRequirement[]>;
  getRequirementCount(requirementSetId: string): Promise<number>;
  replaceRequirements(requirementSetId: string, requirements: URSRequirement[]): Promise<URSRequirement[]>;

  // ============================================================================
  // APPROVAL (P0 CRUD, preserved for backward compatibility)
  // ============================================================================

  createApproval(approval: Approval): Promise<void>;
  getApprovals(requirementSetId: string): Promise<Approval[]>;
  approveAll(requirementSetId: string, approver: string): Promise<void>;
  clearApprovals(requirementSetId: string): Promise<void>;

  // ============================================================================
  // AUDIT TRAIL (Append-only)
  // ============================================================================

  createAuditEvent(event: AuditEvent): Promise<void>;
  getAuditTrail(requirementSetId: string): Promise<AuditEvent[]>;

  /**
   * Get full audit trail for an entity (all event types)
   */
  getEntityAuditTrail(
    entityId: string,
    entityType: string,
  ): Promise<AuditEvent[]>;

  // ============================================================================
  // ELECTRONIC SIGNATURES (Append-only)
  // ============================================================================

  createSignature(signature: Signature): Promise<void>;

  /** All signatures on a target, oldest first. */
  listSignatures(
    targetType: SignatureTargetType,
    targetId: string,
  ): Promise<Signature[]>;

  // Signing credentials — the second factor. See domain/reauth.ts.
  getSignatureCredential(userRef: string): Promise<SignatureCredential | null>;
  upsertSignatureCredential(credential: SignatureCredential): Promise<void>;

  /**
   * Record the outcome of a verification attempt.
   *
   * Separate from upsert because it must not touch the hash, and because it
   * runs outside the signing transaction: a failed attempt has to be counted
   * even though the signature itself is rolled back.
   */
  recordSignatureAttempt(
    userRef: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void>;

  // ============================================================================
  // TRANSACTIONS (P1A)
  // ============================================================================

  /**
   * Execute operations in a transaction
   * Rolls back all if any fail
   *
   * @deprecated Only the raw handle is transactional. Repository methods
   * called inside `execute()` still run against the base connection, so they
   * are neither committed nor rolled back with it. Use `withTransaction`.
   */
  beginTransaction(): Promise<Transaction>;

  /**
   * Run `fn` against a repository bound to a single transaction.
   *
   * Every repository call made on the passed instance participates in that
   * transaction. The transaction commits when `fn` resolves and rolls back
   * when it throws.
   */
  withTransaction<T>(fn: (repo: IURSRepository) => Promise<T>): Promise<T>;
}

/**
 * Transaction interface for P1A
 */
export interface Transaction {
  /** Commit transaction */
  commit(): Promise<void>;

  /** Rollback transaction */
  rollback(): Promise<void>;

  /** Execute operation within transaction */
  execute<T>(fn: () => Promise<T>): Promise<T>;
}
