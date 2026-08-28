/**
 * URS Composer Database Migrations
 *
 * Defines all schema for URS Composer P1A persistence.
 * Executed by Backstage DatabaseService on plugin startup.
 *
 * All tables use UUID primary keys and include audit/timing columns.
 * Foreign keys enforce referential integrity.
 * Indexes optimize common query patterns.
 */

import { Knex } from 'knex';

/**
 * Migration: Create URS Composer schema
 *
 * Tables:
 * - business_capabilities: Canonical business capability reference model
 * - requirement_sets: User requirements specifications (URS documents)
 * - requirement_versions: Versioned requirements with lifecycle
 * - baselines: Immutable snapshots of requirement set versions
 * - approval_workflows: Reusable workflow templates
 * - approval_instances: Concrete approval execution for one baseline
 * - approval_steps: Individual approval steps within an instance
 * - requirements: P0 legacy requirement storage (deprecated)
 * - audit_events: Append-only immutable audit trail
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // BUSINESS CAPABILITIES
  // ============================================================================

  if (!(await knex.schema.hasTable('business_capabilities'))) {
    await knex.schema.createTable('business_capabilities', table => {
      table.string('id', 255).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('domain', 100).notNullable();
      table.string('status', 50).notNullable().defaultTo('ACTIVE');
      table.string('source', 255);
      table.string('documentation_ref', 1024);
      table.integer('version').defaultTo(1);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 255);

      table.index(['status']);
      table.index(['domain']);
    });
  }

  // ============================================================================
  // REQUIREMENT SETS (P0 + P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('requirement_sets'))) {
    await knex.schema.createTable('requirement_sets', table => {
      table.string('id', 255).primary();
      table.string('requirement_set_id', 255).notNullable().unique();
      table.integer('version_number').notNullable();
      table.text('business_capability_refs');
      table.text('business_need').notNullable();
      table.text('desired_outcome');
      table.text('business_value');
      table.text('stakeholders');
      table.text('process_context');
      table.string('solution_type', 50).notNullable();
      table.string('solution_name', 255);
      table.string('solution_catalog_ref', 255);
      table.text('scope');
      table.text('out_of_scope');
      table.string('gxp_relevance', 50);
      table.boolean('patient_impact').defaultTo(false);
      table.boolean('data_integrity_impact').defaultTo(false);
      table.boolean('electronic_records').defaultTo(false);
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('template_version', 50);
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').defaultTo(1);

      table.index(['status']);
      table.index(['created_at']);
      table.index(['solution_type']);
    });
  } else if (!(await knex.schema.hasColumn('requirement_sets', 'business_capability_refs'))) {
    await knex.schema.alterTable('requirement_sets', table => {
      table.text('business_capability_refs');
    });
  }

  // ============================================================================
  // REQUIREMENT VERSIONS (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('requirement_versions'))) {
    await knex.schema.createTable('requirement_versions', table => {
      table.string('id', 255).primary();
      table.string('requirement_id', 255).notNullable();
      table.string('version', 50).notNullable();
      table.integer('version_number').notNullable();
      table.string('title', 255).notNullable();
      table.text('statement').notNullable();
      table.text('rationale');
      table.string('category', 100);
      table.string('priority', 50);
      table.text('acceptance_intent');
      table.string('gxp_relevance', 50);
      table.string('source', 255);
      table.string('owner', 255);
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('revision_of', 255);
      table.text('revision_reason');
      table.string('superseded_by', 255);
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.integer('revision').defaultTo(1);

      table.index(['requirement_id']);
      table.index(['version_number']);
      table.index(['status']);
      table.unique(['requirement_id', 'version']);
    });
  }

  // ============================================================================
  // BASELINES (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('baselines'))) {
    await knex.schema.createTable('baselines', table => {
      table.string('id', 255).primary();
      table.string('requirement_set_id', 255).notNullable();
      table.string('baseline_version', 50).notNullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.text('requirement_version_ids').notNullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('approved_by', 255);
      table.timestamp('approved_at');
      table.string('superseded_by', 255);
      table.integer('revision').defaultTo(1);

      table.index(['requirement_set_id']);
      table.index(['baseline_version']);
      table.index(['status']);
      table.unique(['requirement_set_id', 'baseline_version']);
      table.foreign('requirement_set_id').references('id').inTable('requirement_sets');
    });
  }

  // ============================================================================
  // APPROVAL WORKFLOWS (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('approval_workflows'))) {
    await knex.schema.createTable('approval_workflows', table => {
      table.string('id', 255).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.text('steps').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('created_by', 255);
    });
  }

  // ============================================================================
  // APPROVAL INSTANCES (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('approval_instances'))) {
    await knex.schema.createTable('approval_instances', table => {
      table.string('id', 255).primary();
      table.string('workflow_id', 255).notNullable();
      table.string('baseline_id', 255).notNullable();
      table.string('status', 50).notNullable().defaultTo('NOT_STARTED');
      table.integer('current_step_sequence').defaultTo(0);
      table.string('started_by', 255).notNullable();
      table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
      table.string('completed_by', 255);
      table.timestamp('completed_at');
      table.integer('revision').defaultTo(1);

      table.index(['baseline_id']);
      table.index(['status']);
      table.foreign('workflow_id').references('id').inTable('approval_workflows');
      table.foreign('baseline_id').references('id').inTable('baselines');
    });
  }

  // ============================================================================
  // APPROVAL STEPS (P1A)
  // ============================================================================

  if (!(await knex.schema.hasTable('approval_steps'))) {
    await knex.schema.createTable('approval_steps', table => {
      table.string('id', 255).primary();
      table.string('approval_instance_id', 255).notNullable();
      table.integer('sequence').notNullable();
      table.string('role', 100).notNullable();
      table.string('status', 50).notNullable().defaultTo('PENDING');
      table.string('assigned_to', 255);
      table.string('decision', 50);
      table.text('comment');
      table.string('acted_by', 255);
      table.timestamp('acted_at');

      table.index(['approval_instance_id']);
      table.index(['status']);
      table.foreign('approval_instance_id').references('id').inTable('approval_instances');
    });
  }

  // ============================================================================
  // REQUIREMENTS (P0 - BACKWARD COMPATIBILITY)
  // ============================================================================

  if (!(await knex.schema.hasTable('requirements'))) {
    await knex.schema.createTable('requirements', table => {
      table.string('id', 255).primary();
      table.string('requirement_set_id', 255).notNullable();
      table.string('requirement_id', 255).notNullable();
      table.string('title', 255).notNullable();
      table.text('statement').notNullable();
      table.text('rationale');
      table.string('category', 100);
      table.string('priority', 50);
      table.text('acceptance_intent');
      table.string('gxp_relevance', 50);
      table.string('source', 255);
      table.string('owner', 255);
      table.string('status', 50).notNullable().defaultTo('DRAFT');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['requirement_set_id']);
      table.index(['requirement_id']);
      table.foreign('requirement_set_id').references('id').inTable('requirement_sets');
    });
  }

  // ============================================================================
  // AUDIT EVENTS (APPEND-ONLY)
  // ============================================================================

  if (!(await knex.schema.hasTable('audit_events'))) {
    await knex.schema.createTable('audit_events', table => {
      table.string('id', 255).primary();
      table.string('entity_type', 100).notNullable();
      table.string('entity_id', 255).notNullable();
      // entity_version records the semantic/string version identifier of the
      // audited entity (RequirementVersion.version / Baseline.baselineVersion,
      // e.g. "1.0"), NOT the integer revision counter. Stored as text so audit
      // history is never lossy.
      table.text('entity_version');
      table.string('event_type', 100).notNullable();
      table.text('old_value');
      table.text('new_value');
      table.string('actor', 255).notNullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.string('correlation_id', 255);
      table.text('reason');
      table.text('metadata');

      table.index(['entity_id']);
      table.index(['timestamp']);
      table.index(['entity_type']);
    });
  } else {
    // Existing database: ensure entity_version is text (it was created as
    // integer, but the active version model emits semantic/string versions such
    // as "1.0"). Idempotent — remove any integer-typed column default and
    // widen the type. Existing audit rows (if any) are NULL or integers and
    // widen losslessly to text.
    const [col] = await knex('information_schema.columns')
      .where({ table_schema: 'public', table_name: 'audit_events', column_name: 'entity_version' })
      .select('data_type');
    if (col && col.data_type === 'integer') {
      // entity_version has no foreign key or default; purely widen the type.
      await knex.schema.alterTable('audit_events', table => {
        table.text('entity_version').alter();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Tables removed in reverse dependency order
  await knex.schema.dropTableIfExists('audit_events');
  await knex.schema.dropTableIfExists('approval_steps');
  await knex.schema.dropTableIfExists('approval_instances');
  await knex.schema.dropTableIfExists('approval_workflows');
  await knex.schema.dropTableIfExists('baselines');
  await knex.schema.dropTableIfExists('requirement_versions');
  await knex.schema.dropTableIfExists('requirements');
  await knex.schema.dropTableIfExists('requirement_sets');
  await knex.schema.dropTableIfExists('business_capabilities');
}
