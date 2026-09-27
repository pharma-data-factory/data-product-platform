/**
 * The URS schema on top of the shared per-suite PostgreSQL driver.
 *
 * The generic part — connect, create a schema of the suite's own, drop it
 * again — moved to `@internal/backend-test-utils` so that a suite spanning
 * two plugins does not have to import this file out of URS private source.
 * What stays here is the only URS-specific part: which migrations and which
 * seeds build the schema.
 */

import { createTestSchema, type TestSchema } from '@internal/backend-test-utils';
import type { Knex } from 'knex';
import { up as applyUrsMigrations } from '../db/migrations';
import { seed as seedUrsDatabase } from '../db/seeds';

export type TestDatabase = TestSchema;

export async function createTestDatabase(
  suite: string,
  options: { seed?: boolean } = {},
): Promise<TestDatabase> {
  return createTestSchema(suite, {
    migrate: (db: Knex) => applyUrsMigrations(db),
    seed: options.seed ? (db: Knex) => seedUrsDatabase(db) : undefined,
  });
}
