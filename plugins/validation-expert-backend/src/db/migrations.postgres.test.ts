/**
 * The validation-expert migration on PostgreSQL (NXD-127; triggers NXD-119).
 *
 * SQLite backs the unit tests, so the PostgreSQL-only parts — the swap of
 * the per-baseline unique constraints for per-version ones, and the
 * append-only triggers on signatures — run nowhere else. Pinned: the
 * migration upgrades a schema in its pre-NXD-127 shape, runs again without
 * error, allows one decision per product version (and the legacy one with
 * none), and refuses to change a signature.
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

const SCHEMA = 'test_validation_expert';

describe('validation-expert migration on PostgreSQL', () => {
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

  const context = (id: string) => ({
    id,
    source: '{}',
    requirement_set_id: 'rs',
    baseline_id: 'bl',
    status: 'PENDING',
    created_at: '2026-10-05T00:00:00Z',
    created_by: 'user:default/creator',
  });

  const decision = (id: string, productVersionId: string | null) => ({
    id,
    context_id: 'ctx-1',
    status: 'APPROVED',
    justification: 'ok',
    decided_by: 'user:default/qa',
    decided_at: '2026-10-05T00:00:00Z',
    product_version_id: productVersionId,
  });

  const signature = (id: string, productVersionId: string | null, signedBy: string) => ({
    id,
    context_id: 'ctx-1',
    role: 'VALIDATION_EXPERT',
    verdict: 'APPROVED',
    justification: 'ok',
    signed_by: signedBy,
    signed_at: '2026-10-05T00:00:00Z',
    reauth_method: 'signature-pin',
    product_version_id: productVersionId,
  });

  it('upgrades, reruns, and keys decisions and signatures by product version', async () => {
    if (!db) return;
    await up(db);
    await up(db); // every boot runs it
    await db('validation_contexts').insert(context('ctx-1'));

    await db('validation_decisions').insert(decision('legacy', null));
    await db('validation_decisions').insert(decision('d-v1', 'v1'));
    await db('validation_decisions').insert(decision('d-v2', 'v2'));
    await expect(
      db('validation_decisions').insert(decision('d-v1-again', 'v1')),
    ).rejects.toMatchObject({ code: '23505' });

    await db('validation_decision_signatures').insert(signature('s1', 'v1', 'user:default/vera'));
    await db('validation_decision_signatures').insert(signature('s2', 'v2', 'user:default/vera'));
    await expect(
      db('validation_decision_signatures').insert(signature('s3', 'v1', 'user:default/other')),
    ).rejects.toMatchObject({ code: '23505' });

    await expect(
      db('validation_decision_signatures').where({ id: 's1' }).update({ verdict: 'REJECTED' }),
    ).rejects.toThrow(/VALIDATION_APPEND_ONLY/);
    expect(await db.schema.hasColumn('validation_runs', 'product_version_id')).toBe(true);
  });
});
