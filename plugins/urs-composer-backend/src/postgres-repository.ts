/**
 * PostgreSQL URS Repository
 *
 * Production implementation using Backstage DatabaseService.
 * Implements IURSRepository contract for P1A persistence.
 *
 * Uses Knex.js query builder provided by Backstage.
 * All operations use parameterized queries to prevent SQL injection.
 */

import { Knex } from 'knex';
import type { RequirementClassification } from '@internal/platform-common';

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
  URSStatus,
  BusinessCapabilityPersisted,
  BusinessRolePersisted,
  ApprovalInstanceStatus,
  ApprovalStepStatus,
} from './types';
import { IURSRepository, Transaction } from './repository-interface';
import { up } from './db/migrations';
import { seed } from './db/seeds';

/**
 * PostgreSQL Transaction wrapper
 */
class PostgresTransaction implements Transaction {
  private readonly trx: Knex.Transaction;

  constructor(trx: Knex.Transaction) {
    this.trx = trx;
  }

  async commit(): Promise<void> {
    await this.trx.commit();
  }

  async rollback(): Promise<void> {
    await this.trx.rollback();
  }

  async execute<T>(fn: (trx?: Knex.Transaction) => Promise<T>): Promise<T> {
    return fn(this.trx);
  }
}

/**
 * PostgreSQL-backed URS Repository
 *
 * All queries use parameterized statements.
 * Implements optimistic locking via revision field.
 * Supports transactions for multi-record consistency.
 */
export class PostgresURSRepository implements IURSRepository {
  private readonly db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  /**
   * Backstage's DatabaseService.getClient() is async. Construct via this
   * factory so the repository holds a real Knex instance (and the schema
   * exists) instead of an unresolved Promise.
   */
  static async create(database: { getClient(): Promise<Knex> | Knex }): Promise<PostgresURSRepository> {
    const db = await database.getClient();
    await up(db);
    await seed(db);
    return new PostgresURSRepository(db);
  }

  // ============================================================================
  // BUSINESS CAPABILITIES
  // ============================================================================

  async createBusinessCapability(
    cap: BusinessCapabilityPersisted,
  ): Promise<BusinessCapabilityPersisted> {
    await this.db('business_capabilities').insert({
      id: cap.id,
      name: cap.name,
      description: cap.description || null,
      domain: cap.domain,
      status: cap.status,
      source: cap.source,
      documentation_ref: cap.documentationRef || null,
      version: cap.version,
      created_at: cap.createdAt,
      created_by: cap.createdBy,
    });
    return cap;
  }

