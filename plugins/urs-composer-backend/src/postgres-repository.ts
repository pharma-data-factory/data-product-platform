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
  Signature,
  SignatureCredential,
  SignatureTargetType,
  ChangeRequest,
  ChangeRequestStatus,
  ImpactAssessment,
  BaselineItem,
  ReviewScope,
} from './types';
import { baselineItemsOf } from './domain/baseline';
import { ConflictError, NotFoundError } from '@backstage/errors';
import {
  assertChangeRequestTransition,
  assertTransition,
} from './domain/transitions';
import { IURSRepository, Transaction } from './repository-interface';
import { up } from './db/migrations';

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
   *
   * Runs schema migrations (and genesis repair) only. Content seed is explicit:
   * `yarn urs:seed` or test helpers — never on every backend start.
   */
  static async create(database: { getClient(): Promise<Knex> | Knex }): Promise<PostgresURSRepository> {
    const db = await database.getClient();
    await up(db);
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
      version_comment: set.versionComment || null,
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
      version_comment: set.versionComment || null,
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
      major: version.major ?? null,
      minor: version.minor ?? null,
      version_label: version.versionLabel ?? version.version,
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
      released_at: version.releasedAt || null,
      content_hash: version.contentHash || null,
      change_request_id: version.changeRequestId || null,
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
    const existing = await this.db('requirement_versions').where({ id: version.id }).first();
    if (!existing) {
      throw new NotFoundError(`Requirement version ${version.id} not found`);
    }

    // Content is immutable throughout; only the status and the fields that
    // belong to a status change are written. Which changes are legal is
    // decided by the transition map, not here — that is what allows an
    // approved version to be superseded while still refusing, say, a jump back
    // to draft.
    if (existing.status !== version.status) {
      assertTransition(
        'version',
        existing.status as URSStatus,
        version.status,
        version.id,
      );
    }

    // Optimistic concurrency control: update only if revision matches
    const currentRevision = version.revision || 1;
    const result = await this.db('requirement_versions')
      .where({ id: version.id, revision: currentRevision })
      .update({
        status: version.status,
        superseded_by: version.supersededBy || null,
        approved_by: version.approvedBy || null,
        approved_at: version.approvedAt || null,
        // The release date is stamped on the transition into APPROVED and is
        // never rewritten afterwards.
        released_at:
          version.status === URSStatus.APPROVED
            ? version.releasedAt || version.approvedAt || new Date()
            : existing.released_at ?? null,
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
    const items = baselineItemsOf(baseline);

    await this.db('baselines').insert({
      id: baseline.id,
      requirement_set_id: baseline.requirementSetId,
      baseline_version: baseline.baselineVersion,
      status: baseline.status,
      // Deprecated; kept in sync for readers that predate baseline_items.
      requirement_version_ids: JSON.stringify(
        items.map(i => i.requirementVersionId),
      ),
      created_by: baseline.createdBy,
      created_at: baseline.createdAt,
      approved_by: baseline.approvedBy || null,
      approved_at: baseline.approvedAt || null,
      superseded_by: baseline.supersededBy || null,
      revision: baseline.revision || 1,
    });

    if (items.length) {
      await this.db('baseline_items').insert(
        items.map(item => ({
          baseline_id: baseline.id,
          requirement_version_id: item.requirementVersionId,
          review_scope: item.reviewScope,
          position: item.position,
        })),
      );
    }

    return { ...baseline, items };
  }

  async getBaseline(id: string): Promise<Baseline | null> {
    const result = await this.db('baselines').where({ id }).first();
    if (!result) return null;

    const [baseline] = await this.withItems([result]);
    return baseline;
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

    return { items: await this.withItems(results), total };
  }

  async getCurrentApprovedBaseline(requirementSetId: string): Promise<Baseline | null> {
    const result = await this.db('baselines')
      .where({ requirement_set_id: requirementSetId, status: URSStatus.APPROVED })
      .orderBy('baseline_version', 'desc')
      .first();

    if (!result) return null;
    const [baseline] = await this.withItems([result]);
    return baseline;
  }

  /**
   * Attach pinned items to baseline rows in one query.
   *
   * Reads from baseline_items rather than the deprecated JSON column; the
   * migration backfilled it, so every row has its contents there.
   */
  private async withItems(rows: any[]): Promise<Baseline[]> {
    if (!rows.length) return [];

    const itemRows = await this.db('baseline_items')
      .whereIn(
        'baseline_id',
        rows.map(r => r.id),
      )
      .orderBy('position', 'asc')
      .select();

    const byBaseline = new Map<string, BaselineItem[]>();
    for (const row of itemRows) {
      const list = byBaseline.get(row.baseline_id) ?? [];
      list.push({
        requirementVersionId: row.requirement_version_id,
        reviewScope: row.review_scope as ReviewScope,
        position: row.position,
      });
      byBaseline.set(row.baseline_id, list);
    }

    return rows.map(row => {
      const items = byBaseline.get(row.id) ?? [];
      return {
        ...this.rowToBaseline(row),
        items,
        requirementVersionIds: items.map(i => i.requirementVersionId),
      };
    });
  }

  async getBaselinesPinningVersion(versionId: string): Promise<Baseline[]> {
    const rows = await this.db('baselines')
      .join('baseline_items', 'baselines.id', 'baseline_items.baseline_id')
      .where('baseline_items.requirement_version_id', versionId)
      .select('baselines.*');

    return this.withItems(rows);
  }

  async updateBaseline(baseline: Baseline): Promise<void> {
    const existing = await this.db('baselines').where({ id: baseline.id }).first();
    if (!existing) {
      throw new NotFoundError(`Baseline ${baseline.id} not found`);
    }

    if (existing.status !== baseline.status) {
      assertTransition(
        'baseline',
        existing.status as URSStatus,
        baseline.status,
        baseline.id,
      );
    }

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
        required: step.required !== false,
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
      steps: steps.map((s: any) => this.rowToApprovalStep(s)),
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
        steps: steps.map((s: any) => this.rowToApprovalStep(s)),
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
      approval_instance_id: step.approvalInstanceId,
      sequence: step.sequence,
      role: step.role,
      status: step.status,
      required: step.required !== false,
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

    return this.rowToApprovalStep(result);
  }

  async listApprovalSteps(approvalInstanceId: string): Promise<ApprovalStep[]> {
    const results = await this.db('approval_steps')
      .where({ approval_instance_id: approvalInstanceId })
      .orderBy('sequence')
      .select();

    return results.map((r: any) => this.rowToApprovalStep(r));
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
  // CHANGE CONTROL
  // ============================================================================

  async createChangeRequest(request: ChangeRequest): Promise<ChangeRequest> {
    await this.db('change_requests').insert({
      id: request.id,
      title: request.title,
      description: request.description,
      reason: request.reason,
      affected_requirement_ids: JSON.stringify(request.affectedRequirementIds),
      status: request.status,
      requested_by: request.requestedBy,
      requested_at: request.requestedAt,
      decided_by: request.decidedBy || null,
      decided_at: request.decidedAt || null,
      decision_reason: request.decisionReason || null,
      revision: request.revision || 1,
    });
    return request;
  }

  async getChangeRequest(id: string): Promise<ChangeRequest | null> {
    const row = await this.db('change_requests').where({ id }).first();
    return row ? this.rowToChangeRequest(row) : null;
  }

  async listChangeRequests(
    limit: number,
    offset: number,
  ): Promise<{ items: ChangeRequest[]; total: number }> {
    const countResult = await this.db('change_requests')
      .count('* as count')
      .first();
    const rows = await this.db('change_requests')
      .orderBy('requested_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select();

    return {
      items: rows.map((r: any) => this.rowToChangeRequest(r)),
      total: Number(countResult?.count || 0),
    };
  }

  async updateChangeRequest(request: ChangeRequest): Promise<void> {
    const existing = await this.db('change_requests')
      .where({ id: request.id })
      .first();
    if (!existing) {
      throw new NotFoundError(`Change request ${request.id} not found`);
    }

    if (existing.status !== request.status) {
      assertChangeRequestTransition(
        existing.status as ChangeRequestStatus,
        request.status,
        request.id,
      );
    }

    const currentRevision = request.revision || 1;
    const updated = await this.db('change_requests')
      .where({ id: request.id, revision: currentRevision })
      .update({
        title: request.title,
        description: request.description,
        reason: request.reason,
        affected_requirement_ids: JSON.stringify(
          request.affectedRequirementIds,
        ),
        status: request.status,
        decided_by: request.decidedBy || null,
        decided_at: request.decidedAt || null,
        decision_reason: request.decisionReason || null,
        revision: currentRevision + 1,
      });

    if (updated === 0) {
      throw new ConflictError(
        `Optimistic concurrency conflict on change request ${request.id}. ` +
          `Expected revision ${currentRevision}; another process has changed it.`,
      );
    }
  }

  async getHighestChangeRequestSequence(year: number): Promise<number> {
    // Sequences are compared as text within a year, so they are zero-padded to
    // a fixed width and sort correctly.
    const row = await this.db('change_requests')
      .where('id', 'like', `CR-${year}-%`)
      .max('id as highest')
      .first();

    const highest = (row as any)?.highest as string | undefined;
    if (!highest) return 0;

    const suffix = highest.slice(`CR-${year}-`.length);
    return parseInt(suffix, 10) || 0;
  }

  async createImpactAssessment(assessment: ImpactAssessment): Promise<void> {
    await this.db('impact_assessments').insert({
      id: assessment.id,
      change_request_id: assessment.changeRequestId,
      summary: assessment.summary,
      gxp_impact: assessment.gxpImpact,
      validation_impact: assessment.validationImpact,
      affected_version_ids: JSON.stringify(assessment.affectedVersionIds),
      assessed_by: assessment.assessedBy,
      assessed_at: assessment.assessedAt,
    });
  }

  async getImpactAssessment(
    changeRequestId: string,
  ): Promise<ImpactAssessment | null> {
    const row = await this.db('impact_assessments')
      .where({ change_request_id: changeRequestId })
      .first();
    if (!row) return null;

    return {
      id: row.id,
      changeRequestId: row.change_request_id,
      summary: row.summary,
      // SQLite hands booleans back as 0/1.
      gxpImpact: Boolean(row.gxp_impact),
      validationImpact: row.validation_impact,
      affectedVersionIds: JSON.parse(row.affected_version_ids),
      assessedBy: row.assessed_by,
      assessedAt: row.assessed_at,
    };
  }

  async getVersionsByChangeRequest(
    changeRequestId: string,
  ): Promise<RequirementVersion[]> {
    const rows = await this.db('requirement_versions')
      .where({ change_request_id: changeRequestId })
      .orderBy('version_number', 'asc')
      .select();
    return rows.map((r: any) => this.rowToRequirementVersion(r));
  }

  private rowToChangeRequest(row: any): ChangeRequest {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      reason: row.reason,
      affectedRequirementIds: JSON.parse(row.affected_requirement_ids),
      status: row.status,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      decidedBy: row.decided_by ?? undefined,
      decidedAt: row.decided_at ?? undefined,
      decisionReason: row.decision_reason ?? undefined,
      revision: row.revision,
    };
  }

  // ============================================================================
  // ELECTRONIC SIGNATURES
  // ============================================================================

  async createSignature(signature: Signature): Promise<void> {
    await this.db('signatures').insert({
      id: signature.id,
      target_type: signature.targetType,
      target_id: signature.targetId,
      meaning: signature.meaning,
      signed_by: signature.signedBy,
      signed_at: signature.signedAt,
      content_hash_at_signing: signature.contentHashAtSigning,
      comment: signature.comment || null,
    });
  }

  async listSignatures(
    targetType: SignatureTargetType,
    targetId: string,
  ): Promise<Signature[]> {
    const rows = await this.db('signatures')
      .where({ target_type: targetType, target_id: targetId })
      .orderBy('signed_at', 'asc')
      .select();

    return rows.map((row: any) => ({
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      meaning: row.meaning,
      signedBy: row.signed_by,
      signedAt: row.signed_at,
      contentHashAtSigning: row.content_hash_at_signing,
      comment: row.comment ?? undefined,
    }));
  }

  async getSignatureCredential(
    userRef: string,
  ): Promise<SignatureCredential | null> {
    const row = await this.db('signature_credentials')
      .where({ user_ref: userRef })
      .first();
    if (!row) return null;

    return {
      userRef: row.user_ref,
      pinHash: row.pin_hash,
      salt: row.salt,
      algo: row.algo,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
      failedAttempts: Number(row.failed_attempts ?? 0),
      lockedUntil: row.locked_until ?? undefined,
    };
  }

  async upsertSignatureCredential(
    credential: SignatureCredential,
  ): Promise<void> {
    await this.db('signature_credentials')
      .insert({
        user_ref: credential.userRef,
        pin_hash: credential.pinHash,
        salt: credential.salt,
        algo: credential.algo,
        created_at: credential.createdAt,
        updated_at: credential.updatedAt || null,
        failed_attempts: credential.failedAttempts,
        locked_until: credential.lockedUntil || null,
      })
      .onConflict('user_ref')
      .merge([
        'pin_hash',
        'salt',
        'algo',
        'updated_at',
        'failed_attempts',
        'locked_until',
      ]);
  }

  async recordSignatureAttempt(
    userRef: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await this.db('signature_credentials')
      .where({ user_ref: userRef })
      .update({ failed_attempts: failedAttempts, locked_until: lockedUntil });
  }

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  async beginTransaction(): Promise<Transaction> {
    const trx = await this.db.transaction();
    return new PostgresTransaction(trx);
  }

  async withTransaction<T>(
    fn: (repo: IURSRepository) => Promise<T>,
  ): Promise<T> {
    // A Knex transaction is itself a query builder, so binding a repository
    // instance to it routes every query through the transaction. Knex commits
    // when the callback resolves and rolls back when it throws.
    return this.db.transaction(async trx =>
      fn(new PostgresURSRepository(trx)),
    );
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
      versionComment: row.version_comment || undefined,
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
      major: row.major ?? undefined,
      minor: row.minor ?? undefined,
      versionLabel: row.version_label ?? row.version,
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
      releasedAt: row.released_at ?? undefined,
      contentHash: row.content_hash ?? undefined,
      changeRequestId: row.change_request_id ?? undefined,
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

  private rowToApprovalStep(row: any): ApprovalStep {
    return {
      id: row.id,
      approvalInstanceId: row.approval_instance_id,
      sequence: row.sequence,
      role: row.role,
      status: row.status as ApprovalStepStatus,
      // SQLite returns booleans as 0/1. A missing value predates the column
      // and is treated as required, matching the migration default.
      required:
        row.required === undefined || row.required === null
          ? true
          : Boolean(row.required),
      assignedTo: row.assigned_to,
      decision: row.decision,
      comment: row.comment,
      actedBy: row.acted_by,
      actedAt: row.acted_at,
    };
  }
}
