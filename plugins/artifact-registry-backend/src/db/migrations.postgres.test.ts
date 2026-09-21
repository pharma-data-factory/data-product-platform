/**
 * The registry schema against the database it runs on in production.
 *
 * The service suite uses SQLite, which is fine for the rules but cannot prove
 * a schema change. The case-insensitive identity indexes are expression
 * indexes, and whether those behave the same in PostgreSQL is not something to
 * assume.
 *
 * Follows NXD-005: skips without PostgreSQL, fails in CI where one exists.
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

const SCHEMA = 'test_artifact_registry';
const actor = 'user:default/migration-probe';

describe('artifact registry migration on PostgreSQL', () => {
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

  it('applies, re-applies and enforces case-insensitive identity', async () => {
    if (!available) {
      console.warn(
        'Skipping artifact registry PostgreSQL test: no database. Run ' +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return;
    }
    const database = db as Knex;

    await up(database);
    await up(database);

    await database('publishers').insert({
      id: 'pub1',
      namespace: 'acme',
      display_name: 'Acme',
      member_groups: '[]',
      created_by: actor,
      created_at: new Date(),
      revision: 1,
    });

    // "ACME" and "acme" must not be two publishers.
    await expect(
      (async () => {
        await database('publishers').insert({
          id: 'pub2',
          namespace: 'ACME',
          display_name: 'Shouting Acme',
          member_groups: '[]',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        });
      })(),
    ).rejects.toThrow(/unique/i);

    await database('artifacts').insert({
      id: 'art1',
      namespace: 'acme',
      name: 'sap-odata',
      kind: 'CONNECTOR',
      display_name: 'SAP OData',
      publisher_id: 'pub1',
      tags: '[]',
      created_by: actor,
      created_at: new Date(),
      revision: 1,
    });

    await expect(
      (async () => {
        await database('artifacts').insert({
          id: 'art2',
          namespace: 'ACME',
          name: 'SAP-ODATA',
          kind: 'CONNECTOR',
          display_name: 'Duplicate',
          publisher_id: 'pub1',
          tags: '[]',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        });
      })(),
    ).rejects.toThrow(/unique/i);

    await database('artifact_versions').insert({
      id: 'ver1',
      artifact_id: 'art1',
      version: '1.0',
      lifecycle: 'DRAFT',
      dependencies: '[]',
      created_by: actor,
      created_at: new Date(),
      revision: 1,
    });

    await expect(
      (async () => {
        await database('artifact_versions').insert({
          id: 'ver2',
          artifact_id: 'art1',
          version: '1.0',
          lifecycle: 'DRAFT',
          dependencies: '[]',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        });
      })(),
    ).rejects.toThrow(/unique/i);
  }, 60000);
});
