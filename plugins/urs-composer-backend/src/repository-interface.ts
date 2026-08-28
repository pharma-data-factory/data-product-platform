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

  // ============================================================================
  // REQUIREMENT SETS (P0 CRUD, preserved for backward compatibility)
  // ============================================================================

  createRequirementSet(set: RequirementSet): Promise<RequirementSet>;
  getRequirementSet(id: string): Promise<RequirementSet | null>;
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
  // TRANSACTIONS (P1A)
  // ============================================================================

  /**
   * Execute operations in a transaction
   * Rolls back all if any fail
   */
  beginTransaction(): Promise<Transaction>;
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
