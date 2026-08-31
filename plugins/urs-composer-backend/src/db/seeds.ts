/**
 * URS Composer Database Seeds
 *
 * Idempotent seed operations for:
 * - Business Capabilities (from capability-matrix.md)
 * - Approval Workflows (standard templates)
 *
 * All operations are idempotent:
 * Running seeds multiple times produces the same result.
 * Existing records are never overwritten.
 */

import { Knex } from 'knex';

/**
 * Seed business capabilities
 * Source: docs/capability-matrix.md (MVP 1.0)
 *
 * Idempotency: Check if records exist before inserting.
 */
export async function seedBusinessCapabilities(knex: Knex): Promise<void> {
  const capabilities = [
    {
      id: 'business-capability:make/equipment-performance-management',
      name: 'Equipment Performance Management',
      description: 'Monitor, track, and optimize pharmaceutical equipment performance',
      domain: 'make',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:make/production-scheduling',
      name: 'Production Scheduling',
      description: 'Plan and schedule manufacturing operations',
      domain: 'make',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:make/quality-monitoring',
      name: 'Quality Monitoring',
      description: 'Real-time quality parameter monitoring and control',
      domain: 'make',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:make/material-tracking',
      name: 'Material Tracking',
      description: 'Track raw materials, work-in-progress, and finished products',
      domain: 'make',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:make/regulatory-compliance',
      name: 'Regulatory Compliance',
      description: 'Ensure compliance with pharmaceutical regulations and standards',
      domain: 'make',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:plan/demand-forecasting',
      name: 'Demand Forecasting',
      description: 'Forecast product demand for production planning',
      domain: 'plan',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:plan/inventory-management',
      name: 'Inventory Management',
      description: 'Manage inventory levels and supply chain optimization',
      domain: 'plan',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:control/process-control',
      name: 'Process Control',
      description: 'Control pharmaceutical manufacturing processes',
      domain: 'control',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:control/risk-management',
      name: 'Risk Management',
      description: 'Identify, assess, and mitigate manufacturing risks',
      domain: 'control',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
    {
      id: 'business-capability:control/continuous-improvement',
      name: 'Continuous Improvement',
      description: 'Implement continuous manufacturing process improvement',
      domain: 'control',
      status: 'ACTIVE',
      source: 'capability-matrix.md',
      version: 1,
    },
  ];

  for (const cap of capabilities) {
    // Check if already exists (idempotent)
    const existing = await knex('business_capabilities').where({ id: cap.id }).first();
    if (!existing) {
      await knex('business_capabilities').insert({
        ...cap,
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
 * Run all seeds
 * Safe to call multiple times (all operations idempotent)
 */
export async function seed(knex: Knex): Promise<void> {
  await seedBusinessCapabilities(knex);
  await seedApprovalWorkflows(knex);
}
