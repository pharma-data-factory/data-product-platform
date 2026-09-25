/**
 * A submitted baseline remembers which approval instance is carrying it.
 *
 * `Baseline.approvalInstanceId` has been on the type since P1A and
 * `postgres-repository.rowToBaseline` has always read `row.approval_instance_id`
 * — off a column no migration created. So the read produced `undefined` on
 * every row, and `submitBaseline` never wrote the value anyway.
 *
 * Nothing failed. The effect was only visible in a browser:
 * `URSRequirementSetPage` finds the in-flight chain with
 * `baselines.find(b => b.approvalInstanceId)`, so an approval was reachable
 * from the React state of the submit call and from nowhere else. Reload the
 * page part-way through a three-step GxP approval and it was gone.
 *
 * That is why this suite asserts on a **re-read**, never on the return value of
 * `submitBaseline`. The return value was always correct; it is the thing a
 * reload does not have. Both repositories are covered, because only one of them
 * had the missing column and the in-memory one would have passed throughout.
 */

import { Knex } from 'knex';
import { URSService } from './service';
import { URSRepository } from './repository';
import { PostgresURSRepository } from './postgres-repository';
import { createTestDatabase, TestDatabase } from './__testUtils__/testDatabase';
import { describeWhenPg } from './__testUtils__/describeWhenAvailable';
import { hashOf } from './domain/signature-service';
import {
  GxPRelevance,
  RequirementPriority,
  RequirementVersion,
  SolutionType,
  URSStatus,
} from './types';

const ACTOR = 'user:default/author';
const CAPABILITY = 'business-capability:make/equipment-performance-management';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

/**
 * Drives a set to the point of submission and returns the repository, so the
 * assertion can re-read rather than trust what submit handed back.
 */
async function submitted(repository: any) {
  const existing = await repository.getBusinessCapability?.(CAPABILITY);
  if (!existing) {
    await repository.createBusinessCapability({
      id: CAPABILITY,
      entityRef: CAPABILITY,
      name: 'Equipment performance management',
      level: 2,
    } as any);
  }

  const service = new URSService({ logger: mockLogger, repository });

  const set = await service.createRequirementSet(
    {
      businessCapabilityRefs: [CAPABILITY],
      businessNeed: 'Batch analytics',
      solutionType: SolutionType.PROJECT,
      solutionName: 'Batch Analytics',
      // NONE keeps the chain at two steps; which workflow is selected is
      // approval-workflow-seed.test.ts's subject, not this one's.
      gxpRelevance: GxPRelevance.NONE,
    },
    ACTOR,
  );

  const requirement = await service.createRequirement(
    set.id,
    {
      title: 'Batch status is displayed',
      statement:
        'The system shall retrieve production batch data and display the ' +
        'current batch status.',
      priority: RequirementPriority.MUST,
    },
    ACTOR,
  );

  const version: RequirementVersion = {
    id: `version-${set.id}`,
    requirementId: requirement.requirementId,
    version: '1.0',
    versionLabel: '1.0',
    major: 1,
    minor: 0,
    versionNumber: 100,
    title: 'Batch status is displayed',
    statement:
      'The system shall retrieve production batch data and display the ' +
      'current batch status.',
    priority: RequirementPriority.MUST,
    status: URSStatus.APPROVED,
    createdBy: ACTOR,
    createdAt: new Date(),
    revision: 1,
  };
  await repository.createRequirementVersion({
    ...version,
    contentHash: hashOf(version),
  });

  const baseline = await service.createBaseline(
    set.id,
    [version.id],
    '1.0',
    ACTOR,
  );
  const instance = await service.submitBaseline(baseline.id, ACTOR);
  return { service, baselineId: baseline.id, instanceId: instance.id };
}

describe('a submitted baseline records its approval instance (in-memory)', () => {
  it('survives a re-read, which is all a page reload has', async () => {
    const repository = new URSRepository();
    const { baselineId, instanceId } = await submitted(repository);

    const reread = await repository.getBaseline(baselineId);

    expect(reread?.status).toBe(URSStatus.IN_REVIEW);
    expect(reread?.approvalInstanceId).toBe(instanceId);
  });

  it('is absent before submission, so the page has nothing to resume', async () => {
    const repository = new URSRepository();
    await repository.createBusinessCapability({
      id: CAPABILITY,
      entityRef: CAPABILITY,
      name: 'Equipment performance management',
      level: 2,
    } as any);
    const service = new URSService({ logger: mockLogger, repository });
    const set = await service.createRequirementSet(
      {
        businessCapabilityRefs: [CAPABILITY],
        businessNeed: 'Batch analytics',
        solutionType: SolutionType.PROJECT,
        solutionName: 'Batch Analytics',
        gxpRelevance: GxPRelevance.NONE,
      },
      ACTOR,
    );
    const baseline = await service.createBaseline(set.id, [], '1.0', ACTOR);

    const reread = await repository.getBaseline(baseline.id);

    expect(reread?.status).toBe(URSStatus.DRAFT);
    expect(reread?.approvalInstanceId).toBeUndefined();
  });
});

describeWhenPg('a submitted baseline records its approval instance (postgres)', () => {
  let testDb: TestDatabase;
  let db: Knex;

  beforeAll(async () => {
    testDb = await createTestDatabase('baseline-approval-instance', {
      seed: true,
    });
    db = testDb.db;
  }, 60000);

  afterAll(async () => {
    await testDb?.dispose();
  });

  it('has the column at all', async () => {
    // The defect was a read of a column that did not exist. Assert the schema
    // directly, because a mapper reading `undefined` off a missing column looks
    // exactly like a field nobody set.
    expect(await db.schema.hasColumn('baselines', 'approval_instance_id')).toBe(
      true,
    );
  });

  it('survives a re-read from the database', async () => {
    const repository = new PostgresURSRepository(db) as any;
    const { baselineId, instanceId } = await submitted(repository);

    const reread = await repository.getBaseline(baselineId);

    expect(reread?.status).toBe(URSStatus.IN_REVIEW);
    expect(reread?.approvalInstanceId).toBe(instanceId);
  });

  it('is not cleared by a later update that is not the submit', async () => {
    // `updateBaseline` takes a whole Baseline and rewrites the row, so a
    // status change after submission must carry the instance through rather
    // than null it.
    const repository = new PostgresURSRepository(db) as any;
    const { baselineId, instanceId } = await submitted(repository);

    const current = await repository.getBaseline(baselineId);
    await repository.updateBaseline({
      ...current,
      status: URSStatus.IN_APPROVAL,
    });

    const reread = await repository.getBaseline(baselineId);
    expect(reread?.status).toBe(URSStatus.IN_APPROVAL);
    expect(reread?.approvalInstanceId).toBe(instanceId);
  });
});
