/**
 * Baselines: what a baseline may pin, what the review scope says about each
 * pinned item, and the rules around releasing and retiring (invariants 9, 10
 * and 16).
 */

import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
import { URSService } from './service';
import { URSRepository } from './repository';
import { hashOf } from './domain/signature-service';
import {
  ApprovalRole,
  GxPRelevance,
  RequirementPriority,
  RequirementVersion,
  ReviewScope,
  SolutionType,
  URSStatus,
} from './types';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const ACTOR = 'user:default/author';
const CAPABILITY = 'business-capability:make/equipment-performance-management';

/** Reports every role, so the approval chain is not the subject under test. */
const CATALOG: any = {
  getEntityByRef: jest.fn(async () => ({
    kind: 'User',
    metadata: { name: 'tester' },
    spec: {
      memberOf: [
        'group:default/urs-business-reviewers',
        'group:default/urs-product-managers',
        'group:default/urs-quality-reviewers',
      ],
    },
  })),
};

const WORKFLOW = {
  id: 'non-gxp-urs',
  name: 'Non-GxP URS Approval',
  steps: [
    { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
    { sequence: 2, role: ApprovalRole.PRODUCT_MANAGER, required: true },
  ],
  createdAt: new Date(),
};

async function setup() {
  const repository = new URSRepository();
  await repository.createApprovalWorkflow(WORKFLOW as any);
  await repository.createBusinessCapability({
    id: CAPABILITY,
    entityRef: CAPABILITY,
    name: 'Equipment performance management',
    level: 2,
  } as any);

  const service = new URSService({
    logger: mockLogger,
    repository,
    catalog: CATALOG,
  });
  const set = await service.createRequirementSet(
    {
      businessCapabilityRefs: [CAPABILITY],
      businessNeed: 'Baseline rules',
      solutionType: SolutionType.PROJECT,
      solutionName: 'Baseline Rules',
      gxpRelevance: GxPRelevance.NONE,
    },
    ACTOR,
  );

  return { repository, service, setId: set.id };
}

/**
 * Drive a baseline through its approval chain to release.
 *
 * There is no shortcut: a baseline is released by completing its approval
 * steps, which is what records who approved it.
 */
async function releaseBaseline(
  service: URSService,
  baselineId: string,
): Promise<void> {
  const instance = await service.submitBaseline(baselineId, ACTOR);
  for (const step of instance.steps) {
    await service.approveApprovalStep(instance.id, step.id, ACTOR, 'Approved');
  }
}

/** Add a requirement to the set and pin a version of it. */
async function addVersion(
  service: URSService,
  repository: URSRepository,
  setId: string,
  opts: {
    id: string;
    title: string;
    statement: string;
    requirementId?: string;
    status?: URSStatus;
  },
): Promise<RequirementVersion> {
  let requirementId = opts.requirementId;
  if (!requirementId) {
    const requirement = await service.createRequirement(
      setId,
      {
        title: opts.title,
        statement: opts.statement,
        priority: RequirementPriority.MUST,
      },
      ACTOR,
    );
    requirementId = requirement.requirementId;
  }

  const version: RequirementVersion = {
    id: opts.id,
    requirementId: requirementId!,
    version: '1.0',
    versionLabel: '1.0',
    major: 1,
    minor: 0,
    versionNumber: 100,
    title: opts.title,
    statement: opts.statement,
    priority: RequirementPriority.MUST,
    status: opts.status ?? URSStatus.DRAFT,
    createdBy: ACTOR,
    createdAt: new Date(),
    revision: 1,
  };
  const stored = { ...version, contentHash: hashOf(version) };
  await repository.createRequirementVersion(stored);
  return stored;
}

describe('What a baseline may pin', () => {
  test('a version that does not exist is refused', async () => {
    const { service, setId } = await setup();

    await expect(
      service.createBaseline(setId, ['no-such-version'], '1.0', ACTOR),
    ).rejects.toThrow(NotFoundError);
  });

  test('a version from another requirement set is refused', async () => {
    const { repository, service, setId } = await setup();
    const other = await service.createRequirementSet(
      {
        businessCapabilityRefs: [CAPABILITY],
        businessNeed: 'Another set',
        solutionType: SolutionType.PROJECT,
        solutionName: 'Other',
        gxpRelevance: GxPRelevance.INDIRECT,
      },
      ACTOR,
    );
    const foreign = await addVersion(service, repository, other.id, {
      id: 'ver-foreign',
      title: 'Foreign',
      statement: 'Belongs elsewhere.',
    });

    await expect(
      service.createBaseline(setId, [foreign.id], '1.0', ACTOR),
    ).rejects.toThrow(/do not belong to requirement set/);
  });

  test('the same version cannot be pinned twice', async () => {
    const { repository, service, setId } = await setup();
    const v = await addVersion(service, repository, setId, {
      id: 'ver-dup',
      title: 'Dup',
      statement: 'Once is enough.',
    });

    await expect(
      service.createBaseline(setId, [v.id, v.id], '1.0', ACTOR),
    ).rejects.toThrow(InputError);
  });

  test('a valid selection is pinned in order', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'First.',
    });
    const b = await addVersion(service, repository, setId, {
      id: 'ver-b',
      title: 'B',
      statement: 'Second.',
    });

    const baseline = await service.createBaseline(
      setId,
      [a.id, b.id],
      '1.0',
      ACTOR,
    );

    expect(baseline.items!.map(i => i.requirementVersionId)).toEqual([
      a.id,
      b.id,
    ]);
    expect(baseline.items!.map(i => i.position)).toEqual([0, 1]);
  });
});

