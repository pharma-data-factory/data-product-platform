/**
 * Per-suite PostgreSQL schemas for the test suites.
 *
 * Every suite used to connect to the same database and run migrations up in
 * beforeAll and down in afterAll. Run in parallel, one suite dropped the
 * tables while another was still using them: the full run reported 58
 * failures, the same run with --runInBand reported 20. A test suite that
 * reports a different result depending on how it is scheduled cannot tell
 * anyone whether the code works.
 *
 * Each suite now gets its own schema, so the suites cannot see or destroy
 * each other's tables and the run is deterministic either way.
 */

import type { Knex } from 'knex';

export interface TestDatabase {
  db: Knex;
  /** True when PostgreSQL answered. Suites skip their assertions when false. */
  available: boolean;
  /**
   * A second connection to the same schema, for suites that prove data
   * survives a restart. Disposed along with the rest.
   */
  reconnect(): Knex;
  dispose(): Promise<void>;
}

function connectionSettings() {
  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '5435', 10),
    user: process.env.TEST_DB_USER || 'urs_test',
    password: process.env.TEST_DB_PASSWORD || 'test_pass123',
    database: process.env.TEST_DB_NAME || 'urs_composer_test',
  };
}

/** Postgres identifiers are limited to 63 bytes and are case-folded. */
function schemaNameFor(suite: string): string {
  const cleaned = suite
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `test_${cleaned}`.slice(0, 63);
}

/**
 * Connects, creates a schema of its own for the suite and runs the migrations
 * into it. When PostgreSQL is unreachable the returned database is marked
 * unavailable rather than throwing, so a developer without Docker can still
 * run the rest of the suite.
 */
export async function createTestDatabase(
  suite: string,
  options: { seed?: boolean } = {},
): Promise<TestDatabase> {
  const schema = schemaNameFor(suite);
  const knex = require('knex');
  const settings = connectionSettings();

  const admin: Knex = knex({ client: 'pg', connection: settings });
  try {
    await admin.raw('select 1');
  } catch {
    await admin.destroy().catch(() => {});
    const unavailable = knex({ client: 'pg', connection: settings });
    return {
      db: unavailable,
      available: false,
      reconnect: () => unavailable,
      async dispose() {
        await unavailable.destroy().catch(() => {});
      },
    };
  }

  await admin.raw(`drop schema if exists ??  cascade`, [schema]);
  await admin.raw(`create schema ??`, [schema]);
  await admin.destroy();

  const db: Knex = knex({
    client: 'pg',
    connection: settings,
    searchPath: [schema],
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await require('../db/migrations').up(db);
  if (options.seed) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await require('../db/seeds').seed(db);
  }

  const extra: Knex[] = [];

  return {
    db,
    available: true,
    reconnect() {
      const another: Knex = knex({
        client: 'pg',
        connection: settings,
        searchPath: [schema],
      });
      extra.push(another);
      return another;
    },
    async dispose() {
      // The suite's own connections are closed before the schema is dropped.
      // The other way round, the drop waits on the locks those connections
      // still hold and the afterAll hook times out.
      await Promise.all(extra.map(e => e.destroy().catch(() => {})));
      await db.destroy().catch(() => {});

      const cleanup: Knex = knex({ client: 'pg', connection: settings });
      try {
        await cleanup.raw(`drop schema if exists ?? cascade`, [schema]);
      } finally {
        await cleanup.destroy().catch(() => {});
      }
    },
  };
}
