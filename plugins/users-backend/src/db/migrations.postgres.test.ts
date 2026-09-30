/**
 * The users migration against the database it actually runs on (NXD-092).
 *
 * The router and seed suites use SQLite, which has no triggers of the kind
 * that make a trail append-only. Follows NXD-005: skips on a developer
 * machine without PostgreSQL, fails in CI, where the database is provisioned.
 */

import knex, { Knex } from 'knex';
import { up } from './migrations';

const CONNECTION = {
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TEST_DB_PORT || '5435', 10),
  user: process.env.TEST_DB_USER || 'urs_test',
  password: process.env.TEST_DB_PASSWORD || 'test_pass123',
  database: process.env.TEST_DB_NAME || 'urs_composer_test',
};

/** Own schema, so this cannot collide with a suite running beside it. */
const SCHEMA = 'test_users_migrations';

describe('users migration on PostgreSQL', () => {
  let db: Knex | undefined;
  let available = false;

  beforeAll(async () => {
    const admin = knex({ client: 'pg', connection: CONNECTION });
    try {
      await admin.raw('select 1');
      available = true;
    } catch (error) {
      await admin.destroy().catch(() => {});
      if (process.env.CI) {
        throw new Error(
          `PostgreSQL is required in CI but was unreachable at ` +
            `${CONNECTION.host}:${CONNECTION.port}: ${(error as Error).message}`,
        );
      }
      return;
    }
    await admin.raw('drop schema if exists ?? cascade', [SCHEMA]);
    await admin.raw('create schema ??', [SCHEMA]);
    await admin.destroy();
    db = knex({ client: 'pg', connection: CONNECTION, searchPath: [SCHEMA] });
  }, 60000);

  afterAll(async () => {
    await db?.destroy().catch(() => {});
    if (!available) {
      return;
    }
    const admin = knex({ client: 'pg', connection: CONNECTION });
    await admin.raw('drop schema if exists ?? cascade', [SCHEMA]);
    await admin.destroy();
  }, 60000);

  it.each([
    [
      'user_audit_events',
      {
        id: 'ua-1',
        actor: 'user:default/admin',
        action: 'UPDATED',
        entity: 'user:default/alice',
        new_value: '{"memberOf":["approvers"]}',
      },
      { actor: 'user:default/someone-else' },
    ],
    [
      'user_sign_in_events',
      { id: 'si-1', actor: 'user:default/alice', provider: 'github' },
      { actor: 'user:default/someone-else' },
    ],
  ])('makes %s append-only', async (table, record, change) => {
    if (!available) {
      console.warn(
        'Skipping users PostgreSQL migration test: no database. Run ' +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return;
    }
    const database = db as Knex;
    await up(database);
    // Re-running must replace the triggers, not fail on them.
    await up(database);

    await database(table).insert(record);

    await expect(
      database(table).where({ id: record.id }).update(change),
    ).rejects.toThrow(new RegExp(`USERS_APPEND_ONLY: ${table} .* UPDATE`));
    await expect(
      database(table).where({ id: record.id }).delete(),
    ).rejects.toThrow(new RegExp(`USERS_APPEND_ONLY: ${table} .* DELETE`));
    await expect(database.raw(`truncate ${table}`)).rejects.toThrow(
      new RegExp(`USERS_APPEND_ONLY: ${table} .* TRUNCATE`),
    );

    const stored = await database(table).where({ id: record.id }).first();
    expect(stored.actor).toBe(record.actor);
  }, 60000);

  it('still lets a user record be changed and removed', async () => {
    if (!available) {
      return;
    }
    // The records the trail is about stay editable; only the trail is frozen.
    const database = db as Knex;
    await up(database);
    await database('platform_users').insert({
      name: 'bob',
      member_of: '[]',
      created_by: 'user:default/admin',
    });
    await database('platform_users')
      .where({ name: 'bob' })
      .update({ member_of: '["approvers"]' });
    await database('platform_users').where({ name: 'bob' }).delete();
    expect(await database('platform_users').where({ name: 'bob' }).first()).toBeUndefined();
  }, 60000);
});