  async getBusinessCapability(id: string): Promise<BusinessCapabilityPersisted | null> {
    const result = await this.db('business_capabilities').where({ id }).first();
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      domain: result.domain,
      status: result.status,
      source: result.source,
      documentationRef: result.documentation_ref,
      version: result.version,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      createdBy: result.created_by,
      updatedBy: result.updated_by,
    };
  }

  async listBusinessCapabilities(
    limit: number,
    offset: number,
  ): Promise<{ items: BusinessCapabilityPersisted[]; total: number }> {
    const countResult = await this.db('business_capabilities')
      .where({ status: 'ACTIVE' })
      .count('* as count')
      .first();
    const total = Number(countResult?.count || 0);

    const results = await this.db('business_capabilities')
      .where({ status: 'ACTIVE' })
      .limit(limit)
      .offset(offset)
      .select();

    const items = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      domain: r.domain,
      status: r.status,
      source: r.source,
      documentationRef: r.documentation_ref,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
    }));

    return { items, total };
  }

  async updateBusinessCapability(
    cap: BusinessCapabilityPersisted,
  ): Promise<BusinessCapabilityPersisted> {
    await this.db('business_capabilities')
      .where({ id: cap.id })
      .update({
        name: cap.name,
        description: cap.description || null,
        domain: cap.domain,
        status: cap.status,
        source: cap.source,
        documentation_ref: cap.documentationRef || null,
        version: cap.version,
        updated_by: cap.updatedBy || null,
        updated_at: cap.updatedAt || new Date(),
      });
    return cap;
  }

  async retireBusinessCapability(
    id: string,
    actor: string,
  ): Promise<BusinessCapabilityPersisted> {
    const existing = await this.getBusinessCapability(id);
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
    await this.updateBusinessCapability(retired);
    return retired;
  }

  // ============================================================================
  // BUSINESS ROLES (P1B)
  // ============================================================================

  async createBusinessRole(role: BusinessRolePersisted): Promise<BusinessRolePersisted> {
    await this.db('business_roles').insert({
      id: role.id,
      name: role.name,
      description: role.description || null,
      status: role.status,
      version: role.version,
      created_at: role.createdAt,
      created_by: role.createdBy,
    });
    return role;
  }

  async getBusinessRole(id: string): Promise<BusinessRolePersisted | null> {
    const r = await this.db('business_roles').where({ id }).first();
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
    };
  }

  async listBusinessRoles(
    limit: number,
    offset: number,
  ): Promise<{ items: BusinessRolePersisted[]; total: number }> {
    const countResult = await this.db('business_roles')
      .where({ status: 'ACTIVE' })
      .count('* as count')
      .first();
    const total = Number(countResult?.count || 0);

    const results = await this.db('business_roles')
      .where({ status: 'ACTIVE' })
      .limit(limit)
      .offset(offset)
      .select();

    const items = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
    }));

    return { items, total };
  }

  async updateBusinessRole(role: BusinessRolePersisted): Promise<BusinessRolePersisted> {
    await this.db('business_roles').where({ id: role.id }).update({
      name: role.name,
      description: role.description || null,
      status: role.status,
      version: role.version,
      updated_by: role.updatedBy || null,
      updated_at: role.updatedAt || new Date(),
    });
    return role;
  }

  async retireBusinessRole(
    id: string,
    actor: string,
  ): Promise<BusinessRolePersisted> {
    const existing = await this.getBusinessRole(id);
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
    await this.updateBusinessRole(retired);
    return retired;
  }

  // ============================================================================
  // REQUIREMENT SETS
  // ============================================================================

  async createRequirementSet(set: RequirementSet): Promise<RequirementSet> {
    await this.db('requirement_sets').insert({
      id: set.id,
      requirement_set_id: set.requirementSetId,
      version_number: set.versionNumber,
      business_capability_refs: set.businessCapabilityRefs?.length
        ? JSON.stringify(set.businessCapabilityRefs)
        : null,
      business_need: set.businessNeed,
      desired_outcome: set.desiredOutcome || null,
      business_value: set.businessValue || null,
      stakeholders: set.stakeholders ? JSON.stringify(set.stakeholders) : null,
      process_context: set.processContext || null,
      solution_type: set.solutionType,
      solution_name: set.solutionName || null,
      solution_catalog_ref: set.solutionCatalogRef || null,
      scope: set.scope || null,
      out_of_scope: set.outOfScope || null,
      gxp_relevance: set.gxpRelevance || null,
      patient_impact: set.patientImpact || false,
      data_integrity_impact: set.dataIntegrityImpact || false,
      electronic_records: set.electronicRecords || false,
      status: set.status,
      template_version: set.templateVersion || null,
      created_by: set.createdBy,
      created_at: set.createdAt,
      updated_by: set.updatedBy || null,
      updated_at: set.updatedAt || null,
      revision: set.revision || 1,
      supersedes_ref: set.supersedesRef || null,
    });
    return set;
  }

  async getRequirementSet(id: string): Promise<RequirementSet | null> {
    const result = await this.db('requirement_sets').where({ id }).first();
    if (!result) return null;

    return this.rowToRequirementSet(result);
  }

  async findRequirementSetByKey(
    requirementSetId: string,
  ): Promise<RequirementSet | null> {
    const result = await this.db('requirement_sets')
      .where({ requirement_set_id: requirementSetId })
      .first();
    if (!result) return null;

    return this.rowToRequirementSet(result);
  }

  async listRequirementSets(
    limit: number,
    offset: number,
  ): Promise<{ items: RequirementSet[]; total: number }> {
    const countResult = await this.db('requirement_sets')
      .count('* as count')
      .first();
    const total = Number(countResult?.count || 0);

    const results = await this.db('requirement_sets')
      .limit(limit)
      .offset(offset)
      .select();

    return { items: results.map((r: any) => this.rowToRequirementSet(r)), total };
  }

  async updateRequirementSet(set: RequirementSet): Promise<void> {
    await this.db('requirement_sets').where({ id: set.id }).update({
      business_capability_refs: set.businessCapabilityRefs?.length
        ? JSON.stringify(set.businessCapabilityRefs)
        : null,
      business_need: set.businessNeed,
      desired_outcome: set.desiredOutcome || null,
      business_value: set.businessValue || null,
      stakeholders: set.stakeholders ? JSON.stringify(set.stakeholders) : null,
      process_context: set.processContext || null,
      solution_type: set.solutionType,
      solution_name: set.solutionName || null,
      solution_catalog_ref: set.solutionCatalogRef || null,
      scope: set.scope || null,
      out_of_scope: set.outOfScope || null,
      gxp_relevance: set.gxpRelevance || null,
      patient_impact: set.patientImpact || false,
      data_integrity_impact: set.dataIntegrityImpact || false,
      electronic_records: set.electronicRecords || false,
      status: set.status,
      updated_by: set.updatedBy,
      updated_at: set.updatedAt || new Date(),
      revision: (set.revision || 1) + 1,
      supersedes_ref: set.supersedesRef || null,
    });
  }

  // ============================================================================
  // REQUIREMENT VERSIONS
  // ============================================================================

  async createRequirementVersion(version: RequirementVersion): Promise<RequirementVersion> {
    await this.db('requirement_versions').insert({
      id: version.id,
      ...this.classificationToColumns(version.classification),
      requirement_id: version.requirementId,
      version: version.version,
      version_number: version.versionNumber,
      title: version.title,
      statement: version.statement,
      rationale: version.rationale || null,
      category: version.category || null,
      priority: version.priority || null,
      acceptance_intent: version.acceptanceIntent || null,
      gxp_relevance: version.gxpRelevance || null,
      source: version.source || null,
      owner: version.owner || null,
      status: version.status,
      revision_of: version.revisionOf || null,
      revision_reason: version.revisionReason || null,
      superseded_by: version.supersededBy || null,
      created_by: version.createdBy,
      created_at: version.createdAt,
      approved_by: version.approvedBy || null,
      approved_at: version.approvedAt || null,
      revision: version.revision || 1,
    });
    return version;
  }

  async getRequirementVersion(id: string): Promise<RequirementVersion | null> {
    const result = await this.db('requirement_versions').where({ id }).first();
    if (!result) return null;

    return this.rowToRequirementVersion(result);
  }

  async getRequirementVersions(
    requirementId: string,
    orderBy: 'asc' | 'desc' = 'asc',
  ): Promise<RequirementVersion[]> {
    const results = await this.db('requirement_versions')
      .where({ requirement_id: requirementId })
      .orderBy('version_number', orderBy)
      .select();

    return results.map((r: any) => this.rowToRequirementVersion(r));
  }

  async getCurrentApprovedVersion(requirementId: string): Promise<RequirementVersion | null> {
    const result = await this.db('requirement_versions')
      .where({ requirement_id: requirementId, status: URSStatus.APPROVED })
      .orderBy('version_number', 'desc')
      .first();

    if (!result) return null;
    return this.rowToRequirementVersion(result);
  }

  async updateRequirementVersion(version: RequirementVersion): Promise<void> {
    // Enforce: Cannot modify APPROVED or SUPERSEDED versions (immutability)
    const existing = await this.db('requirement_versions').where({ id: version.id }).first();
    if (existing && (existing.status === URSStatus.APPROVED || existing.status === URSStatus.SUPERSEDED)) {
      throw new Error(`Cannot update ${existing.status} requirement version. Versions in this state are immutable.`);
    }

    // Optimistic concurrency control: update only if revision matches
    const currentRevision = version.revision || 1;
    const result = await this.db('requirement_versions')
      .where({ id: version.id, revision: currentRevision })
      .update({
        status: version.status,
        superseded_by: version.supersededBy || null,
        revision: currentRevision + 1,
      });

    if (result === 0) {
      throw new Error(
        `Optimistic concurrency conflict on requirement version ${version.id}. ` +
        `Expected revision ${currentRevision} but current revision differs. ` +
        `Another process may have updated this version.`,
      );
    }
  }

  async getRequirementVersionsByIds(ids: string[]): Promise<RequirementVersion[]> {
    if (ids.length === 0) return [];
    const results = await this.db('requirement_versions')
      .whereIn('id', ids)
      .select();
    return results.map((r: any) => this.rowToRequirementVersion(r));
  }

  // ============================================================================
  // BASELINES
  // ============================================================================

  async createBaseline(baseline: Baseline): Promise<Baseline> {
    await this.db('baselines').insert({
      id: baseline.id,
      requirement_set_id: baseline.requirementSetId,
      baseline_version: baseline.baselineVersion,
      status: baseline.status,
      requirement_version_ids: JSON.stringify(baseline.requirementVersionIds),
      created_by: baseline.createdBy,
      created_at: baseline.createdAt,
      approved_by: baseline.approvedBy || null,
      approved_at: baseline.approvedAt || null,
      superseded_by: baseline.supersededBy || null,
      revision: baseline.revision || 1,
    });
    return baseline;
  }

  async getBaseline(id: string): Promise<Baseline | null> {
    const result = await this.db('baselines').where({ id }).first();
    if (!result) return null;

    return this.rowToBaseline(result);
  }

  async listBaselines(
    requirementSetId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: Baseline[]; total: number }> {
    const countResult = await this.db('baselines')
      .where({ requirement_set_id: requirementSetId })
      .count('* as count')
      .first();
    const total = Number(countResult?.count || 0);

    const results = await this.db('baselines')
      .where({ requirement_set_id: requirementSetId })
      .limit(limit)
      .offset(offset)
      .select();

    return { items: results.map((r: any) => this.rowToBaseline(r)), total };
  }

  async getCurrentApprovedBaseline(requirementSetId: string): Promise<Baseline | null> {
    const result = await this.db('baselines')
      .where({ requirement_set_id: requirementSetId, status: URSStatus.APPROVED })
      .orderBy('baseline_version', 'desc')
      .first();

    if (!result) return null;
    return this.rowToBaseline(result);
  }

  async updateBaseline(baseline: Baseline): Promise<void> {
    await this.db('baselines').where({ id: baseline.id }).update({
      status: baseline.status,
      approved_by: baseline.approvedBy || null,
      approved_at: baseline.approvedAt || null,
      superseded_by: baseline.supersededBy || null,
      revision: (baseline.revision || 1) + 1,
    });
  }

  // ============================================================================
  // APPROVAL WORKFLOWS
  // ============================================================================

  async createApprovalWorkflow(workflow: ApprovalWorkflow): Promise<ApprovalWorkflow> {
    await this.db('approval_workflows').insert({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || null,
      steps: JSON.stringify(workflow.steps),
      created_at: workflow.createdAt,
      created_by: 'system',
    });
    return workflow;
  }

  async getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | null> {
    const result = await this.db('approval_workflows').where({ id }).first();
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      steps: JSON.parse(result.steps),
      createdAt: result.created_at,
    };
  }

  async listApprovalWorkflows(
    limit: number,
    offset: number,
  ): Promise<{ items: ApprovalWorkflow[]; total: number }> {
    const countResult = await this.db('approval_workflows')
      .count('* as count')
      .first();
    const total = Number(countResult?.count || 0);

    const results = await this.db('approval_workflows')
      .limit(limit)
      .offset(offset)
      .select();

    const items = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      steps: JSON.parse(r.steps),
      createdAt: r.created_at,
    }));

    return { items, total };
  }

  // ============================================================================
  // APPROVAL INSTANCES
  // ============================================================================

  async createApprovalInstance(instance: ApprovalInstance): Promise<ApprovalInstance> {
    await this.db('approval_instances').insert({
      id: instance.id,
      workflow_id: instance.workflowId,
      baseline_id: instance.baselineId,
      status: instance.status,
      current_step_sequence: instance.currentStepSequence,
      started_by: instance.startedBy,
      started_at: instance.startedAt,
      completed_by: instance.completedBy || null,
      completed_at: instance.completedAt || null,
      revision: instance.revision || 1,
    });

    // Insert steps
    for (const step of instance.steps) {
      await this.db('approval_steps').insert({
        id: step.id,
        approval_instance_id: instance.id,
        sequence: step.sequence,
        role: step.role,
        status: step.status,
        assigned_to: step.assignedTo || null,
        decision: step.decision || null,
        comment: step.comment || null,
        acted_by: step.actedBy || null,
        acted_at: step.actedAt || null,
      });
    }

    return instance;
  }

  async getApprovalInstance(id: string): Promise<ApprovalInstance | null> {
    const result = await this.db('approval_instances').where({ id }).first();
    if (!result) return null;

    const steps = await this.db('approval_steps')
      .where({ approval_instance_id: id })
      .orderBy('sequence')
      .select();

    return {
      id: result.id,
      workflowId: result.workflow_id,
      baselineId: result.baseline_id,
      status: result.status as ApprovalInstanceStatus,
      currentStepSequence: result.current_step_sequence,
      startedBy: result.started_by,
      startedAt: result.started_at,
      completedBy: result.completed_by,
      completedAt: result.completed_at,
      steps: steps.map((s: any) => ({
        id: s.id,
        sequence: s.sequence,
        role: s.role,
        status: s.status as ApprovalStepStatus,
        assignedTo: s.assigned_to,
        decision: s.decision,
        comment: s.comment,
        actedBy: s.acted_by,
        actedAt: s.acted_at,
      })),
      revision: result.revision,
    };
  }

  async listApprovalInstances(baselineId: string): Promise<ApprovalInstance[]> {
    const results = await this.db('approval_instances')
      .where({ baseline_id: baselineId })
      .select();

    const instances = [];
    for (const result of results) {
      const steps = await this.db('approval_steps')
        .where({ approval_instance_id: result.id })
        .orderBy('sequence')
        .select();

      instances.push({
        id: result.id,
        workflowId: result.workflow_id,
        baselineId: result.baseline_id,
        status: result.status as ApprovalInstanceStatus,
        currentStepSequence: result.current_step_sequence,
        startedBy: result.started_by,
        startedAt: result.started_at,
        completedBy: result.completed_by,
        completedAt: result.completed_at,
        steps: steps.map((s: any) => ({
          id: s.id,
          sequence: s.sequence,
          role: s.role,
          status: s.status as ApprovalStepStatus,
          assignedTo: s.assigned_to,
          decision: s.decision,
          comment: s.comment,
          actedBy: s.acted_by,
          actedAt: s.acted_at,
        })),
        revision: result.revision,
      });
    }

    return instances;
  }

  async updateApprovalInstance(instance: ApprovalInstance): Promise<void> {
    await this.db('approval_instances').where({ id: instance.id }).update({
      status: instance.status,
      current_step_sequence: instance.currentStepSequence,
      completed_by: instance.completedBy || null,
      completed_at: instance.completedAt || null,
      revision: (instance.revision || 1) + 1,
    });
  }

  // ============================================================================
  // APPROVAL STEPS
  // ============================================================================

  async createApprovalStep(step: ApprovalStep): Promise<ApprovalStep> {
    await this.db('approval_steps').insert({
      id: step.id,
      sequence: step.sequence,
      role: step.role,
      status: step.status,
      assigned_to: step.assignedTo || null,
      decision: step.decision || null,
      comment: step.comment || null,
      acted_by: step.actedBy || null,
      acted_at: step.actedAt || null,
    });
    return step;
  }

  async getApprovalStep(id: string): Promise<ApprovalStep | null> {
    const result = await this.db('approval_steps').where({ id }).first();
    if (!result) return null;

    return {
      id: result.id,
      sequence: result.sequence,
      role: result.role,
      status: result.status as ApprovalStepStatus,
      assignedTo: result.assigned_to,
      decision: result.decision,
      comment: result.comment,
      actedBy: result.acted_by,
      actedAt: result.acted_at,
    };
  }

  async listApprovalSteps(approvalInstanceId: string): Promise<ApprovalStep[]> {
    const results = await this.db('approval_steps')
      .where({ approval_instance_id: approvalInstanceId })
      .orderBy('sequence')
      .select();

    return results.map((r: any) => ({
      id: r.id,
      sequence: r.sequence,
      role: r.role,
      status: r.status as ApprovalStepStatus,
      assignedTo: r.assigned_to,
      decision: r.decision,
      comment: r.comment,
      actedBy: r.acted_by,
      actedAt: r.acted_at,
    }));
  }

  async updateApprovalStep(step: ApprovalStep): Promise<void> {
    await this.db('approval_steps').where({ id: step.id }).update({
      status: step.status,
      assigned_to: step.assignedTo || null,
      decision: step.decision || null,
      comment: step.comment || null,
      acted_by: step.actedBy || null,
      acted_at: step.actedAt || null,
    });
  }

  // ============================================================================
  // REQUIREMENTS (P0 BACKWARD COMPATIBILITY)
  // ============================================================================

  async createRequirement(req: URSRequirement): Promise<URSRequirement> {
    await this.db('requirements').insert({
      id: req.id,
      ...this.classificationToColumns(req.classification),
      requirement_set_id: req.requirementSetId,
      requirement_id: req.requirementId,
      title: req.title,
      statement: req.statement,
      rationale: req.rationale || null,
      category: req.category || null,
      priority: req.priority || null,
      acceptance_intent: req.acceptanceIntent || null,
      gxp_relevance: req.gxpRelevance || null,
      source: req.source || null,
      owner: req.owner || null,
      status: req.status,
      created_by: req.createdBy,
      created_at: req.createdAt,
    });
    return req;
  }

  async getRequirements(requirementSetId: string): Promise<URSRequirement[]> {
    const results = await this.db('requirements')
      .where({ requirement_set_id: requirementSetId })
      .select();

    return results.map((r: any) => ({
      id: r.id,
      requirementSetId: r.requirement_set_id,
      requirementId: r.requirement_id,
      title: r.title,
      statement: r.statement,
      rationale: r.rationale,
      category: r.category,
      priority: r.priority,
      acceptanceIntent: r.acceptance_intent,
      classification: this.classificationFromRow(r),
      gxpRelevance: r.gxp_relevance,
      source: r.source,
      owner: r.owner,
      status: r.status,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));
  }

  async getRequirementCount(requirementSetId: string): Promise<number> {
    const result = await this.db('requirements')
      .where({ requirement_set_id: requirementSetId })
      .count('* as count')
      .first();
    return Number(result?.count || 0);
  }

  async replaceRequirements(
    requirementSetId: string,
    requirements: URSRequirement[],
  ): Promise<URSRequirement[]> {
    await this.db('requirements').where({ requirement_set_id: requirementSetId }).del();
    for (const req of requirements) {
      await this.createRequirement(req);
    }
    return requirements;
  }

  // ============================================================================
  // APPROVAL (P0 BACKWARD COMPATIBILITY - DEPRECATED)
  // ============================================================================

  async createApproval(_approval: Approval): Promise<void> {
    // P0 legacy - no longer used in P1A
  }

  async getApprovals(_requirementSetId: string): Promise<Approval[]> {
    // P0 legacy - return empty
    return [];
  }

  async approveAll(_requirementSetId: string, _approver: string): Promise<void> {
    // P0 legacy - handled by approval instances
  }

  async clearApprovals(_requirementSetId: string): Promise<void> {
    // P0 legacy - handled by approval instances
  }

  // ============================================================================
  // AUDIT TRAIL
  // ============================================================================

  async createAuditEvent(event: AuditEvent): Promise<void> {
    await this.db('audit_events').insert({
      id: event.id,
      entity_type: event.entityType,
      entity_id: event.entityId,
      entity_version: event.entityVersion || null,
      event_type: event.eventType,
      old_value: event.oldValue ? JSON.stringify(event.oldValue) : null,
      new_value: event.newValue ? JSON.stringify(event.newValue) : null,
      actor: event.actor,
      timestamp: event.timestamp,
      correlation_id: event.correlationId || null,
      reason: event.reason || null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    });
  }

  async getAuditTrail(requirementSetId: string): Promise<AuditEvent[]> {
    const results = await this.db('audit_events')
      .where({ entity_id: requirementSetId })
      .orderBy('timestamp', 'desc')
      .select();

    return results.map((r: any) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityVersion: r.entity_version,
      eventType: r.event_type,
      oldValue: r.old_value ? JSON.parse(r.old_value) : null,
      newValue: r.new_value ? JSON.parse(r.new_value) : null,
      actor: r.actor,
      timestamp: r.timestamp,
      correlationId: r.correlation_id,
      reason: r.reason,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    }));
  }

  async getEntityAuditTrail(entityId: string, entityType: string): Promise<AuditEvent[]> {
    const results = await this.db('audit_events')
      .where({ entity_id: entityId, entity_type: entityType })
      .orderBy('timestamp', 'desc')
      .select();

    return results.map((r: any) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityVersion: r.entity_version,
      eventType: r.event_type,
      oldValue: r.old_value ? JSON.parse(r.old_value) : null,
      newValue: r.new_value ? JSON.parse(r.new_value) : null,
      actor: r.actor,
      timestamp: r.timestamp,
      correlationId: r.correlation_id,
      reason: r.reason,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    }));
  }

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  async beginTransaction(): Promise<Transaction> {
    const trx = await this.db.transaction();
    return new PostgresTransaction(trx);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private rowToRequirementSet(row: any): RequirementSet {
    return {
      id: row.id,
      requirementSetId: row.requirement_set_id,
      versionNumber: row.version_number,
      businessCapabilityRefs: row.business_capability_refs
        ? JSON.parse(row.business_capability_refs)
        : [],
      businessNeed: row.business_need,
      desiredOutcome: row.desired_outcome,
      businessValue: row.business_value,
      stakeholders: row.stakeholders ? JSON.parse(row.stakeholders) : undefined,
      processContext: row.process_context,
      solutionType: row.solution_type,
      solutionName: row.solution_name,
      solutionCatalogRef: row.solution_catalog_ref,
      scope: row.scope,
      outOfScope: row.out_of_scope,
      gxpRelevance: row.gxp_relevance,
      patientImpact: Boolean(row.patient_impact),
      dataIntegrityImpact: Boolean(row.data_integrity_impact),
      electronicRecords: Boolean(row.electronic_records),
      status: row.status,
      templateVersion: row.template_version,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      revision: row.revision,
      supersedesRef: row.supersedes_ref || undefined,
    };
  }

  private classificationToColumns(
    classification?: RequirementClassification,
  ): {
    component_type: string | null;
    requirement_nature: string | null;
    criticality: string | null;
    classification_meta: string | null;
  } {
    if (!classification) {
      return {
        component_type: null,
        requirement_nature: null,
        criticality: null,
        classification_meta: null,
      };
    }
    return {
      component_type: classification.componentType,
      requirement_nature: classification.requirementNature,
      criticality: classification.criticality,
      classification_meta: JSON.stringify({
        secondaryTypes: classification.secondaryTypes,
        interfaceType: classification.interfaceType,
        dataClassification: classification.dataClassification,
        validationLevel: classification.validationLevel,
        sourceSystem: classification.sourceSystem,
        targetSystem: classification.targetSystem,
        automationReadiness: classification.automationReadiness,
      }),
    };
  }

  private classificationFromRow(row: any): RequirementClassification | undefined {
    if (!row.component_type) {
      return undefined;
    }
    const meta = row.classification_meta
      ? JSON.parse(row.classification_meta)
      : {};
    return {
      componentType: row.component_type,
      secondaryTypes: meta.secondaryTypes,
      requirementNature: row.requirement_nature,
      criticality: row.criticality,
      interfaceType: meta.interfaceType,
      dataClassification: meta.dataClassification,
      validationLevel: meta.validationLevel,
      sourceSystem: meta.sourceSystem,
      targetSystem: meta.targetSystem,
      automationReadiness: meta.automationReadiness,
    };
  }

  private rowToRequirementVersion(row: any): RequirementVersion {
    return {
      id: row.id,
      requirementId: row.requirement_id,
      version: row.version,
      versionNumber: row.version_number,
      title: row.title,
      statement: row.statement,
      rationale: row.rationale,
      category: row.category,
      priority: row.priority,
      acceptanceIntent: row.acceptance_intent,
      classification: this.classificationFromRow(row),
      gxpRelevance: row.gxp_relevance,
      source: row.source,
      owner: row.owner,
      status: row.status,
      revisionOf: row.revision_of,
      revisionReason: row.revision_reason,
      supersededBy: row.superseded_by,
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      revision: row.revision,
    };
  }

  private rowToBaseline(row: any): Baseline {
    return {
      id: row.id,
      requirementSetId: row.requirement_set_id,
      baselineVersion: row.baseline_version,
      status: row.status,
      requirementVersionIds: JSON.parse(row.requirement_version_ids),
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      supersededBy: row.superseded_by,
      approvalInstanceId: row.approval_instance_id,
      revision: row.revision,
    };
  }
}
