/**
 * The `github_team_sync_state` table (NXD-108) on SQLite. The PostgreSQL
 * triggers are covered by `migrations.postgres.test.ts`; this checks the
 * shape the reconciler relies on, on every run, without a database server.
 */

import knex, { Knex } from 'knex';
import { down, up } from './migrations';

// Refusals are asserted by SQLite error code, not with toThrow(). The
// better-sqlite3 addon is loaded once per Jest worker and keeps the
// SqliteError class of the first test file that loaded it; in every later
// file that error is not `instanceof Error`, and toThrow() reports a refused
// insert as "did not throw".
describe('github_team_sync_state migration', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
  });

  afterEach(async () => {
    await db?.destroy();
  });

  it('creates the columns the reconciler writes', async () => {
    const columns = await db('github_team_sync_state').columnInfo();
    expect(Object.keys(columns).sort()).toEqual(
      ['last_checked', 'last_error', 'status', 'team_slug', 'user_id'].sort(),
    );
    expect(columns.last_error.nullable).toBe(true);
    expect(columns.user_id.nullable).toBe(false);
  });

  it('keeps one row per user and team', async () => {
    await db('github_team_sync_state').insert({
      user_id: 'schmeckm',
      team_slug: 'nexora-developers',
      status: 'active',
    });
    await expect(
      db('github_team_sync_state').insert({
        user_id: 'schmeckm',
        team_slug: 'nexora-developers',
        status: 'invited',
      }),
    ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT_PRIMARYKEY' });
    // A second team for the same user is a second row.
    await db('github_team_sync_state').insert({
      user_id: 'schmeckm',
      team_slug: 'nexora-admins',
      status: 'invited',
      last_error: null,
    });
    expect(await db('github_team_sync_state').count({ n: '*' })).toEqual([
      { n: 2 },
    ]);
  });

  it('refuses a status outside the four states', async () => {
    await expect(
      db('github_team_sync_state').insert({
        user_id: 'schmeckm',
        team_slug: 'nexora-developers',
        status: 'pending',
      }),
    ).rejects.toMatchObject({ code: 'SQLITE_CONSTRAINT_CHECK' });
  });

  it('is idempotent and reversible', async () => {
    await up(db);
    expect(await db.schema.hasTable('github_team_sync_state')).toBe(true);
    await down(db);
    expect(await db.schema.hasTable('github_team_sync_state')).toBe(false);
  });
});
