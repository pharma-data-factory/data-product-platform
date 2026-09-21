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
import {
  backfillMissingRequirementVersions,
  seed as runSeeds,
} from './db/seeds';
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

  /**
   * The regression this file previously missed.
   *
   * Seeding writes to the tables directly and so skips createRequirement,
   * which is what normally opens version 0.1. Without that version every
   * seeded set was unbaselinable: Create Baseline answered "Requirement
   * version(s) not found: seed:urs-wd-urs-wd-001, …".
   */
  test('every seeded requirement has a genesis version 0.1 in DRAFT', async () => {
    for (const requirementId of EXPECTED_IDS) {
      const versions = await repository.getRequirementVersions(requirementId);

      expect(versions).toHaveLength(1);
      expect(versions[0].versionLabel).toBe('0.1');
      expect(versions[0].status).toBe(URSStatus.DRAFT);
      // A signature is bound to the hash, so a version without one could never
      // be signed.
      expect(versions[0].contentHash).toBeTruthy();
    }
  });

  test('the seeded versions carry the requirement content', async () => {
    for (const expected of WD_REQUIREMENT_SET.requirements) {
      const [version] = await repository.getRequirementVersions(
        expected.requirementId,
      );

      expect(version.title).toBe(expected.title);
      expect(version.statement).toBe(expected.statement);
      expect(version.classification?.criticality).toBe(
        expected.classification.criticality,
      );
    }
  });

  test('getCurrentVersions resolves one in-force version per requirement', async () => {
    const service = new URSService({ logger: mockLogger, repository });
    const set = await repository.findRequirementSetByKey('URS-WD');

    const current = await service.getCurrentVersions(set!.id);

    expect(current).toHaveLength(10);
    expect(current.map(v => v.requirementId).sort()).toEqual(
      [...EXPECTED_IDS].sort(),
    );
    for (const version of current) {
      expect(version.versionLabel).toBe('0.1');
      expect(version.status).toBe(URSStatus.DRAFT);
    }
  });

  test('a seeded set can be baselined — the path that used to fail', async () => {
    // Walks it exactly as the UI does now: resolve the current versions from
    // the service, then pin those ids. Sending requirement ids here is what
    // produced "Requirement version(s) not found".
    const service = new URSService({ logger: mockLogger, repository });
    const set = await repository.findRequirementSetByKey('URS-WD');

    const current = await service.getCurrentVersions(set!.id);
    const baseline = await service.createBaseline(
      set!.id,
      current.map(v => v.id),
      '1.0',
      'user:default/tester',
    );

    expect(baseline.requirementVersionIds).toHaveLength(10);
    expect(baseline.status).toBe(URSStatus.DRAFT);
  });

  test('requirement ids are rejected where version ids belong', async () => {
    // Pins the regression itself: the old frontend sent these and the error
    // was unintelligible to the operator.
    const service = new URSService({ logger: mockLogger, repository });
    const set = await repository.findRequirementSetByKey('URS-WD');
    const requirements = await repository.getRequirements(set!.id);

    await expect(
      service.createBaseline(
        set!.id,
        requirements.map(r => r.id),
        '1.1',
        'user:default/tester',
      ),
    ).rejects.toThrow(/not found/i);
  });

  test('re-seeding does not open a second version', async () => {
    await runSeeds(db);

    const versions = await repository.getRequirementVersions(EXPECTED_IDS[0]);
    expect(versions).toHaveLength(1);
  });

  test('backfill repairs a database seeded before versions existed', async () => {
    // Reproduces an installation seeded by the old code: requirements present,
    // no versions. seedRequirementSets skips the set because it already
    // exists, so only the backfill can repair it.
    const orphanSetId = 'seed:legacy-set';
    await db('requirement_sets').insert({
      id: orphanSetId,
      requirement_set_id: 'URS-LEGACY',
      version_number: 1,
      business_capability_refs: JSON.stringify([]),
      business_need: 'Seeded before requirement versions were written.',
      stakeholders: JSON.stringify([]),
      solution_type: 'SOFTWARE',
      solution_name: 'Legacy',
      gxp_relevance: 'GXP_CRITICAL',
      patient_impact: false,
      data_integrity_impact: true,
      electronic_records: true,
      status: URSStatus.DRAFT,
      created_by: 'system',
      created_at: new Date(),
      revision: 1,
    });
    await db('requirements').insert({
      id: `${orphanSetId}-legacy-001`,
      requirement_set_id: orphanSetId,
      requirement_id: 'LEGACY-001',
      title: 'Requirement seeded before versions were written',
      statement: 'Carries no version and therefore cannot be baselined.',
      priority: 'MUST',
      gxp_relevance: 'GXP_CRITICAL',
      criticality: 'HIGH',
      status: URSStatus.DRAFT,
      created_by: 'system',
      created_at: new Date(),
    });

    expect(await repository.getRequirementVersions('LEGACY-001')).toHaveLength(
      0,
    );

    const repaired = await backfillMissingRequirementVersions(db);
    expect(repaired).toBe(1);

    const versions = await repository.getRequirementVersions('LEGACY-001');
    expect(versions).toHaveLength(1);
    expect(versions[0].versionLabel).toBe('0.1');
    expect(versions[0].status).toBe(URSStatus.DRAFT);

    // Idempotent: a second run finds nothing left to repair.
    expect(await backfillMissingRequirementVersions(db)).toBe(0);
  });
});
