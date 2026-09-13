/**
 * URS Composer Database Seeds
 *
 * Idempotent seed operations for:
 * - Business Capabilities (canonical list in data/businessCapabilities.ts)
 * - Business Roles (default executing roles)
 * - Approval Workflows (standard templates)
 * - Requirement Sets (data/seedRequirementSets.ts, e.g. the W&D URS)
 *
 * Not run on PostgreSQL plugin startup. Invoke explicitly via `yarn urs:seed`
 * (Neuinstallation / Test) or from test helpers. Memory mode still seeds in
 * plugin.ts for volatile local/dev use.
 *
 * All operations are idempotent:
 * Running seeds multiple times produces the same result.
 * Existing records are never overwritten.
 */

import { Knex } from 'knex';
import { APPROVAL_WORKFLOWS } from '../data/approvalWorkflows';
import { BUSINESS_CAPABILITIES } from '../data/businessCapabilities';
import { SEED_REQUIREMENT_SETS, acceptanceIntentFromSeed } from '../data/seedRequirementSets';
import { buildGenesisRequirementVersion } from '../domain/genesis-seed';
import {
  GxPRelevance,
  RequirementPriority,
  URSStatus,
  type RequirementClassification,
} from '../types';

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
 * Derives from the canonical APPROVAL_WORKFLOWS list so the Postgres mirror
 * and the in-memory repository cannot drift apart.
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

  for (const workflow of APPROVAL_WORKFLOWS) {
    // Check if already exists (idempotent)
    const existing = await knex('approval_workflows').where({ id: workflow.id }).first();
    if (!existing) {
      await knex('approval_workflows').insert({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: JSON.stringify(workflow.steps),
        created_at: new Date(),
        created_by: 'system',
      });
    }
  }
}

/**
 * Seed requirement sets and their requirements as DRAFT, each with genesis 0.1.
 *
 * Seeded sets use a stable requirement set key (e.g. URS-WD) so requirement IDs
 * are identical in every environment. A set that already exists is left
 * untouched, so operator edits and approvals survive a restart.
 *
 * Idempotency: skip when the requirement set key already exists.
 * Missing genesis versions on existing rows are repaired by
 * `seedMissingGenesisVersions`.
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

    const versionRows = seedSet.requirements.map(req => {
      const genesis = buildGenesisRequirementVersion(
        {
          requirementId: req.requirementId,
          title: req.title,
          statement: req.statement,
          rationale: req.rationale,
          category: req.category,
          priority: req.priority,
          acceptanceIntent: acceptanceIntentFromSeed(req.acceptanceCriteria),
          classification: req.classification,
          gxpRelevance: req.gxpRelevance,
        },
        'system',
        {
          id: `${setId}-${req.requirementId.toLowerCase()}-v0.1`,
          createdAt: now,
        },
      );
      return {
        id: genesis.id,
        requirement_id: genesis.requirementId,
        version: genesis.version,
        version_number: genesis.versionNumber,
        major: genesis.major ?? null,
        minor: genesis.minor ?? null,
        version_label: genesis.versionLabel ?? genesis.version,
        title: genesis.title,
        statement: genesis.statement,
        rationale: genesis.rationale ?? null,
        category: genesis.category ?? null,
        priority: genesis.priority ?? null,
        acceptance_intent: genesis.acceptanceIntent ?? null,
        gxp_relevance: genesis.gxpRelevance ?? null,
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
        status: genesis.status,
        created_by: genesis.createdBy,
        created_at: genesis.createdAt,
        content_hash: genesis.contentHash ?? null,
        revision: genesis.revision ?? 1,
      };
    });

    await knex('requirement_versions').insert(versionRows);
  }
}

/**
 * Open genesis 0.1 for any requirement that has no versions yet.
 *
 * Repairs older installs where requirement sets were seeded without versions
 * (Create Baseline then fails with "No requirement version found").
 */
export async function seedMissingGenesisVersions(knex: Knex): Promise<void> {
  const requirements = await knex('requirements').select('*');
  for (const row of requirements) {
    const existing = await knex('requirement_versions')
      .where({ requirement_id: row.requirement_id })
      .first();
    if (existing) {
      continue;
    }

    let meta: Record<string, unknown> = {};
    if (row.classification_meta) {
      try {
        meta =
          typeof row.classification_meta === 'string'
            ? JSON.parse(row.classification_meta)
            : row.classification_meta;
      } catch {
        meta = {};
      }
    }

    const classification: RequirementClassification | undefined =
      row.component_type || row.requirement_nature || row.criticality
        ? ({
            componentType: row.component_type,
            requirementNature: row.requirement_nature,
            criticality: row.criticality,
            ...meta,
          } as RequirementClassification)
        : undefined;

    const genesis = buildGenesisRequirementVersion(
      {
        requirementId: row.requirement_id,
        title: row.title,
        statement: row.statement,
        rationale: row.rationale ?? undefined,
        category: row.category ?? undefined,
        priority: (row.priority as RequirementPriority) ?? RequirementPriority.MUST,
        acceptanceIntent: row.acceptance_intent ?? undefined,
        classification,
        gxpRelevance: (row.gxp_relevance as GxPRelevance) ?? undefined,
        source: row.source ?? undefined,
        owner: row.owner ?? undefined,
      },
      'system',
      {
        id: `${row.id}-v0.1`,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      },
    );

    await knex('requirement_versions').insert({
      id: genesis.id,
      requirement_id: genesis.requirementId,
      version: genesis.version,
      version_number: genesis.versionNumber,
      major: genesis.major ?? null,
      minor: genesis.minor ?? null,
      version_label: genesis.versionLabel ?? genesis.version,
      title: genesis.title,
      statement: genesis.statement,
      rationale: genesis.rationale ?? null,
      category: genesis.category ?? null,
      priority: genesis.priority ?? null,
      acceptance_intent: genesis.acceptanceIntent ?? null,
      gxp_relevance: genesis.gxpRelevance ?? null,
      component_type: row.component_type ?? null,
      requirement_nature: row.requirement_nature ?? null,
      criticality: row.criticality ?? null,
      classification_meta: row.classification_meta ?? null,
      status: genesis.status,
      created_by: genesis.createdBy,
      created_at: genesis.createdAt,
      content_hash: genesis.contentHash ?? null,
      revision: genesis.revision ?? 1,
    });
  }
}

/**
 * Run all content seeds (CLI / tests only — not Postgres startup).
 * Safe to call multiple times (all operations idempotent).
 */
export async function seed(knex: Knex): Promise<void> {
  await seedBusinessCapabilities(knex);
  await seedApprovalWorkflows(knex);
  await seedBusinessRoles(knex);
  await seedRequirementSets(knex);
  await seedMissingGenesisVersions(knex);
}
