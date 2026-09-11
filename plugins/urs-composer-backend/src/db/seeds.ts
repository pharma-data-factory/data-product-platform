/**
 * URS Composer Database Seeds
 *
 * Idempotent seed operations for:
 * - Business Capabilities (canonical list in data/businessCapabilities.ts)
 * - Business Roles (default executing roles)
 * - Approval Workflows (standard templates)
 * - Requirement Sets (data/seedRequirementSets.ts, e.g. the W&D URS)
 *
 * All operations are idempotent:
 * Running seeds multiple times produces the same result.
 * Existing records are never overwritten.
 */

import { Knex } from 'knex';
import { BUSINESS_CAPABILITIES } from '../data/businessCapabilities';
import { SEED_REQUIREMENT_SETS, acceptanceIntentFromSeed } from '../data/seedRequirementSets';
import { URSStatus } from '../types';

/**
 * Seed business capabilities.
 *
 * Derives from the canonical BUSINESS_CAPABILITIES list so the Postgres mirror
 * and the in-memory repository cannot drift apart.
 *
 * Idempotency: Check if records exist before inserting.
 */
export async function seedBusinessCapabilities(knex: Knex): Promise<void> {
  for (const cap of BUSINESS_CAPABILITIES) {
    // Check if already exists (idempotent)
    const existing = await knex('business_capabilities')
      .where({ id: cap.id })
      .first();
    if (!existing) {
      await knex('business_capabilities').insert({
        id: cap.id,
        name: cap.name,
        description: cap.description,
        domain: cap.domain,
        status: 'ACTIVE',
        source: cap.source,
        documentation_ref: cap.documentationRef || null,
        version: 1,
        created_at: new Date(),
        created_by: 'system',
      });
    }
  }
}

/**
 * Default executing roles seeded into `business_roles`.
 */
export const SEED_BUSINESS_ROLE_NAMES = [
  'Weighing Operator',
  'Dispensing Operator',
  'Line Lead',
  'Production Supervisor',
  'Quality Technician',
  'Process Engineer',
];

/**
 * Derive the `role:<slug>` entity id for a business role name.
 */
export function businessRoleIdFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `role:${slug}`;
}

/**
 * Seed business roles
 * Default executing roles for business capabilities.
 * Idempotent: existing records are never overwritten.
 */
export async function seedBusinessRoles(knex: Knex): Promise<void> {
  for (const name of SEED_BUSINESS_ROLE_NAMES) {
    const id = businessRoleIdFromName(name);
    const existing = await knex('business_roles').where({ id }).first();
    if (!existing) {
      await knex('business_roles').insert({
        id,
        name,
        status: 'ACTIVE',
        version: 1,
        created_at: new Date(),
        created_by: 'system',
      });
    }
  }
}

/**
 * Seed approval workflows
 * Standard templates for P1A approval process
 *
 * Idempotency: Check if records exist before inserting.
 */
export async function seedApprovalWorkflows(knex: Knex): Promise<void> {
  // Normalize any legacy prefixed workflow rows created before the domain-model
  // IDs were aligned. `ApprovalWorkflow.id` is defined unprefixed
  // ("standard-gxp-urs", "non-gxp-urs") and `submitBaseline` looks them up
  // by that unprefixed id. Repoint any "workflow:standard-gxp-urs" /
  // "workflow:non-gxp-urs" rows to the canonical unprefixed id so there is a
  // single source of truth and no duplicate workflows.
  const legacyMappings: Record<string, string> = {
    'workflow:standard-gxp-urs': 'standard-gxp-urs',
    'workflow:non-gxp-urs': 'non-gxp-urs',
  };
  for (const [legacyId, canonicalId] of Object.entries(legacyMappings)) {
    const legacy = await knex('approval_workflows').where({ id: legacyId }).first();
    if (legacy) {
      // Delete the legacy row and re-insert under the canonical id only if the
      // canonical id is not already present.
      const canonicalExists = await knex('approval_workflows')
        .where({ id: canonicalId })
        .first();
      if (!canonicalExists) {
        const { id, ...rest } = legacy;
        await knex('approval_workflows').insert({ ...rest, id: canonicalId });
      }
      await knex('approval_workflows').where({ id: legacyId }).del();
    }
  }

  const workflows = [
    {
      id: 'standard-gxp-urs',
      name: 'Standard GxP URS Approval',
      description: 'Three-step approval for GxP-relevant requirements',
      steps: JSON.stringify([
        {
          sequence: 1,
          role: 'BUSINESS_REVIEWER',
          required: true,
          description: 'Business context review',
        },
        {
          sequence: 2,
          role: 'PRODUCT_MANAGER',
          required: true,
          description: 'Product management review',
        },
        {
          sequence: 3,
          role: 'QUALITY_REVIEWER',
          required: true,
          description: 'Quality assurance review',
        },
      ]),
    },
    {
      id: 'non-gxp-urs',
      name: 'Non-GxP URS Approval',
      description: 'Two-step approval for non-GxP requirements',
      steps: JSON.stringify([
        {
          sequence: 1,
          role: 'BUSINESS_REVIEWER',
          required: true,
          description: 'Business context review',
        },
        {
          sequence: 2,
          role: 'PRODUCT_MANAGER',
          required: true,
          description: 'Product management review',
        },
      ]),
    },
  ];

  for (const workflow of workflows) {
    // Check if already exists (idempotent)
    const existing = await knex('approval_workflows').where({ id: workflow.id }).first();
    if (!existing) {
      await knex('approval_workflows').insert({
        ...workflow,
        created_at: new Date(),
        created_by: 'system',
      });
    }
  }
}

