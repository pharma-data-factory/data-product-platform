/**
 * Installations schema (NXD-129 slice 1, NXD-139).
 *
 * Five tables:
 * - `runtime_targets` — places a provider runs workloads. Deliberately not
 *   called "installations" or "instances": `NXD-078`'s installation identity
 *   is a Nexora instance, and the two must not share a table or a name.
 * - `artifact_installations` — governed desired state, and the observed
 *   state a provider reports. The observed columns are written only by the
 *   provider API (NXD-143), which added routes and no migration.
 * - `installation_acts` — every install, upgrade and removal as attested
 *   (the `product_signatures` shape of NXD-128). Append-only.
 * - `installation_audit_events` — what changed, before and after. Append-only.
 * - `installation_qualifications` — the IQ record of each desired revision
 *   of a GMP-relevant installation. Mutable on purpose: evidence and QA's
 *   sign-off arrive later (slices after this one), each guarded by revision
 *   and each written to the audit trail and, for the sign-off, to the acts.
 *
 * Append-only is enforced in PostgreSQL by a trigger function of this
 * plugin's own, `installations_append_only()`, the NXD-092 shape: row
 * triggers refuse UPDATE and DELETE, a statement trigger refuses TRUNCATE.
 * No foreign key points into an append-only table, so no cascade can
 * collide with the triggers.
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('runtime_targets'))) {
    await knex.schema.createTable('runtime_targets', table => {
      table.string('id', 255).primary();
      table.string('name', 64).notNullable();
      table.string('display_name', 255).notNullable();
      table.text('description');
      table.string('provider_kind', 64).notNullable();
      // NXD-129 slice 2: the externalAccess subject of the provider that may
      // read this target's desired state and report what it observes.
      table.string('provider_subject', 255).nullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.integer('revision').notNullable().defaultTo(1);
    });
  }

  if (!(await knex.schema.hasTable('artifact_installations'))) {
    await knex.schema.createTable('artifact_installations', table => {
      table.string('id', 255).primary();
      table.string('target_id', 255).notNullable();
      table.string('name', 64).notNullable();
      table.string('artifact_namespace', 64).notNullable();
      table.string('artifact_name', 64).notNullable();

      // Desired state: what a person decided, through an act.
      table.string('desired_state', 16).notNullable();
      table.string('desired_artifact_ref', 255).notNullable();
      table.string('desired_version', 50).notNullable();
      table.string('desired_artifact_version_id', 255).notNullable();
      table.string('desired_image_repository', 255).notNullable();
      table.string('desired_image_digest', 80).notNullable();
      table.text('desired_config').notNullable();
      table.string('desired_config_hash', 80).notNullable();
      table.integer('desired_revision').notNullable();
      table.string('desired_changed_by', 255).notNullable();
      table.timestamp('desired_changed_at').notNullable();

      // Observed state: written only by the provider API (NXD-143).
      table.string('observed_state', 16).nullable();
      table.integer('observed_desired_revision').nullable();
      table.string('observed_image_digest', 80).nullable();
      table.string('observed_config_hash', 80).nullable();
      table.text('observed_message').nullable();
      table.string('observed_reported_by', 255).nullable();
      table.timestamp('observed_reported_at').nullable();

      table.boolean('gmp_relevant').notNullable();
      table.string('gmp_classification_source', 16).notNullable();
      table.string('qualification_status', 32).notNullable();

      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.integer('revision').notNullable().defaultTo(1);

      table.index(['target_id']);
      table.index(['artifact_namespace', 'artifact_name']);
      table.foreign('target_id').references('id').inTable('runtime_targets');
    });
  }

  if (!(await knex.schema.hasTable('installation_acts'))) {
    await knex.schema.createTable('installation_acts', table => {
      table.string('id', 255).primary();
      table.string('installation_id', 255).notNullable().index();
      table.string('act', 16).notNullable();
      table.integer('desired_revision').notNullable();
      table.string('artifact_ref', 255).notNullable();
      table.string('image_digest', 80).notNullable();
      table.string('config_hash', 80).notNullable();
      table.text('justification').notNullable();
      table.string('signed_by', 255).notNullable();
      table.string('signed_at', 64).notNullable();
      table.boolean('gmp_relevant').notNullable();
      table.string('gmp_classification_source', 16).notNullable();
      table.string('reauth_method', 64).nullable();
    });
  }

  if (!(await knex.schema.hasTable('installation_audit_events'))) {
    await knex.schema.createTable('installation_audit_events', table => {
      table.string('id', 255).primary();
      table.string('event_type', 64).notNullable();
      table.string('installation_id', 255).nullable().index();
      table.string('target_id', 255).nullable().index();
      table.string('actor', 255).notNullable();
      table.timestamp('occurred_at').notNullable();
      table.text('details').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('installation_qualifications'))) {
    await knex.schema.createTable('installation_qualifications', table => {
      table.string('id', 255).primary();
      table.string('installation_id', 255).notNullable();
      table.integer('desired_revision').notNullable();
      table.string('status', 32).notNullable();
      table.string('expected_image_digest', 80).notNullable();
      table.string('expected_config_hash', 80).notNullable();
      table.string('expected_target_id', 255).notNullable();
      // Evidence from a matching provider report (NXD-143); sign-off by QA
      // in a later slice, which adds a route, not schema.
      table.string('observed_image_digest', 80).nullable();
      table.string('observed_config_hash', 80).nullable();
      table.string('observed_target_id', 255).nullable();
      table.string('evidence_recorded_by', 255).nullable();
      table.timestamp('evidence_recorded_at').nullable();
      table.string('qualified_by', 255).nullable();
      table.timestamp('qualified_at').nullable();
      table.string('qualification_act_id', 255).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.integer('revision').notNullable().defaultTo(1);

      table.unique(['installation_id', 'desired_revision']);
      table
        .foreign('installation_id')
        .references('id')
        .inTable('artifact_installations');
    });
  }

  // Identity in the database, not only in the service (NXD-009): a target
  // name, and an installation name on its target, each exist once, compared
  // case-insensitively as the service compares them.
  await knex.raw(
    'create unique index if not exists runtime_targets_name_ci_unique ' +
      'on runtime_targets (lower(name))',
  );
  await knex.raw(
    'create unique index if not exists artifact_installations_target_name_ci_unique ' +
      'on artifact_installations (target_id, lower(name))',
  );

  await makeTrailsAppendOnly(knex);
  await addRegistryCredentials(knex);
}

/**
 * NXD-147: how a target's provider authenticates to private registries —
 * references into the target's secret store, as JSON. Nullable: a target
 * that pulls only public images needs none.
 */
