/**
 * URS Composer Repository
 *
 * P0 Implementation: In-memory storage
 * P1A: Extended with versioning, baselines, workflows
 * Future: Can be replaced with PostgreSQL via migrations
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
  ApprovalStatus,
  BusinessCapabilityPersisted,
  URSStatus,
} from './types';
import { IURSRepository, Transaction } from './repository-interface';

/**
 * In-memory Transaction (no-op for P0)
 */
class InMemoryTransaction implements Transaction {
  async commit(): Promise<void> {
    // In-memory, always succeeds
  }

  async rollback(): Promise<void> {
    // In-memory, no rollback needed
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

export class URSRepository implements IURSRepository {
  // P0 storage
  private requirementSets: Map<string, RequirementSet> = new Map();
  private requirements: Map<string, URSRequirement[]> = new Map();
  private approvals: Map<string, Approval[]> = new Map();
  private auditEvents: AuditEvent[] = [];

  // P1A storage
  private businessCapabilities: Map<string, BusinessCapabilityPersisted> = new Map();
  private requirementVersions: Map<string, RequirementVersion> = new Map();
  private baselines: Map<string, Baseline> = new Map();
  private approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();
  private approvalInstances: Map<string, ApprovalInstance> = new Map();
  private approvalSteps: Map<string, ApprovalStep> = new Map();

  /**
   * Requirement Set CRUD
   */

  async createRequirementSet(set: RequirementSet): Promise<RequirementSet> {
    this.requirementSets.set(set.id, set);
    this.requirements.set(set.id, []);
    return set;
  }

  async getRequirementSet(id: string): Promise<RequirementSet | null> {
    return this.requirementSets.get(id) || null;
  }

  async listRequirementSets(
    limit: number,
    offset: number,
  ): Promise<{ items: RequirementSet[]; total: number }> {
    const allSets = Array.from(this.requirementSets.values());
    const total = allSets.length;
    const items = allSets.slice(offset, offset + limit);
    return { items, total };
  }

  async updateRequirementSet(set: RequirementSet): Promise<void> {
    this.requirementSets.set(set.id, set);
  }

  /**
   * Requirement CRUD
   */

  async createRequirement(req: URSRequirement): Promise<URSRequirement> {
    if (!this.requirements.has(req.requirementSetId)) {
      this.requirements.set(req.requirementSetId, []);
    }
    const reqs = this.requirements.get(req.requirementSetId)!;
    reqs.push(req);
    return req;
  }

  async getRequirements(requirementSetId: string): Promise<URSRequirement[]> {
    return this.requirements.get(requirementSetId) || [];
  }

  async getRequirementCount(requirementSetId: string): Promise<number> {
    return (this.requirements.get(requirementSetId) || []).length;
  }

  async replaceRequirements(
    requirementSetId: string,
    requirements: URSRequirement[],
  ): Promise<URSRequirement[]> {
    this.requirements.set(requirementSetId, requirements);
    return requirements;
  }

  /**
   * Approval Management
   */

  async createApproval(approval: Approval): Promise<void> {
    if (!this.approvals.has(approval.requirementSetId)) {
      this.approvals.set(approval.requirementSetId, []);
    }
    const apps = this.approvals.get(approval.requirementSetId)!;
    apps.push(approval);
  }

  async getApprovals(requirementSetId: string): Promise<Approval[]> {
    return this.approvals.get(requirementSetId) || [];
  }

  async approveAll(
    requirementSetId: string,
    approver: string,
  ): Promise<void> {
    const apps = this.approvals.get(requirementSetId) || [];
    for (const app of apps) {
      app.status = ApprovalStatus.APPROVED;
      app.approver = approver;
      app.decidedAt = new Date();
    }
  }

  async clearApprovals(requirementSetId: string): Promise<void> {
    this.approvals.delete(requirementSetId);
  }

  /**
   * Audit Trail
   */

  async createAuditEvent(event: AuditEvent): Promise<void> {
    this.auditEvents.push(event);
  }

  async getAuditTrail(requirementSetId: string): Promise<AuditEvent[]> {
    return this.auditEvents.filter(
      e =>
        (e.entityId === requirementSetId && e.entityType === 'REQUIREMENT_SET') ||
        (e.entityType === 'REQUIREMENT' &&
          e.eventType === 'CREATED'),
    );
  }

  // ============================================================================
  // P1A: BUSINESS CAPABILITIES (Persisted)
  // ============================================================================

  async createBusinessCapability(
    cap: BusinessCapabilityPersisted,
  ): Promise<BusinessCapabilityPersisted> {
    this.businessCapabilities.set(cap.id, cap);
    return cap;
  }

  async getBusinessCapability(id: string): Promise<BusinessCapabilityPersisted | null> {
    return this.businessCapabilities.get(id) || null;
  }

  async listBusinessCapabilities(
    limit: number,
    offset: number,
  ): Promise<{ items: BusinessCapabilityPersisted[]; total: number }> {
    const allCaps = Array.from(this.businessCapabilities.values()).filter(
      c => c.status === 'ACTIVE',
    );
    const total = allCaps.length;
    const items = allCaps.slice(offset, offset + limit);
    return { items, total };
  }

  // ============================================================================
  // P1A: REQUIREMENT VERSIONS
  // ============================================================================

  async createRequirementVersion(version: RequirementVersion): Promise<RequirementVersion> {
    this.requirementVersions.set(version.id, version);
    return version;
  }

  async getRequirementVersion(id: string): Promise<RequirementVersion | null> {
    return this.requirementVersions.get(id) || null;
  }

  async getRequirementVersions(
    requirementId: string,
    orderBy: 'asc' | 'desc' = 'asc',
  ): Promise<RequirementVersion[]> {
    const versions = Array.from(this.requirementVersions.values())
      .filter(v => v.requirementId === requirementId)
      .sort((a, b) => {
        const aNum = a.versionNumber;
        const bNum = b.versionNumber;
        return orderBy === 'asc' ? aNum - bNum : bNum - aNum;
      });
    return versions;
  }

  async getCurrentApprovedVersion(requirementId: string): Promise<RequirementVersion | null> {
    const versions = await this.getRequirementVersions(requirementId, 'desc');
    for (const v of versions) {
      if (v.status === URSStatus.APPROVED) {
        return v;
      }
    }
    return null;
  }

  async updateRequirementVersion(version: RequirementVersion): Promise<void> {
    this.requirementVersions.set(version.id, version);
  }

  // ============================================================================
  // P1A: BASELINES
  // ============================================================================

  async createBaseline(baseline: Baseline): Promise<Baseline> {
    this.baselines.set(baseline.id, baseline);
    return baseline;
  }

  async getBaseline(id: string): Promise<Baseline | null> {
    return this.baselines.get(id) || null;
  }

  async listBaselines(
    requirementSetId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: Baseline[]; total: number }> {
    const allBaselines = Array.from(this.baselines.values()).filter(
      b => b.requirementSetId === requirementSetId,
    );
    const total = allBaselines.length;
    const items = allBaselines.slice(offset, offset + limit);
    return { items, total };
  }

  async getCurrentApprovedBaseline(requirementSetId: string): Promise<Baseline | null> {
    const baselines = Array.from(this.baselines.values())
      .filter(b => b.requirementSetId === requirementSetId && b.status === URSStatus.APPROVED)
      .sort((a, b) => {
        const aNum = parseInt(a.baselineVersion.split('.')[0], 10);
        const bNum = parseInt(b.baselineVersion.split('.')[0], 10);
        return bNum - aNum; // Descending
      });
    return baselines[0] || null;
  }

  async updateBaseline(baseline: Baseline): Promise<void> {
    this.baselines.set(baseline.id, baseline);
  }

  // ============================================================================
  // P1A: APPROVAL WORKFLOWS
  // ============================================================================

  async createApprovalWorkflow(workflow: ApprovalWorkflow): Promise<ApprovalWorkflow> {
    this.approvalWorkflows.set(workflow.id, workflow);
    return workflow;
  }

  async getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | null> {
    return this.approvalWorkflows.get(id) || null;
  }

  async listApprovalWorkflows(
    limit: number,
    offset: number,
  ): Promise<{ items: ApprovalWorkflow[]; total: number }> {
    const allWorkflows = Array.from(this.approvalWorkflows.values());
    const total = allWorkflows.length;
    const items = allWorkflows.slice(offset, offset + limit);
    return { items, total };
  }

  // ============================================================================
  // P1A: APPROVAL INSTANCES
  // ============================================================================

  async createApprovalInstance(instance: ApprovalInstance): Promise<ApprovalInstance> {
    this.approvalInstances.set(instance.id, instance);
    return instance;
  }

  async getApprovalInstance(id: string): Promise<ApprovalInstance | null> {
    return this.approvalInstances.get(id) || null;
  }

  async listApprovalInstances(baselineId: string): Promise<ApprovalInstance[]> {
    return Array.from(this.approvalInstances.values()).filter(
      i => i.baselineId === baselineId,
    );
  }

  async updateApprovalInstance(instance: ApprovalInstance): Promise<void> {
    this.approvalInstances.set(instance.id, instance);
  }

  // ============================================================================
  // P1A: APPROVAL STEPS
  // ============================================================================

  async createApprovalStep(step: ApprovalStep): Promise<ApprovalStep> {
    this.approvalSteps.set(step.id, step);
    return step;
  }

  async getApprovalStep(id: string): Promise<ApprovalStep | null> {
    return this.approvalSteps.get(id) || null;
  }

  async listApprovalSteps(approvalInstanceId: string): Promise<ApprovalStep[]> {
    return Array.from(this.approvalSteps.values())
      .filter(s => this.approvalInstances.get(s.id as any)?.id === approvalInstanceId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async updateApprovalStep(step: ApprovalStep): Promise<void> {
    this.approvalSteps.set(step.id, step);
  }

  // ============================================================================
  // P1A: AUDIT (Extended)
  // ============================================================================

  async getEntityAuditTrail(entityId: string, entityType: string): Promise<AuditEvent[]> {
    return this.auditEvents.filter(
      e => e.entityId === entityId && e.entityType === entityType,
    );
  }

  // ============================================================================
  // P1A: TRANSACTIONS (No-op for in-memory)
  // ============================================================================

  async beginTransaction(): Promise<Transaction> {
    return new InMemoryTransaction();
  }
}
