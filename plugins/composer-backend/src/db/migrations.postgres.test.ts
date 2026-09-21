/**
 * The composer migration against the database it actually runs on.
 *
 * The rest of the composer suite uses SQLite, which is fine for domain logic
 * but cannot prove a schema change. The identity indexes added in NXD-009 use
 * an expression index (`lower(baseline_version)`) and `IF NOT EXISTS`, and
 * whether those behave the same in both dialects is exactly the kind of thing
 * that should not be assumed.
 *
 * Follows NXD-005: skips on a developer machine without PostgreSQL, fails in
 * CI, where the database is provisioned.
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
const SCHEMA = 'test_composer_migrations';

const actor = 'user:default/migration-probe';

function row(overrides: Record<string, unknown>) {
  return { created_by: actor, created_at: new Date(), revision: 1, ...overrides };
}

describe('composer migration on PostgreSQL', () => {
  let db: Knex | undefined;
  let available = false;

  beforeAll(async () => {
    const admin = knex({ client: 'pg', connection: CONNECTION });
    try {
      await admin.raw('select 1');
      available = true;
    } catch (error) {
      if (process.env.CI) {
        await admin.destroy().catch(() => {});
        throw new Error(
          `PostgreSQL is required in CI but was unreachable at ` +
            `${CONNECTION.host}:${CONNECTION.port}: ${(error as Error).message}`,
        );
      }
      await admin.destroy().catch(() => {});
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

  it('applies, re-applies and enforces both identity indexes', async () => {
    if (!available) {
      console.warn(
        'Skipping composer PostgreSQL migration test: no database. Run ' +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return;
    }
    const database = db as Knex;

    await up(database);
    // Re-running must not fail on an index that already exists.
    await up(database);

    await database('products').insert(
      row({
        id: 'p1',
        name: 'Probe',
        product_type: 'DATA_PRODUCT',
        lifecycle: 'EXPERIMENTAL',
        status: 'ACTIVE',
      }),
    );
    await database('product_versions').insert(
      row({
        id: 'v1',
        product_id: 'p1',
        version: '1.0',
        version_number: 1,
        status: 'DRAFT',
      }),
    );

    await expect(
      database('product_versions').insert(
        row({
          id: 'v2',
          product_id: 'p1',
          version: '9.0',
          version_number: 1,
          status: 'DRAFT',
        }),
      ),
    ).rejects.toThrow(/unique/i);

    await database('product_baselines').insert(
      row({
        id: 'b1',
        product_version_id: 'v1',
        baseline_version: 'Rev-A',
        status: 'DRAFT',
        snapshot: '{}',
      }),
    );

    // The expression index is what makes PostgreSQL agree with the service,
    // which treats these two labels as one identity.
    await expect(
      database('product_baselines').insert(
        row({
          id: 'b2',
          product_version_id: 'v1',
          baseline_version: 'rev-a',
          status: 'DRAFT',
          snapshot: '{}',
        }),
      ),
    ).rejects.toThrow(/unique/i);
  }, 60000);
});
