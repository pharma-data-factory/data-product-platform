/**
 * W&D seed persistence proof.
 *
 * Exercises the real startup path — `PostgresURSRepository.create()` runs
 * `up()` then `seed()` — against an embedded database, so the seeded URS-WD
 * requirement set is proven to survive migrations, be readable through the
 * repository contract, and stay idempotent across restarts.
 *
 * Uses the better-sqlite3 driver already declared by packages/backend (no new
 * dependency). Skips honestly when the driver cannot be loaded.
 */

import knex, { Knex } from 'knex';
import { PostgresURSRepository } from './postgres-repository';
import { up as runMigrations } from './db/migrations';
import { seed as runSeeds } from './db/seeds';
import { URSService } from './service';
import { URSStatus } from './types';
import { WD_REQUIREMENT_SET } from './data/seedRequirementSets';
import { describeWhenSqlite } from './__testUtils__/describeWhenAvailable';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const EXPECTED_IDS = WD_REQUIREMENT_SET.requirements.map(r => r.requirementId);

function createDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

describeWhenSqlite('W&D seed persistence', () => {
  let db: Knex;
  let repository: PostgresURSRepository;

  beforeAll(async () => {
    db = createDb();
    repository = await PostgresURSRepository.create({ getClient: () => db });
  }, 60000);

  afterAll(async () => {
    await db.destroy();
  });

  test('startup seeding creates the URS-WD requirement set', async () => {
    const set = await repository.findRequirementSetByKey(
      WD_REQUIREMENT_SET.requirementSetId,
    );

    expect(set).not.toBeNull();
    expect(set?.requirementSetId).toBe('URS-WD');
    expect(set?.status).toBe(URSStatus.DRAFT);
    expect(set?.solutionName).toBe(WD_REQUIREMENT_SET.solutionName);
    expect(set?.businessCapabilityRefs).toEqual(
      WD_REQUIREMENT_SET.businessCapabilityRefs,
    );
    expect(set?.stakeholders).toEqual(WD_REQUIREMENT_SET.stakeholders);
    expect(set?.gxpRelevance).toBe(WD_REQUIREMENT_SET.gxpRelevance);
    expect(set?.electronicRecords).toBe(true);
  });

  test('all ten requirements persist with their classification', async () => {
    const set = await repository.findRequirementSetByKey('URS-WD');
    const requirements = await repository.getRequirements(set!.id);

    expect(requirements.map(r => r.requirementId).sort()).toEqual(
      [...EXPECTED_IDS].sort(),
    );

    for (const expected of WD_REQUIREMENT_SET.requirements) {
      const actual = requirements.find(
        r => r.requirementId === expected.requirementId,
      );
      expect(actual?.title).toBe(expected.title);
      expect(actual?.statement).toBe(expected.statement);
      expect(actual?.priority).toBe(expected.priority);
      expect(actual?.gxpRelevance).toBe(expected.gxpRelevance);
      expect(actual?.classification?.componentType).toBe(
        expected.classification.componentType,
      );
      expect(actual?.classification?.requirementNature).toBe(
        expected.classification.requirementNature,
      );
      expect(actual?.classification?.criticality).toBe(
        expected.classification.criticality,
      );
      expect(actual?.classification?.interfaceType).toBe(
        expected.classification.interfaceType,
      );
    }
  });

  test('the seeded capability ref passes service validation', async () => {
    const service = new URSService({ logger: mockLogger, repository });

    await expect(
      service.validateCapabilityRefs(WD_REQUIREMENT_SET.businessCapabilityRefs),
    ).resolves.toBe(true);
  });

  test('re-seeding is idempotent and never overwrites edits', async () => {
    const set = await repository.findRequirementSetByKey('URS-WD');
    await repository.updateRequirementSet({
      ...set!,
      status: URSStatus.APPROVED,
    });

    await runSeeds(db);
    await runMigrations(db);
    await runSeeds(db);

    const sets = await db('requirement_sets')
      .where({ requirement_set_id: 'URS-WD' })
      .select();
    expect(sets).toHaveLength(1);

    const after = await repository.findRequirementSetByKey('URS-WD');
    expect(after?.status).toBe(URSStatus.APPROVED);

    const count = await db('requirements')
      .where({ requirement_set_id: after!.id })
      .count('* as count')
      .first();
    expect(Number(count?.count)).toBe(10);
  });
});