describe('Review scope', () => {
  test('everything in the first baseline is new', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'First.',
    });

    const baseline = await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    expect(baseline.items![0].reviewScope).toBe(ReviewScope.ADDED);
  });

  test('a version carried over unchanged is not up for review again', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'First.',
    });
    await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    const second = await service.createBaseline(setId, [a.id], '2.0', ACTOR);

    expect(second.items![0].reviewScope).toBe(ReviewScope.UNCHANGED);
  });

  test('a new version of the same requirement with new content is modified', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'First.',
    });
    await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    const revised = await addVersion(service, repository, setId, {
      id: 'ver-a2',
      requirementId: a.requirementId,
      title: 'A',
      statement: 'Changed statement.',
    });
    const second = await service.createBaseline(
      setId,
      [revised.id],
      '2.0',
      ACTOR,
    );

    expect(second.items![0].reviewScope).toBe(ReviewScope.MODIFIED);
  });

  test('a version bump that changed no content is not a re-review', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Same text.',
    });
    await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    const rebuilt = await addVersion(service, repository, setId, {
      id: 'ver-a2',
      requirementId: a.requirementId,
      title: 'A',
      statement: 'Same text.',
    });
    const second = await service.createBaseline(
      setId,
      [rebuilt.id],
      '2.0',
      ACTOR,
    );

    expect(second.items![0].reviewScope).toBe(ReviewScope.UNCHANGED);
  });

  test('a requirement that appears for the first time is added', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'First.',
    });
    await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    const b = await addVersion(service, repository, setId, {
      id: 'ver-b',
      title: 'B',
      statement: 'Newly required.',
    });
    const second = await service.createBaseline(
      setId,
      [a.id, b.id],
      '2.0',
      ACTOR,
    );

    expect(second.items!.map(i => i.reviewScope)).toEqual([
      ReviewScope.UNCHANGED,
      ReviewScope.ADDED,
    ]);
  });
});

describe('Invariant 9: a released baseline holds no unreleased content', () => {
  test('a baseline pinning a draft cannot be released', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Still a draft.',
    });
    const baseline = await service.createBaseline(
      setId,
      [a.id],
      '1.0',
      ACTOR,
    );

    await expect(releaseBaseline(service, baseline.id)).rejects.toThrow(
      /pinned version\(s\) are not approved/,
    );

    // Still under review rather than released; the refusal rolled the
    // release back but left the submission standing.
    expect((await repository.getBaseline(baseline.id))!.status).toBe(
      URSStatus.IN_REVIEW,
    );
  });

  test('a baseline pinning released versions can be released', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved already.',
      status: URSStatus.APPROVED,
    });
    const baseline = await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    await releaseBaseline(service, baseline.id);

    expect((await repository.getBaseline(baseline.id))!.status).toBe(
      URSStatus.APPROVED,
    );
  });

  test('an empty baseline is not blocked by the rule', async () => {
    const { repository, service, setId } = await setup();
    const baseline = await service.createBaseline(setId, [], '1.0', ACTOR);

    await releaseBaseline(service, baseline.id);

    expect((await repository.getBaseline(baseline.id))!.status).toBe(
      URSStatus.APPROVED,
    );
  });
});

