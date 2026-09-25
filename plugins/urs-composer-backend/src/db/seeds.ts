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
import { APPROVAL_WORKFLOWS } from '../data/approvalWorkflows';
import { BUSINESS_CAPABILITIES } from '../data/businessCapabilities';
import {
  SEED_REQUIREMENT_SETS,
  acceptanceIntentFromSeed,
  genesisVersionOf,
  type SeedRequirement,
} from '../data/seedRequirementSets';
import { URSRequirement, URSStatus } from '../types';

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

  // Derived from the canonical list so the Postgres mirror and the in-memory
  // repository cannot drift apart — the same rule the capability seed follows.
  const workflows = APPROVAL_WORKFLOWS.map(workflow => ({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    steps: JSON.stringify(workflow.steps),
  }));

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

    // Built as domain objects first so the genesis versions below are derived
    // from exactly the same content the requirement rows carry.
    const requirements: URSRequirement[] = seedSet.requirements.map(req => ({
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

    const classificationColumns = (req: SeedRequirement) => ({
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
    });

    await knex('requirements').insert(
      requirements.map((requirement, i) => ({
        id: requirement.id,
        requirement_set_id: requirement.requirementSetId,
        requirement_id: requirement.requirementId,
        title: requirement.title,
        statement: requirement.statement,
        rationale: requirement.rationale ?? null,
        category: requirement.category ?? null,
        priority: requirement.priority,
        acceptance_intent: requirement.acceptanceIntent ?? null,
        gxp_relevance: requirement.gxpRelevance,
        ...classificationColumns(seedSet.requirements[i]),
        status: URSStatus.DRAFT,
        created_by: 'system',
        created_at: now,
      })),
    );

    // Without a genesis version a seeded requirement cannot be baselined,
    // signed or revised — see genesisVersionOf. createRequirement opens this
    // version for requirements created through the API; seeding has to do it
    // itself, because it writes to the tables directly.
    await knex('requirement_versions').insert(
      requirements.map((requirement, i) => {
        const version = genesisVersionOf(requirement, now);
        return {
          id: version.id,
          requirement_id: version.requirementId,
          version: version.version,
          version_number: version.versionNumber,
          major: version.major ?? null,
          minor: version.minor ?? null,
          version_label: version.versionLabel ?? version.version,
          title: version.title,
          statement: version.statement,
          rationale: version.rationale ?? null,
          category: version.category ?? null,
          priority: version.priority ?? null,
          acceptance_intent: version.acceptanceIntent ?? null,
          gxp_relevance: version.gxpRelevance ?? null,
          source: version.source ?? null,
          owner: version.owner ?? null,
          ...classificationColumns(seedSet.requirements[i]),
          status: version.status,
          created_by: version.createdBy,
          created_at: version.createdAt,
          content_hash: version.contentHash ?? null,
          revision: version.revision ?? 1,
        };
      }),
    );
  }
}

/**
 * Open the genesis version for any requirement that has none.
 *
 * Fixing the seeder only helps a database that is seeded from now on.
 * Installations seeded before the fix keep requirements that carry no version
 * at all, and seedRequirementSets deliberately skips a set that already
 * exists — so without this, those requirement sets would stay unbaselinable
 * forever.
 *
 * A requirement without a version is broken data by definition: every
 * requirement created through the API gets version 0.1 from createRequirement.
 * So this repairs rather than changes behaviour, and it is idempotent — once
 * every requirement has a version it finds nothing to do.
 */
export async function backfillMissingRequirementVersions(
  knex: Knex,
): Promise<number> {
  const orphans = await knex('requirements')
    .select(
      'id',
      'requirement_set_id',
      'requirement_id',
      'title',
      'statement',
      'rationale',
      'category',
      'priority',
      'acceptance_intent',
      'gxp_relevance',
      'component_type',
      'requirement_nature',
      'criticality',
      'classification_meta',
      'created_at',
    )
    .whereNotExists(
      knex('requirement_versions')
        .select(knex.raw('1'))
        .whereRaw('requirement_versions.requirement_id = requirements.requirement_id'),
    );

  if (!orphans.length) {
    return 0;
  }

  const now = new Date();
  const rows = orphans.map(row => {
    const version = genesisVersionOf(
      {
        id: row.id,
        requirementSetId: row.requirement_set_id,
        requirementId: row.requirement_id,
        title: row.title,
        statement: row.statement,
        rationale: row.rationale ?? undefined,
        category: row.category ?? undefined,
        priority: row.priority,
        acceptanceIntent: row.acceptance_intent ?? undefined,
        gxpRelevance: row.gxp_relevance ?? undefined,
        // Rebuilt from the columns because hashOf reads criticality: a version
        // whose content_hash ignored it would not match the hash the normal
        // path produces for the same content, and signature verification
        // compares exactly that.
        classification: {
          componentType: row.component_type ?? undefined,
          requirementNature: row.requirement_nature ?? undefined,
          criticality: row.criticality ?? undefined,
        },
        status: URSStatus.DRAFT,
        createdAt: row.created_at ?? now,
        createdBy: 'system',
      } as URSRequirement,
      row.created_at ?? now,
    );

    return {
      id: version.id,
      requirement_id: version.requirementId,
      version: version.version,
      version_number: version.versionNumber,
      major: version.major ?? null,
      minor: version.minor ?? null,
      version_label: version.versionLabel ?? version.version,
      title: version.title,
      statement: version.statement,
      rationale: version.rationale ?? null,
      category: version.category ?? null,
      priority: version.priority ?? null,
      acceptance_intent: version.acceptanceIntent ?? null,
      gxp_relevance: version.gxpRelevance ?? null,
      // Carried over verbatim: the requirement row already holds the
      // classification in column form, so it is copied rather than rebuilt.
      component_type: row.component_type ?? null,
      requirement_nature: row.requirement_nature ?? null,
      criticality: row.criticality ?? null,
      classification_meta: row.classification_meta ?? null,
      status: version.status,
      created_by: version.createdBy,
      created_at: version.createdAt,
      content_hash: version.contentHash ?? null,
      revision: 1,
    };
  });

  await knex('requirement_versions').insert(rows);
  return rows.length;
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
  await backfillMissingRequirementVersions(knex);
}
