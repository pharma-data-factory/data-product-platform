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
      table.string('source', 32).notNullable();
      table.index(['run_id']);
    });
  }

  if (!(await knex.schema.hasTable('validation_contexts'))) {
    await knex.schema.createTable('validation_contexts', table => {
      table.string('id', 255).primary();
      table.jsonb('source').notNullable();
      table.string('requirement_set_id', 255).notNullable();
      table.string('baseline_id', 255).notNullable();
      table.string('status', 64).notNullable();
      table.string('created_at', 64).notNullable();
      table.string('created_by', 255).notNullable();
      table.unique(['requirement_set_id', 'baseline_id']);
      table.index(['baseline_id']);
    });
  }

  if (!(await knex.schema.hasTable('validation_counters'))) {
    await knex.schema.createTable('validation_counters', table => {
      table.string('counter_key', 64).primary();
      table.integer('counter_value').notNullable().defaultTo(0);
    });
  }

  // Phase 5 (P5-S1): Validation Decision — the terminal step.
  // One decision per ValidationContext (unique on context_id).
  // Inserting a second decision on the same context is refused by the unique
  // index; the service also checks this explicitly to produce a clear error.
  if (!(await knex.schema.hasTable('validation_decisions'))) {
    await knex.schema.createTable('validation_decisions', table => {
      table.string('id', 255).primary();
      table.string('context_id', 255).notNullable().unique();
      table.string('status', 32).notNullable(); // APPROVED | CONDITIONAL | REJECTED
      table.text('justification').notNullable();
      table.text('conditions').nullable();
      table.string('decided_by', 255).notNullable();
      table.string('decided_at', 64).notNullable();
      table.foreign('context_id').references('id').inTable('validation_contexts');
    });
  }
}
