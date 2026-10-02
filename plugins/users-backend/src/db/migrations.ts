/**
 * Platform user, role and audit schema.
 *
 * User records used to live in `catalog/users.seed.yaml`, rewritten in place by
 * this plugin, with the audit trail appended to a JSONL file beside it. That
 * fails in a container twice over: the paths resolve relative to
 * `process.cwd()`, which is `packages/backend` for the dev server but `/app`
 * in the image — so the runtime file landed outside the app while the catalog
 * read the copy baked into the image — and neither path is on a persistent
 * volume, so every role change and every audit record died with the container.
 *
 * The records now live here. A container restart changes nothing; the seed
 * runs once, against an empty table.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('platform_users'))) {
    await knex.schema.createTable('platform_users', table => {
      // The GitHub login. Also the Catalog entity name, because the sign-in
      // resolver is usernameMatchingUserEntityName — the two must be equal or
      // the user cannot be resolved at all.
      table.string('name', 255).primary();
      table.string('display_name', 255);
      // JSON array of group names. A join table would answer "who is in group
      // X" more directly, but nothing asks that: every read is "what does this
      // user hold", and the array keeps one row per user.
      table.text('member_of').notNullable().defaultTo('[]');
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.string('updated_by', 255);
      table.timestamp('updated_at');
    });
  }

  // Append-only. No update or delete path exists in the repository, and
  // removing a user leaves their audit records standing — the question an
  // inspector asks is "who granted this role", and deleting the account must
  // not erase the answer.
  if (!(await knex.schema.hasTable('user_audit_events'))) {
    await knex.schema.createTable('user_audit_events', table => {
      table.string('id', 255).primary();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.string('actor', 255).notNullable();
      table.string('action', 30).notNullable(); // CREATED | UPDATED | REMOVED
      table.string('entity', 255).notNullable();
      table.text('old_value');
      table.text('new_value');

      table.index(['entity']);
      table.index(['timestamp']);
    });
  }

  if (!(await knex.schema.hasTable('user_sign_in_events'))) {
    await knex.schema.createTable('user_sign_in_events', table => {
      table.string('id', 255).primary();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.string('actor', 255).notNullable();
      table.string('provider', 50).notNullable();

      table.index(['timestamp']);
    });
  }

  // NXD-108. Current state of the GitHub team reconciler, one row per user
  // and team: what it last saw, not what it did — what it did goes to
  // user_audit_events. Mutable on purpose, so it is not append-only, and safe
  // to lose: the next run rebuilds it from GitHub.
  if (!(await knex.schema.hasTable('github_team_sync_state'))) {
    await knex.schema.createTable('github_team_sync_state', table => {
      // The GitHub login, which is also platform_users.name. Not a foreign
      // key: removing a user must leave the row until the reconciler has
      // taken them out of the team and recorded it.
      table.text('user_id').notNullable();
      table.text('team_slug').notNullable();
      table
        .enu('status', ['active', 'invited', 'not_in_org', 'error'])
        .notNullable();
      table.timestamp('last_checked').notNullable().defaultTo(knex.fn.now());
      table.text('last_error').nullable();

      table.primary(['user_id', 'team_slug']);
    });
  }

  await makeAuditTrailsAppendOnly(knex);
}

/**
 * NXD-092. The comment above said "append-only"; until now only the
 * repository's lack of an update method made it so. Row triggers refuse
 * UPDATE and DELETE on both trails, and a statement trigger refuses
 * TRUNCATE, which row triggers do not see. The sign-in trail is included:
 * who signed in, and when, is the other half of attributing an action.
 *
 * PostgreSQL only; SQLite backs unit tests, not records.
 */
async function makeAuditTrailsAppendOnly(knex: Knex): Promise<void> {
  if (knex.client.config.client !== 'pg') {
    return;
  }

  await knex.raw(`
    CREATE OR REPLACE FUNCTION users_append_only()
    RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION
        'USERS_APPEND_ONLY: % is append-only; % is not permitted',
        TG_TABLE_NAME, TG_OP USING ERRCODE = '23514';
    END;
    $fn$ LANGUAGE plpgsql
  `);

  // Dropped and recreated: CREATE TRIGGER has no IF NOT EXISTS before
  // PostgreSQL 14, and this migration runs on every boot.
  for (const table of ['user_audit_events', 'user_sign_in_events']) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${table}_append_only ON ${table}`);
    await knex.raw(
      `CREATE TRIGGER ${table}_append_only BEFORE UPDATE OR DELETE ON ${table} ` +
        'FOR EACH ROW EXECUTE FUNCTION users_append_only()',
    );
    await knex.raw(`DROP TRIGGER IF EXISTS ${table}_no_truncate ON ${table}`);
    await knex.raw(
      `CREATE TRIGGER ${table}_no_truncate BEFORE TRUNCATE ON ${table} ` +
        'FOR EACH STATEMENT EXECUTE FUNCTION users_append_only()',
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('github_team_sync_state');
  await knex.schema.dropTableIfExists('user_sign_in_events');
  await knex.schema.dropTableIfExists('user_audit_events');
  await knex.schema.dropTableIfExists('platform_users');
}