/**
 * Seed requirement sets and their requirements as DRAFT.
 *
 * Seeded sets use a stable requirement set key (e.g. URS-WD) so requirement IDs
 * are identical in every environment. A set that already exists is left
 * untouched, so operator edits and approvals survive a restart.
 *
 * Idempotency: skip when the requirement set key already exists.
 */
export async function seedRequirementSets(knex: Knex): Promise<void> {
  for (const seedSet of SEED_REQUIREMENT_SETS) {
    const existing = await knex('requirement_sets')
      .where({ requirement_set_id: seedSet.requirementSetId })
      .first();
    if (existing) {
      continue;
    }

    const now = new Date();
    const setId = `seed:${seedSet.requirementSetId.toLowerCase()}`;

    await knex('requirement_sets').insert({
      id: setId,
      requirement_set_id: seedSet.requirementSetId,
      version_number: 1,
      business_capability_refs: JSON.stringify(seedSet.businessCapabilityRefs),
      business_need: seedSet.businessNeed,
      desired_outcome: seedSet.desiredOutcome ?? null,
      business_value: seedSet.businessValue ?? null,
      stakeholders: JSON.stringify(seedSet.stakeholders),
      process_context: seedSet.processContext ?? null,
      scope: seedSet.scope ?? null,
      out_of_scope: seedSet.outOfScope ?? null,
      solution_type: seedSet.solutionType,
      solution_name: seedSet.solutionName,
      gxp_relevance: seedSet.gxpRelevance,
      patient_impact: seedSet.patientImpact,
      data_integrity_impact: seedSet.dataIntegrityImpact,
      electronic_records: seedSet.electronicRecords,
      status: URSStatus.DRAFT,
      created_by: 'system',
      created_at: now,
      revision: 1,
    });

    const rows = seedSet.requirements.map(req => ({
      id: `${setId}-${req.requirementId.toLowerCase()}`,
      requirement_set_id: setId,
      requirement_id: req.requirementId,
      title: req.title,
      statement: req.statement,
      rationale: req.rationale ?? null,
      category: req.category ?? null,
      priority: req.priority,
      acceptance_intent: acceptanceIntentFromSeed(req.acceptanceCriteria) ?? null,
      gxp_relevance: req.gxpRelevance,
      component_type: req.classification.componentType,
      requirement_nature: req.classification.requirementNature,
      criticality: req.classification.criticality,
      classification_meta: JSON.stringify({
        secondaryTypes: req.classification.secondaryTypes,
        interfaceType: req.classification.interfaceType,
        dataClassification: req.classification.dataClassification,
        validationLevel: req.classification.validationLevel,
        sourceSystem: req.classification.sourceSystem,
        targetSystem: req.classification.targetSystem,
        automationReadiness: req.classification.automationReadiness,
      }),
      status: URSStatus.DRAFT,
      created_by: 'system',
      created_at: now,
    }));

    await knex('requirements').insert(rows);
  }
}

/**
 * Run all seeds
 * Safe to call multiple times (all operations idempotent)
 */
export async function seed(knex: Knex): Promise<void> {
  await seedBusinessCapabilities(knex);
  await seedApprovalWorkflows(knex);
  await seedBusinessRoles(knex);
  await seedRequirementSets(knex);
}