describe('Invariant 10: the predecessor gives way to the successor', () => {
  test('releasing a baseline supersedes the one before it', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved.',
      status: URSStatus.APPROVED,
    });

    const first = await service.createBaseline(setId, [a.id], '1.0', ACTOR);
    await releaseBaseline(service, first.id);

    const second = await service.createBaseline(setId, [a.id], '2.0', ACTOR);
    await releaseBaseline(service, second.id);

    const reloadedFirst = await repository.getBaseline(first.id);
    expect(reloadedFirst).toMatchObject({
      status: URSStatus.SUPERSEDED,
      supersededBy: second.id,
    });
    expect((await repository.getBaseline(second.id))!.status).toBe(
      URSStatus.APPROVED,
    );
  });

  test('a set has only one effective baseline at a time', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved.',
      status: URSStatus.APPROVED,
    });

    const first = await service.createBaseline(setId, [a.id], '1.0', ACTOR);
    await releaseBaseline(service, first.id);
    const second = await service.createBaseline(setId, [a.id], '2.0', ACTOR);
    await releaseBaseline(service, second.id);

    const all = await repository.listBaselines(setId, 50, 0);
    const approved = all.items.filter(b => b.status === URSStatus.APPROVED);
    expect(approved.map(b => b.id)).toEqual([second.id]);
  });

  test('the predecessor stays effective while the successor is a draft', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved.',
      status: URSStatus.APPROVED,
    });

    const first = await service.createBaseline(setId, [a.id], '1.0', ACTOR);
    await releaseBaseline(service, first.id);
    await service.createBaseline(setId, [a.id], '2.0', ACTOR);

    expect((await repository.getBaseline(first.id))!.status).toBe(
      URSStatus.APPROVED,
    );
  });
});

describe('Invariant 16: a pinned version cannot be retired', () => {
  test('a version in a released baseline is blocked, naming the baseline', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved.',
      status: URSStatus.APPROVED,
    });
    const baseline = await service.createBaseline(setId, [a.id], '1.0', ACTOR);
    await releaseBaseline(service, baseline.id);

    await expect(
      service.obsoleteRequirementVersion(a.id, 'No longer needed', ACTOR),
    ).rejects.toThrow(
      new RegExp(`pinned by released baseline.*1\\.0.*${baseline.id}`),
    );

    expect((await repository.getRequirementVersion(a.id))!.status).toBe(
      URSStatus.APPROVED,
    );
  });

  test('a version pinned only by a draft baseline can be retired', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved.',
      status: URSStatus.APPROVED,
    });
    await service.createBaseline(setId, [a.id], '1.0', ACTOR);

    await service.obsoleteRequirementVersion(a.id, 'Superseded by policy', ACTOR);

    expect((await repository.getRequirementVersion(a.id))!.status).toBe(
      URSStatus.OBSOLETE,
    );
  });

  test('retiring requires a reason and is recorded', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Approved.',
      status: URSStatus.APPROVED,
    });

    await expect(
      service.obsoleteRequirementVersion(a.id, '  ', ACTOR),
    ).rejects.toThrow(InputError);

    await service.obsoleteRequirementVersion(a.id, 'Process retired', ACTOR);

    const trail = await repository.getEntityAuditTrail(
      a.id,
      'REQUIREMENT_VERSION',
    );
    expect(trail.find(e => e.eventType === 'OBSOLETED')).toMatchObject({
      reason: 'Process retired',
      actor: ACTOR,
    });
  });

  test('a version that was never released cannot be retired', async () => {
    const { repository, service, setId } = await setup();
    const a = await addVersion(service, repository, setId, {
      id: 'ver-a',
      title: 'A',
      statement: 'Still a draft.',
    });

    await expect(
      service.obsoleteRequirementVersion(a.id, 'Abandoned', ACTOR),
    ).rejects.toThrow(ConflictError);
  });
});
