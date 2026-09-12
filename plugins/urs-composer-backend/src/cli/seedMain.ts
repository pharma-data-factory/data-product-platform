/**
 * Explicit Postgres content seed (CLI entry).
 *
 * Invoked by `yarn urs:seed` via scripts/seed-urs.mjs — not on plugin startup.
 */

import type { Knex } from 'knex';
import { up } from '../db/migrations';
import { seed } from '../db/seeds';

export async function runUrsSeed(knex: Knex): Promise<{
  capabilities: number;
  requirementSets: number;
  versions: number;
}> {
  await up(knex);
  await seed(knex);

  const [caps] = await knex('business_capabilities').count({ n: '*' });
  const [sets] = await knex('requirement_sets').count({ n: '*' });
  const [versions] = await knex('requirement_versions').count({ n: '*' });

  return {
    capabilities: Number(caps.n),
    requirementSets: Number(sets.n),
    versions: Number(versions.n),
  };
}
