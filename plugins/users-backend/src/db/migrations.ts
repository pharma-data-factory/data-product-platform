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

}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_sign_in_events');
  await knex.schema.dropTableIfExists('user_audit_events');
  await knex.schema.dropTableIfExists('platform_users');
}
