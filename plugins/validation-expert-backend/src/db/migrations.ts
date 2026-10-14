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

  // NXD-119. Whether the decision carries the validation expert's and QA's
  // approval; the release gate requires it for a GMP-relevant product.
  if (!(await knex.schema.hasColumn('validation_decisions', 'gmp_rule'))) {
    await knex.schema.alterTable('validation_decisions', table => {
      table.boolean('gmp_rule').nullable();
    });
  }

  // NXD-119. The electronic signatures a decision is the outcome of: one row
  // per signature, never changed and never removed.
  if (!(await knex.schema.hasTable('validation_decision_signatures'))) {
    await knex.schema.createTable('validation_decision_signatures', table => {
      table.string('id', 255).primary();
      table.string('context_id', 255).notNullable().index();
      table.string('role', 32).notNullable(); // VALIDATION_EXPERT | QUALITY_ASSURANCE
      table.string('verdict', 16).notNullable(); // APPROVED | REJECTED
      table.text('justification').notNullable();
      table.string('signed_by', 255).notNullable();
      table.string('signed_at', 64).notNullable();
      table.string('reauth_method', 64).notNullable();
      table.unique(['context_id', 'role']);
      table.unique(['context_id', 'signed_by']);
      table.foreign('context_id').references('id').inTable('validation_contexts');
    });
  }

  await scopeDecisionsToProductVersions(knex);
  await makeSignaturesAppendOnly(knex);
}

/**
 * NXD-127. A validation decision, its signatures and the evidence review it
 * rests on belong to one product version, not to the URS baseline: several
 * versions of several products can be bound to one baseline, and approving
 * one must not cover the others. The context (one per baseline) stays.
 *
 * Rows written before keep a null product_version_id: they were decided per
 * baseline, and assigning them a version afterwards would be rewriting what
 * the signers attested. They cover no version.
 */
async function scopeDecisionsToProductVersions(knex: Knex): Promise<void> {
  for (const table of [
    'validation_runs',
    'validation_decisions',
    'validation_decision_signatures',
  ]) {
    if (!(await knex.schema.hasColumn(table, 'product_version_id'))) {
      await knex.schema.alterTable(table, t => {
        t.string('product_version_id', 255).nullable().index();
      });
    }
  }
  if (knex.client.config.client !== 'pg') {
    return;
  }
  await knex.raw(
    'ALTER TABLE validation_decisions DROP CONSTRAINT IF EXISTS validation_decisions_context_id_unique',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS validation_decisions_context_version_unique ' +
      'ON validation_decisions (context_id, product_version_id)',
  );
  await knex.raw(
    'ALTER TABLE validation_decision_signatures DROP CONSTRAINT IF EXISTS ' +
      'validation_decision_signatures_context_id_role_unique',
  );
  await knex.raw(
    'ALTER TABLE validation_decision_signatures DROP CONSTRAINT IF EXISTS ' +
      'validation_decision_signatures_context_id_signed_by_unique',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS validation_decision_signatures_version_role_unique ' +
      'ON validation_decision_signatures (context_id, product_version_id, role)',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS validation_decision_signatures_version_signer_unique ' +
      'ON validation_decision_signatures (context_id, product_version_id, signed_by)',
  );
}

/**
 * NXD-119. A signature is a record of who attested what, when; it must not be
 * edited or deleted afterwards. Row triggers refuse UPDATE and DELETE and a
 * statement trigger refuses TRUNCATE — the users-backend pattern (NXD-092).
 * PostgreSQL only; SQLite backs unit tests, not records.
 */
async function makeSignaturesAppendOnly(knex: Knex): Promise<void> {
  if (knex.client.config.client !== 'pg') {
    return;
  }
  await knex.raw(`
    CREATE OR REPLACE FUNCTION validation_append_only()
    RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION
        'VALIDATION_APPEND_ONLY: % is append-only; % is not permitted',
        TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
    END;
    $fn$ LANGUAGE plpgsql
  `);
  // Dropped and recreated: CREATE TRIGGER has no IF NOT EXISTS before
  // PostgreSQL 14, and this migration runs on every boot.
  const table = 'validation_decision_signatures';
  await knex.raw(`DROP TRIGGER IF EXISTS ${table}_append_only ON ${table}`);
  await knex.raw(
    `CREATE TRIGGER ${table}_append_only BEFORE UPDATE OR DELETE ON ${table} ` +
      'FOR EACH ROW EXECUTE FUNCTION validation_append_only()',
  );
  await knex.raw(`DROP TRIGGER IF EXISTS ${table}_no_truncate ON ${table}`);
  await knex.raw(
    `CREATE TRIGGER ${table}_no_truncate BEFORE TRUNCATE ON ${table} ` +
      'FOR EACH STATEMENT EXECUTE FUNCTION validation_append_only()',
  );
}
