/**
 * Artifact Registry schema.
 *
 * Four tables: who may publish (`publishers`), what exists
 * (`artifacts`), what was released (`artifact_versions`), and who moved a
 * version through its lifecycle (`artifact_version_transitions`, NXD-146).
 *
 * Identity is enforced here, not only in the service, for the reason recorded
 * in NXD-009: an application-level uniqueness check does not survive two
 * concurrent writers. `lower()` expression indexes are used where the service
 * compares case-insensitively, so the database agrees with it rather than
 * permitting what it forbids.
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('publishers'))) {
    await knex.schema.createTable('publishers', table => {
      table.string('id', 255).primary();
      table.string('namespace', 64).notNullable();
      table.string('display_name', 255).notNullable();
      table.text('description');
      table.text('member_groups').notNullable().defaultTo('[]');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').notNullable().defaultTo(1);

      table.unique(['namespace']);
    });
  }

  if (!(await knex.schema.hasTable('artifacts'))) {
    await knex.schema.createTable('artifacts', table => {
      table.string('id', 255).primary();
      table.string('namespace', 64).notNullable();
      table.string('name', 64).notNullable();
      table.string('kind', 32).notNullable();
      table.string('display_name', 255).notNullable();
      table.text('description');
      table.string('publisher_id', 255).notNullable();
      table.text('tags').notNullable().defaultTo('[]');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
      table.integer('revision').notNullable().defaultTo(1);

      table.index(['namespace']);
      table.index(['kind']);
      // The coordinate, minus the version, is the Artifact's identity.
      table.unique(['namespace', 'name']);
      table.foreign('publisher_id').references('id').inTable('publishers');
    });
  }

  if (!(await knex.schema.hasTable('artifact_versions'))) {
    await knex.schema.createTable('artifact_versions', table => {
      table.string('id', 255).primary();
      table.string('artifact_id', 255).notNullable();
      table.string('version', 50).notNullable();
      table.string('lifecycle', 32).notNullable().defaultTo('DRAFT');
      table.string('certification_status', 32);
      table.string('source_ref', 512);
      table.text('manifest');
      table.text('distribution');
      table.text('dependencies');
      table.text('release_notes');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.integer('revision').notNullable().defaultTo(1);

      table.index(['artifact_id']);
      table.index(['lifecycle']);
      // A version of an Artifact is published once. Re-publishing the same
      // coordinate with different content would make provenance meaningless:
      // a Product pinning acme/x@1.0 has to keep meaning one thing.
      table.unique(['artifact_id', 'version']);
      table.foreign('artifact_id').references('id').inTable('artifacts');
    });
  }

  await createCaseInsensitiveIndexes(knex);
  await addPublisherTrustColumns(knex);
  await addReleaseBuildColumns(knex);
  await createTransitionTrail(knex);
}

/**
 * NXD-146: every lifecycle transition, with its actor. Before this the
 * registry recorded none: a RELEASED version could not say who reviewed,
 * certified or published it, and segregation of duties had nothing to be
 * decided from. Append-only in PostgreSQL by this plugin's own trigger
 * function, NXD-092's shape; SQLite backs the unit suites and the triggers
 * are proven in `migrations.postgres.test.ts`.
 */
async function createTransitionTrail(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('artifact_version_transitions'))) {
    await knex.schema.createTable('artifact_version_transitions', table => {
      table.string('id', 255).primary();
      table.string('artifact_version_id', 255).notNullable().index();
      table.string('act', 16).notNullable();
      table.string('from_lifecycle', 32).notNullable();
      table.string('to_lifecycle', 32).notNullable();
      table.string('from_certification_status', 32).nullable();
      table.string('to_certification_status', 32).nullable();
      table.string('actor', 255).notNullable();
      table.timestamp('occurred_at').notNullable();
      table.text('details').notNullable();
    });
  }
  if (knex.client.config.client !== 'pg') return;
  await knex.raw(`
    CREATE OR REPLACE FUNCTION artifact_registry_append_only()
    RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION
        'ARTIFACT_REGISTRY_APPEND_ONLY: % is append-only; % is not permitted',
        TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
    END;
    $fn$ LANGUAGE plpgsql
  `);
  const table = 'artifact_version_transitions';
  const triggers: Array<[string, string]> = [
    [`${table}_append_only`, `BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW`],
    [`${table}_no_truncate`, `BEFORE TRUNCATE ON ${table} FOR EACH STATEMENT`],
  ];
  for (const [name, definition] of triggers) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${name} ON ${table}`);
    await knex.raw(
      `CREATE TRIGGER ${name} ${definition} EXECUTE FUNCTION artifact_registry_append_only()`,
    );
  }
}

/**
 * NXD-137: the release build a runnable version is — image, digest, commit,
 * release. Nullable, because a template or a listing has none and every
 * version registered before this has none either.
 */
async function addReleaseBuildColumns(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('artifact_versions'))) return;
  if (await knex.schema.hasColumn('artifact_versions', 'release_image_digest')) return;
  await knex.schema.alterTable('artifact_versions', table => {
    table.string('release_image_repository', 255).nullable();
    table.string('release_image_digest', 80).nullable();
    table.string('release_commit_sha', 64).nullable();
    table.string('release_url', 512).nullable();
  });
}

/**
 * Namespace and name are compared case-insensitively by the service, because
 * `Acme` and `acme` must not be two publishers. These indexes make the
 * database enforce the same rule. Expression indexes with `IF NOT EXISTS` work
 * in both dialects in use (PostgreSQL in production, SQLite in tests).
 */
/**
 * Phase 7 (P7-S1): Publisher trust level and external publisher flag.
 *
 * Both columns are nullable so the migration is safe on existing DBs.
 * The repository defaults to 'INTERNAL' / false when the columns are NULL,
 * so pre-existing `nexora` publisher rows behave correctly without a data
 * migration.
 */
async function addPublisherTrustColumns(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('publishers'))) return;
  const hasTrust = await knex.schema.hasColumn('publishers', 'trust_level');
  if (!hasTrust) {
    await knex.schema.alterTable('publishers', table => {
      table.string('trust_level', 32).nullable(); // INTERNAL | PARTNER | COMMUNITY
      table.boolean('external_publisher').nullable();
    });
  }
}

async function createCaseInsensitiveIndexes(knex: Knex): Promise<void> {
  await knex.raw(
    'create unique index if not exists publishers_namespace_ci_unique ' +
      'on publishers (lower(namespace))',
  );
  await knex.raw(
    'create unique index if not exists artifacts_coordinate_ci_unique ' +
      'on artifacts (lower(namespace), lower(name))',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artifact_version_transitions');
  await knex.schema.dropTableIfExists('artifact_versions');
  await knex.schema.dropTableIfExists('artifacts');
  await knex.schema.dropTableIfExists('publishers');
}
