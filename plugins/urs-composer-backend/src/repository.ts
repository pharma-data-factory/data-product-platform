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
  BusinessRolePersisted,
  URSStatus,
  Signature,
  SignatureCredential,
  SignatureTargetType,
  ChangeRequest,
  ImpactAssessment,
} from './types';
import { ConflictError, NotFoundError } from '@backstage/errors';
import {
  assertChangeRequestTransition,
  assertTransition,
} from './domain/transitions';
import { baselineItemsOf } from './domain/baseline';
import { IURSRepository, Transaction } from './repository-interface';
import { BUSINESS_CAPABILITIES } from './data/businessCapabilities';
import { APPROVAL_WORKFLOWS } from './data/approvalWorkflows';
import {
  SEED_REQUIREMENT_SETS,
  acceptanceIntentFromSeed,
} from './data/seedRequirementSets';

const DEFAULT_BUSINESS_ROLES = [
  'Weighing Operator',
  'Dispensing Operator',
  'Line Lead',
  'Production Supervisor',
  'Quality Technician',
  'Process Engineer',
];

function roleId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `role:${slug}`;
}

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
  private businessRoles: Map<string, BusinessRolePersisted> = new Map();
  private requirementVersions: Map<string, RequirementVersion> = new Map();
  private baselines: Map<string, Baseline> = new Map();
  private approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();
  private approvalInstances: Map<string, ApprovalInstance> = new Map();
  private approvalSteps: Map<string, ApprovalStep> = new Map();

  // Phase 2 storage
  private signatures: Signature[] = [];
  private signatureCredentials: Map<string, SignatureCredential> = new Map();

  // Phase 3 storage; assessments are keyed by change request, which is also
  // the uniqueness rule in Postgres.
  private changeRequests: Map<string, ChangeRequest> = new Map();
  private impactAssessments: Map<string, ImpactAssessment> = new Map();

  constructor() {
    for (const cap of BUSINESS_CAPABILITIES) {
      this.businessCapabilities.set(cap.id, {
        ...cap,
        status: 'ACTIVE',
        createdAt: new Date(),
        createdBy: 'system',
        version: 1,
      });
    }
    for (const name of DEFAULT_BUSINESS_ROLES) {
      this.businessRoles.set(roleId(name), {
        id: roleId(name),
        name,
        status: 'ACTIVE',
        createdAt: new Date(),
        createdBy: 'system',
        version: 1,
      });
    }
  }

  /**
   * Seeds the example requirement sets (one per business capability) into the
   * in-memory store. Idempotent. Called only from the in-memory production
   * path so that unit tests start from an empty repository.
   */
  seedRequirementSets(): void {
    const now = new Date();
    for (const seedSet of SEED_REQUIREMENT_SETS) {
      const setId = `seed:${seedSet.requirementSetId.toLowerCase()}`;
      if (this.requirementSets.has(setId)) {
        continue;
      }

      this.requirementSets.set(setId, {
        id: setId,
        requirementSetId: seedSet.requirementSetId,
        versionNumber: 1,
        revision: 1,
        businessCapabilityRefs: seedSet.businessCapabilityRefs,
        businessNeed: seedSet.businessNeed,
        desiredOutcome: seedSet.desiredOutcome,
        businessValue: seedSet.businessValue,
        stakeholders: seedSet.stakeholders,
        processContext: seedSet.processContext,
        scope: seedSet.scope,
        outOfScope: seedSet.outOfScope,
        solutionType: seedSet.solutionType,
        solutionName: seedSet.solutionName,
        gxpRelevance: seedSet.gxpRelevance,
        patientImpact: seedSet.patientImpact,
        dataIntegrityImpact: seedSet.dataIntegrityImpact,
        electronicRecords: seedSet.electronicRecords,
        status: URSStatus.DRAFT,
        createdAt: now,
        createdBy: 'system',
      });

      const reqs: URSRequirement[] = seedSet.requirements.map(req => ({
        id: `${setId}-${req.requirementId.toLowerCase()}`,
        requirementSetId: setId,
        requirementId: req.requirementId,
        title: req.title,
        statement: req.statement,
        rationale: req.rationale,
        category: req.category,
        priority: req.priority,
        acceptanceIntent: acceptanceIntentFromSeed(req.acceptanceCriteria),
        classification: req.classification,
        gxpRelevance: req.gxpRelevance,
        status: URSStatus.DRAFT,
        createdAt: now,
        createdBy: 'system',
      }));
      this.requirements.set(setId, reqs);
    }
  }

  /**
   * Seeds the canonical approval workflow definitions into the in-memory
   * store. Idempotent. Without them `submitBaseline` cannot resolve a
   * workflow, so no approval chain could ever start in memory mode.
   */
  seedApprovalWorkflows(): void {
    const now = new Date();
    for (const workflow of APPROVAL_WORKFLOWS) {
      if (this.approvalWorkflows.has(workflow.id)) {
        continue;
      }
      this.approvalWorkflows.set(workflow.id, {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        createdAt: now,
      });
    }
  }

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

  async findRequirementSetByKey(
    requirementSetId: string,
  ): Promise<RequirementSet | null> {
    for (const set of this.requirementSets.values()) {
      if (set.requirementSetId === requirementSetId) {
        return set;
      }
    }
    return null;
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

  async updateBusinessCapability(
    cap: BusinessCapabilityPersisted,
  ): Promise<BusinessCapabilityPersisted> {
    this.businessCapabilities.set(cap.id, cap);
    return cap;
  }

  async retireBusinessCapability(
    id: string,
    actor: string,
  ): Promise<BusinessCapabilityPersisted> {
    const existing = this.businessCapabilities.get(id);
    if (!existing) {
      throw new Error(`Business capability ${id} not found`);
    }
    const retired: BusinessCapabilityPersisted = {
      ...existing,
      status: 'RETIRED',
      updatedAt: new Date(),
      updatedBy: actor,
      version: existing.version + 1,
    };
    this.businessCapabilities.set(id, retired);
    return retired;
  }

  // ============================================================================
  // P1B: BUSINESS ROLES (Persisted)
  // ============================================================================

  async createBusinessRole(role: BusinessRolePersisted): Promise<BusinessRolePersisted> {
    this.businessRoles.set(role.id, role);
    return role;
  }

  async getBusinessRole(id: string): Promise<BusinessRolePersisted | null> {
    return this.businessRoles.get(id) || null;
  }

  async listBusinessRoles(
    limit: number,
    offset: number,
  ): Promise<{ items: BusinessRolePersisted[]; total: number }> {
    const all = Array.from(this.businessRoles.values()).filter(
      r => r.status === 'ACTIVE',
    );
    return { items: all.slice(offset, offset + limit), total: all.length };
  }

  async updateBusinessRole(role: BusinessRolePersisted): Promise<BusinessRolePersisted> {
    this.businessRoles.set(role.id, role);
    return role;
  }

  async retireBusinessRole(
    id: string,
    actor: string,
  ): Promise<BusinessRolePersisted> {
    const existing = this.businessRoles.get(id);
    if (!existing) {
      throw new Error(`Business role ${id} not found`);
    }
    const retired: BusinessRolePersisted = {
      ...existing,
      status: 'RETIRED',
      updatedAt: new Date(),
      updatedBy: actor,
      version: existing.version + 1,
    };
    this.businessRoles.set(id, retired);
    return retired;
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
    const existing = this.requirementVersions.get(version.id);
    if (!existing) {
      throw new NotFoundError(`Requirement version ${version.id} not found`);
    }

    // Mirrors the Postgres repository so that both backends reject the same
    // status changes; see its updateRequirementVersion for the reasoning.
    if (existing.status !== version.status) {
      assertTransition('version', existing.status, version.status, version.id);
    }

    const releasedAt =
      version.status === URSStatus.APPROVED
        ? version.releasedAt ?? version.approvedAt ?? new Date()
        : existing.releasedAt;

    this.requirementVersions.set(version.id, {
      ...existing,
      status: version.status,
      supersededBy: version.supersededBy,
      approvedBy: version.approvedBy,
      approvedAt: version.approvedAt,
      releasedAt,
      revision: (existing.revision || 1) + 1,
    });
  }

  async getRequirementVersionsByIds(ids: string[]): Promise<RequirementVersion[]> {
    const results: RequirementVersion[] = [];
    for (const id of ids) {
      const v = this.requirementVersions.get(id);
      if (v) results.push(v);
    }
    return results;
  }

  // ============================================================================
  // P1A: BASELINES
  // ============================================================================

  async createBaseline(baseline: Baseline): Promise<Baseline> {
    // Items and the id list are two views of the same thing; normalising here
    // keeps them from drifting apart, as they do in Postgres by construction.
    const items = baselineItemsOf(baseline);
    const stored: Baseline = {
      ...baseline,
      items,
      requirementVersionIds: items.map(i => i.requirementVersionId),
    };
    this.baselines.set(baseline.id, stored);
    return stored;
  }

  async getBaselinesPinningVersion(versionId: string): Promise<Baseline[]> {
    return Array.from(this.baselines.values()).filter(b =>
      baselineItemsOf(b).some(i => i.requirementVersionId === versionId),
    );
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
    const existing = this.baselines.get(baseline.id);
    if (!existing) {
      throw new NotFoundError(`Baseline ${baseline.id} not found`);
    }

    if (existing.status !== baseline.status) {
      assertTransition('baseline', existing.status, baseline.status, baseline.id);
    }

    this.baselines.set(baseline.id, {
      ...baseline,
      // Contents are set at creation. Postgres never updates them either.
      items: existing.items,
      requirementVersionIds: existing.requirementVersionIds,
      revision: (existing.revision || 1) + 1,
    });
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
    // Register the steps individually as well, mirroring the Postgres
    // repository. Without this, getApprovalStep and listApprovalSteps stay
    // empty in memory mode while they resolve under Postgres.
    for (const step of instance.steps) {
      this.approvalSteps.set(step.id, step);
    }
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
    for (const step of instance.steps) {
      this.approvalSteps.set(step.id, step);
    }
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
      .filter(s => s.approvalInstanceId === approvalInstanceId)
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
  // CHANGE CONTROL
  // ============================================================================

  async createChangeRequest(request: ChangeRequest): Promise<ChangeRequest> {
    if (this.changeRequests.has(request.id)) {
      throw new ConflictError(`Change request ${request.id} already exists`);
    }
    this.changeRequests.set(request.id, request);
    return request;
  }

  async getChangeRequest(id: string): Promise<ChangeRequest | null> {
    return this.changeRequests.get(id) ?? null;
  }

  async listChangeRequests(
    limit: number,
    offset: number,
  ): Promise<{ items: ChangeRequest[]; total: number }> {
    const all = Array.from(this.changeRequests.values()).sort(
      (a, b) => b.requestedAt.getTime() - a.requestedAt.getTime(),
    );
    return { items: all.slice(offset, offset + limit), total: all.length };
  }

  async updateChangeRequest(request: ChangeRequest): Promise<void> {
    const existing = this.changeRequests.get(request.id);
    if (!existing) {
      throw new NotFoundError(`Change request ${request.id} not found`);
    }

    if (existing.status !== request.status) {
      assertChangeRequestTransition(
        existing.status,
        request.status,
        request.id,
      );
    }

    this.changeRequests.set(request.id, {
      ...request,
      // Origin is fixed, mirroring the Postgres trigger.
      requestedBy: existing.requestedBy,
      requestedAt: existing.requestedAt,
      revision: (existing.revision || 1) + 1,
    });
  }

  async getHighestChangeRequestSequence(year: number): Promise<number> {
    const prefix = `CR-${year}-`;
    let highest = 0;
    for (const id of this.changeRequests.keys()) {
      if (!id.startsWith(prefix)) continue;
      highest = Math.max(highest, parseInt(id.slice(prefix.length), 10) || 0);
    }
    return highest;
  }

  async createImpactAssessment(assessment: ImpactAssessment): Promise<void> {
    if (this.impactAssessments.has(assessment.changeRequestId)) {
      throw new ConflictError(
        `Change request ${assessment.changeRequestId} has already been assessed`,
      );
    }
    this.impactAssessments.set(assessment.changeRequestId, assessment);
  }

  async getImpactAssessment(
    changeRequestId: string,
  ): Promise<ImpactAssessment | null> {
    return this.impactAssessments.get(changeRequestId) ?? null;
  }

  async getVersionsByChangeRequest(
    changeRequestId: string,
  ): Promise<RequirementVersion[]> {
    return Array.from(this.requirementVersions.values())
      .filter(v => v.changeRequestId === changeRequestId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  // ============================================================================
  // ELECTRONIC SIGNATURES
  // ============================================================================

  async createSignature(signature: Signature): Promise<void> {
    // Mirrors the unique constraint in Postgres.
    const duplicate = this.signatures.some(
      s =>
        s.targetType === signature.targetType &&
        s.targetId === signature.targetId &&
        s.meaning === signature.meaning &&
        s.signedBy === signature.signedBy,
    );
    if (duplicate) {
      throw new ConflictError(
        `${signature.signedBy} has already signed ${signature.targetId} as ${signature.meaning}.`,
      );
    }
    this.signatures.push(signature);
  }

  async listSignatures(
    targetType: SignatureTargetType,
    targetId: string,
  ): Promise<Signature[]> {
    return this.signatures
      .filter(s => s.targetType === targetType && s.targetId === targetId)
      .sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime());
  }

  async getSignatureCredential(
    userRef: string,
  ): Promise<SignatureCredential | null> {
    return this.signatureCredentials.get(userRef) ?? null;
  }

  async upsertSignatureCredential(
    credential: SignatureCredential,
  ): Promise<void> {
    this.signatureCredentials.set(credential.userRef, credential);
  }

  async recordSignatureAttempt(
    userRef: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    const existing = this.signatureCredentials.get(userRef);
    if (!existing) return;
    this.signatureCredentials.set(userRef, {
      ...existing,
      failedAttempts,
      lockedUntil: lockedUntil ?? undefined,
    });
  }

  // ============================================================================
  // P1A: TRANSACTIONS (No-op for in-memory)
  // ============================================================================

  async beginTransaction(): Promise<Transaction> {
    return new InMemoryTransaction();
  }

  async withTransaction<T>(
    fn: (repo: IURSRepository) => Promise<T>,
  ): Promise<T> {
    // There is no engine to roll back, so take a deep snapshot of the stores
    // and restore it on failure. This keeps memory mode behaviourally equal to
    // Postgres, which the shared repository contract tests rely on.
    const snapshot = this.snapshot();
    try {
      return await fn(this);
    } catch (err) {
      this.restore(snapshot);
      throw err;
    }
  }

  private snapshot(): InMemoryState {
    return structuredClone({
      requirementSets: this.requirementSets,
      requirements: this.requirements,
      approvals: this.approvals,
      auditEvents: this.auditEvents,
      businessCapabilities: this.businessCapabilities,
      businessRoles: this.businessRoles,
      requirementVersions: this.requirementVersions,
      baselines: this.baselines,
      approvalWorkflows: this.approvalWorkflows,
      approvalInstances: this.approvalInstances,
      approvalSteps: this.approvalSteps,
      signatures: this.signatures,
      changeRequests: this.changeRequests,
      impactAssessments: this.impactAssessments,
      // signatureCredentials is deliberately absent. A failed re-authentication
      // attempt has to be counted even though the signature it was meant for is
      // rolled back, otherwise the lockout could be defeated by provoking a
      // rollback. In Postgres this falls out of the credential store writing on
      // its own connection; here it has to be said explicitly.
    });
  }

  private restore(state: InMemoryState): void {
    this.requirementSets = state.requirementSets;
    this.requirements = state.requirements;
    this.approvals = state.approvals;
    this.auditEvents = state.auditEvents;
    this.businessCapabilities = state.businessCapabilities;
    this.businessRoles = state.businessRoles;
    this.requirementVersions = state.requirementVersions;
    this.baselines = state.baselines;
    this.approvalWorkflows = state.approvalWorkflows;
    this.approvalInstances = state.approvalInstances;
    this.approvalSteps = state.approvalSteps;
    this.signatures = state.signatures;
    this.changeRequests = state.changeRequests;
    this.impactAssessments = state.impactAssessments;
  }
}

/** Deep copy of every in-memory store, used to roll back a failed transaction. */
interface InMemoryState {
  requirementSets: Map<string, RequirementSet>;
  requirements: Map<string, URSRequirement[]>;
  approvals: Map<string, Approval[]>;
  auditEvents: AuditEvent[];
  businessCapabilities: Map<string, BusinessCapabilityPersisted>;
  businessRoles: Map<string, BusinessRolePersisted>;
  requirementVersions: Map<string, RequirementVersion>;
  baselines: Map<string, Baseline>;
  approvalWorkflows: Map<string, ApprovalWorkflow>;
  approvalInstances: Map<string, ApprovalInstance>;
  approvalSteps: Map<string, ApprovalStep>;
  signatures: Signature[];
  changeRequests: Map<string, ChangeRequest>;
  impactAssessments: Map<string, ImpactAssessment>;
}
