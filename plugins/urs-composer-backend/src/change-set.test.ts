/**
 * Change Set tests — delta computation between URS baselines.
 */

import { URSService } from './service';
import { URSRepository } from './repository';
import {
  RequirementVersion,
  SolutionType,
  RequirementPriority,
  URSStatus,
} from './types';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

describe('URS Change Set', () => {
  let service: URSService;
  let repository: URSRepository;
  const actor = 'user:default/test-user';

  beforeEach(() => {
    repository = new URSRepository();
    service = new URSService({ logger: mockLogger, repository });
  });

  async function seedCapability() {
    await service.createBusinessCapability(
      { name: 'weighing-dispensing', domain: 'make' },
      actor,
    );
  }

  async function createRequirementSet() {
    return service.createRequirementSet(
      {
        businessCapabilityRefs: ['business-capability:make/weighing-dispensing'],
        businessNeed: 'Test need',
        solutionType: SolutionType.COMPONENT,
        solutionName: `Test ${Date.now()}`,
      },
      actor,
    );
  }

  async function addRequirement(setId: string, title: string, statement: string) {
    return service.createRequirement(
      setId,
      {
        title,
        statement,
        priority: RequirementPriority.MUST,
      },
      actor,
    );
  }

  function makeVersion(
    reqId: string,
    version: string,
    title: string,
    statement: string,
  ): RequirementVersion {
    return {
      id: `v-${reqId}-${version}`,
      requirementId: reqId,
      version,
      versionNumber: parseInt(version.split('.')[0], 10),
      title,
      statement,
      priority: RequirementPriority.MUST,
      status: URSStatus.DRAFT,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
  }

  it('computes all ADDED for first baseline (no predecessor)', async () => {
    await seedCapability();
    const set = await createRequirementSet();
    const r1 = await addRequirement(set.id, 'Req 1', 'Shall do X');
    const r2 = await addRequirement(set.id, 'Req 2', 'Shall do Y');

    const v1 = makeVersion(r1.requirementId, '1.0', r1.title, r1.statement);
    const v2 = makeVersion(r2.requirementId, '1.0', r2.title, r2.statement);
    await repository.createRequirementVersion(v1);
    await repository.createRequirementVersion(v2);

    const baseline = await service.createBaseline(
      set.id,
      [v1.id, v2.id],
      '1.0',
      actor,
    );

    const changeSet = await service.computeChangeSet(baseline.id, actor);
    expect(changeSet.previousBaselineId).toBeUndefined();
    expect(changeSet.summary.added).toBe(2);
    expect(changeSet.summary.modified).toBe(0);
    expect(changeSet.summary.removed).toBe(0);
    expect(changeSet.changes.every(c => c.changeType === 'ADDED')).toBe(true);
  });

  it('detects UNCHANGED when content is identical', async () => {
    await seedCapability();
    const set = await createRequirementSet();
    const r1 = await addRequirement(set.id, 'Req A', 'Original statement');

    const v1 = makeVersion(r1.requirementId, '1.0', r1.title, r1.statement);
    await repository.createRequirementVersion(v1);
    const baseline1 = await service.createBaseline(set.id, [v1.id], '1.0', actor);

    // v2 has same content as v1
    const v2 = makeVersion(r1.requirementId, '2.0', r1.title, r1.statement);
    await repository.createRequirementVersion(v2);
    const baseline2 = await service.createBaseline(set.id, [v2.id], '2.0', actor);

    const changeSet = await service.computeChangeSet(baseline2.id, actor);
    expect(changeSet.summary.unchanged).toBe(1);
    expect(changeSet.previousBaselineId).toBe(baseline1.id);
  });

  it('detects MODIFIED when content differs', async () => {
    await seedCapability();
    const set = await createRequirementSet();
    const r1 = await addRequirement(set.id, 'Req M', 'Original');

    const v1 = makeVersion(r1.requirementId, '1.0', 'Req M', 'Original');
    await repository.createRequirementVersion(v1);
    await service.createBaseline(set.id, [v1.id], '1.0', actor);

    const v2 = makeVersion(r1.requirementId, '2.0', 'Req M Updated', 'Changed statement');
    await repository.createRequirementVersion(v2);
    const baseline2 = await service.createBaseline(set.id, [v2.id], '2.0', actor);

    const changeSet = await service.computeChangeSet(baseline2.id, actor);
    expect(changeSet.summary.modified).toBe(1);
    const mod = changeSet.changes.find(c => c.changeType === 'MODIFIED');
    expect(mod).toBeDefined();
    expect(mod!.changedFields).toContain('title');
    expect(mod!.changedFields).toContain('statement');
  });

  it('detects ADDED and REMOVED between baselines', async () => {
    await seedCapability();
    const set = await createRequirementSet();
    const r1 = await addRequirement(set.id, 'Keep', 'Statement 1');
    const r2 = await addRequirement(set.id, 'Remove me', 'Statement 2');

    const v1 = makeVersion(r1.requirementId, '1.0', r1.title, r1.statement);
    const v2 = makeVersion(r2.requirementId, '1.0', r2.title, r2.statement);
    await repository.createRequirementVersion(v1);
    await repository.createRequirementVersion(v2);
    await service.createBaseline(set.id, [v1.id, v2.id], '1.0', actor);

    // Second baseline only has r1
    const baseline2 = await service.createBaseline(set.id, [v1.id], '2.0', actor);

    const changeSet = await service.computeChangeSet(baseline2.id, actor);
    expect(changeSet.summary.removed).toBe(1);
    expect(changeSet.summary.unchanged).toBe(1);
    expect(changeSet.changes.find(c => c.changeType === 'REMOVED')?.requirementId).toBe(r2.requirementId);
  });

  it('summary counts are correct', async () => {
    await seedCapability();
    const set = await createRequirementSet();
    const r1 = await addRequirement(set.id, 'S1', 'Stmt 1');
    const r2 = await addRequirement(set.id, 'S2', 'Stmt 2');
    const r3 = await addRequirement(set.id, 'S3', 'Stmt 3');

    const v1 = makeVersion(r1.requirementId, '1.0', r1.title, r1.statement);
    const v2 = makeVersion(r2.requirementId, '1.0', r2.title, r2.statement);
    await repository.createRequirementVersion(v1);
    await repository.createRequirementVersion(v2);
    await service.createBaseline(set.id, [v1.id, v2.id], '1.0', actor);

    // New baseline: keep v1, drop v2, add v3
    const v3 = makeVersion(r3.requirementId, '1.0', r3.title, r3.statement);
    await repository.createRequirementVersion(v3);
    const baseline2 = await service.createBaseline(set.id, [v1.id, v3.id], '2.0', actor);

    const changeSet = await service.computeChangeSet(baseline2.id, actor);
    expect(changeSet.summary.added).toBe(1);
    expect(changeSet.summary.removed).toBe(1);
    expect(changeSet.summary.unchanged).toBe(1);
    expect(changeSet.summary.modified).toBe(0);
    expect(changeSet.baselineVersion).toBe('2.0');
    expect(changeSet.previousBaselineVersion).toBe('1.0');
  });

  it('throws when baseline not found', async () => {
    await expect(
      service.computeChangeSet('non-existent-id', actor),
    ).rejects.toThrow('not found');
  });
});