async function addRegistryCredentials(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn('runtime_targets', 'registry_credentials')) return;
  await knex.schema.alterTable('runtime_targets', table => {
    table.text('registry_credentials').nullable();
  });
}

/**
 * NXD-092's pattern, in this plugin's own function (each plugin owns its
 * schema). PostgreSQL only; SQLite backs the unit suites, and the triggers
 * are proven in `migrations.postgres.test.ts`. Dropped and recreated on every
 * boot because CREATE TRIGGER has no IF NOT EXISTS before PostgreSQL 14.
 */
async function makeTrailsAppendOnly(knex: Knex): Promise<void> {
  if (knex.client.config.client !== 'pg') {
    return;
  }
  await knex.raw(`
    CREATE OR REPLACE FUNCTION installations_append_only()
    RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION
        'INSTALLATIONS_APPEND_ONLY: % is append-only; % is not permitted',
        TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
    END;
    $fn$ LANGUAGE plpgsql
  `);
  for (const table of ['installation_acts', 'installation_audit_events']) {
    const triggers: Array<[string, string]> = [
      [`${table}_append_only`, `BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW`],
      [`${table}_no_truncate`, `BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT`],
    ];
    for (const [name, definition] of triggers) {
      await knex.raw(`DROP TRIGGER IF EXISTS ${name} ON ${table}`);
      await knex.raw(
        `CREATE TRIGGER ${name} ${definition} EXECUTE FUNCTION installations_append_only()`,
      );
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('installation_qualifications');
  await knex.schema.dropTableIfExists('installation_audit_events');
  await knex.schema.dropTableIfExists('installation_acts');
  await knex.schema.dropTableIfExists('artifact_installations');
  await knex.schema.dropTableIfExists('runtime_targets');
}
