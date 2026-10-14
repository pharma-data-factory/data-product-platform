/**
 * NXD-164. A release has its own who and when, and the versions released
 * before it existed are backfilled: the release's actor moves to
 * `released_*`, and the approval is read back from its signature.
 */

import knex, { Knex } from 'knex';
import { up } from './db/migrations';

function freshDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

async function schemaBeforeNxd164(db: Knex) {
  await up(db);
  await db.schema.alterTable('product_versions', table => {
    table.dropColumn('released_by');
    table.dropColumn('released_at');
  });
  await db('products').insert({
    id: 'p1',
    name: 'oee',
    product_type: 'DATA_PRODUCT',
    created_by: 'user:default/author',
    created_at: new Date('2026-10-09T17:00:00Z'),
    updated_at: new Date('2026-10-09T17:00:00Z'),
  });
  const version = (id: string, status: string, approvedBy: string) => ({
    id,
    product_id: 'p1',
    version: id,
    version_number: id === 'v1' ? 1 : 2,
    status,
    created_by: 'user:default/author',
    created_at: new Date('2026-10-09T18:00:00Z'),
    approved_by: approvedBy,
    approved_at: new Date('2026-10-09T20:37:37Z'),
    revision: 1,
  });
  await db('product_versions').insert([
    version('v1', 'RELEASED', 'user:default/demo-pm'),
    version('v2', 'APPROVED', 'user:default/approver'),
  ]);
  await db('product_signatures').insert({
    id: 's1',
    product_id: 'p1',
    entity_type: 'PRODUCT_VERSION',
    entity_id: 'v1',
    meaning: 'VERSION_APPROVED',
    justification: 'Every requirement verified',
    signed_by: 'user:default/approver',
    signed_at: '2026-10-09T20:20:00.000Z',
    gmp_relevant: true,
  });
}

describe('version release columns (NXD-164)', () => {
  let db: Knex;
  beforeEach(() => {
    db = freshDb();
  });
  afterEach(async () => {
    await db.destroy();
  });

  it("moves a released version's release to released_* and reads its approval from the signature", async () => {
    await schemaBeforeNxd164(db);
    await up(db);
    const v1 = await db('product_versions').where({ id: 'v1' }).first();
    expect(v1.released_by).toBe('user:default/demo-pm');
    expect(v1.released_at).toBeTruthy();
    expect(v1.approved_by).toBe('user:default/approver');
    const v2 = await db('product_versions').where({ id: 'v2' }).first();
    expect(v2.approved_by).toBe('user:default/approver');
    expect(v2.released_by).toBeNull();
  });

  it('backfills once: a second run changes nothing', async () => {
    await schemaBeforeNxd164(db);
    await up(db);
    await db('product_versions')
      .where({ id: 'v1' })
      .update({ released_by: 'kept' });
    await up(db);
    expect(
      (await db('product_versions').where({ id: 'v1' }).first()).released_by,
    ).toBe('kept');
  });
});
