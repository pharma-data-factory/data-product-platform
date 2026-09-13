/**
 * Validation Expert schema migrations (idempotent create-if-missing).
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('validation_runs'))) {
    await knex.schema.createTable('validation_runs', table => {
      table.string('id', 255).primary();
      table.string('candidate', 512).notNullable();
      table.string('candidate_commit', 255);
      table.string('baseline_id', 255).notNullable();
      table.string('type', 16).notNullable();
      table.string('status', 32).notNullable();
      table.string('created_at', 64).notNullable();
      table.jsonb('created_by').notNullable();
      table.string('started_at', 64);
      table.string('completed_at', 64);
      table.jsonb('executions').notNullable().defaultTo('[]');
      table.string('context_id', 255);
      table.string('product_id', 255);
      table.string('product_version_id', 255);
      table.string('product_baseline_id', 255);
      table.index(['type']);
      table.index(['status']);
      table.index(['baseline_id']);
      table.index(['context_id']);
    });
  }

  if (await knex.schema.hasTable('validation_runs')) {
    const hasContextId = await knex.schema.hasColumn(
      'validation_runs',
      'context_id',
    );
    if (!hasContextId) {
      await knex.schema.alterTable('validation_runs', table => {
        table.string('context_id', 255);
        table.index(['context_id']);
      });
    }
    for (const column of [
      'product_id',
      'product_version_id',
      'product_baseline_id',
    ]) {
      if (!(await knex.schema.hasColumn('validation_runs', column))) {
        await knex.schema.alterTable('validation_runs', table => {
          table.string(column, 255);
        });
      }
    }
  }

  if (!(await knex.schema.hasTable('validation_findings'))) {
    await knex.schema.createTable('validation_findings', table => {
      table.string('id', 255).primary();
      table.string('run_id', 255);
      table.string('test_id', 255).notNullable();
      table.string('severity', 64).notNullable();
      table.text('description').notNullable();
      table.string('status', 64).notNullable();
      table.jsonb('requirement_ids').notNullable().defaultTo('[]');
      table.text('expected_result');
      table.text('actual_result');
      table.string('source', 32).notNullable();
      table.index(['run_id']);
      table.index(['status']);
    });
  }

  if (!(await knex.schema.hasTable('validation_evidence'))) {
    await knex.schema.createTable('validation_evidence', table => {
      table.string('id', 255).primary();
      table.string('run_id', 255);
      table.string('test_id', 255);
      table.string('test_execution_id', 255);
      table.string('evidence_type', 128).notNullable();
      table.text('reference').notNullable();
      table.string('checksum', 128);
      table.string('created_at', 64).notNullable();
      table.string('created_by', 255);
      table.string('candidate', 512);
      table.string('product_id', 255);
      table.string('product_version_id', 255);
      table.string('product_baseline_id', 255);
      table.string('urs_baseline_id', 255);
      table.string('source', 32).notNullable();
      table.index(['run_id']);
      table.index(['product_version_id']);
    });
  }

  if (await knex.schema.hasTable('validation_evidence')) {
    for (const column of [
      'product_id',
      'product_version_id',
      'product_baseline_id',
      'urs_baseline_id',
    ]) {
      if (!(await knex.schema.hasColumn('validation_evidence', column))) {
        await knex.schema.alterTable('validation_evidence', table => {
          table.string(column, 255);
        });
      }
    }
  }

  if (!(await knex.schema.hasTable('validation_contexts'))) {
    await knex.schema.createTable('validation_contexts', table => {
      table.string('id', 255).primary();
      table.jsonb('source').notNullable();
      table.string('requirement_set_id', 255).notNullable();
      table.string('baseline_id', 255).notNullable();
      table.string('status', 64).notNullable();
      table.string('product_id', 255);
      table.string('product_version_id', 255);
      table.string('product_baseline_id', 255);
      table.jsonb('product_ref');
      table.string('created_at', 64).notNullable();
      table.string('created_by', 255).notNullable();
      table.index(['baseline_id']);
    });
  }

  if (await knex.schema.hasTable('validation_contexts')) {
    for (const column of [
      'product_id',
      'product_version_id',
      'product_baseline_id',
    ]) {
      if (!(await knex.schema.hasColumn('validation_contexts', column))) {
        await knex.schema.alterTable('validation_contexts', table => {
          table.string(column, 255);
        });
      }
    }
    if (!(await knex.schema.hasColumn('validation_contexts', 'product_ref'))) {
      await knex.schema.alterTable('validation_contexts', table => {
        table.jsonb('product_ref');
      });
    }
    // Uniqueness applies only to live contexts: a SUPERSEDED context releases
    // the (requirementSetId, baselineId) pair for a requalification context.
    await knex.raw(
      `ALTER TABLE validation_contexts DROP CONSTRAINT IF EXISTS validation_contexts_requirement_set_id_baseline_id_unique`,
    );
    await knex.raw(
      `CREATE UNIQUE INDEX IF NOT EXISTS validation_contexts_live_source_uq ON validation_contexts (requirement_set_id, baseline_id) WHERE status <> 'SUPERSEDED'`,
    );
  }

  if (!(await knex.schema.hasTable('validation_context_audit'))) {
    await knex.schema.createTable('validation_context_audit', table => {
      table.string('id', 255).primary();
      table.string('context_id', 255).notNullable();
      table.string('event_type', 64).notNullable();
      table.string('actor', 255).notNullable();
      table.jsonb('details');
      table.string('created_at', 64).notNullable();
      table.index(['context_id']);
    });
  }

  if (!(await knex.schema.hasTable('validation_counters'))) {
    await knex.schema.createTable('validation_counters', table => {
      table.string('counter_key', 64).primary();
      table.integer('counter_value').notNullable().defaultTo(0);
    });
  }
}
