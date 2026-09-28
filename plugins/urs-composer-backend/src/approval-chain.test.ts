/**
 * Regression tests for the URS approval chain.
 *
 * These cover defects that made the three-step GxP workflow unusable:
 * - QUALITY_REVIEWER was mapped to a group that exists nowhere in the catalog,
 *   so the final step could not be approved by anyone.
 * - Approval steps did not carry `required` through persistence, so the first
 *   approval was treated as the final one and released the whole baseline.
 * - A truthiness check on gxpRelevance routed non-GxP sets into the GxP flow.
 */

import { URSService } from './service';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import {
  ApprovalInstance,
  ApprovalRole,
  ApprovalInstanceStatus,
  ApprovalStepStatus,
  Baseline,
  GxPRelevance,
  RequirementSet,
  SolutionType,
  URSStatus,
} from './types';

const TEST_PIN = 'signing-pin-1';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

/** Catalog stub that reports the given group memberships for any user. */
function catalogWithGroups(groups: string[]): any {
  return {
    getEntityByRef: jest.fn(async () => ({
      kind: 'User',
      metadata: { name: 'tester' },
      spec: { memberOf: groups },
    })),
  };
}

const GXP_WORKFLOW = {
  id: 'standard-gxp-urs',
  name: 'Standard GxP URS Approval',
  steps: [
    { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
    { sequence: 2, role: ApprovalRole.PRODUCT_MANAGER, required: true },
    { sequence: 3, role: ApprovalRole.QUALITY_REVIEWER, required: true },
  ],
  createdAt: new Date(),
};

const NON_GXP_WORKFLOW = {
  id: 'non-gxp-urs',
  name: 'Non-GxP URS Approval',
  steps: [
    { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
    { sequence: 2, role: ApprovalRole.PRODUCT_MANAGER, required: true },
  ],
  createdAt: new Date(),
};

function requirementSet(gxpRelevance: GxPRelevance): RequirementSet {
  return {
    id: 'set-001',
    requirementSetId: 'URS-TS',
    versionNumber: 1,
    businessCapabilityRefs: [],
    businessNeed: 'Test need',
    solutionType: SolutionType.COMPONENT,
    solutionName: 'Test Solution',
    gxpRelevance,
    status: URSStatus.DRAFT,
    createdBy: 'user:default/author',
    createdAt: new Date(),
  };
}

function baseline(): Baseline {
  return {
    id: 'baseline-001',
    requirementSetId: 'set-001',
    baselineVersion: '1.0',
    status: URSStatus.DRAFT,
    requirementVersionIds: [],
    createdBy: 'user:default/author',
    createdAt: new Date(),
    revision: 1,
  };
}

async function setup(gxpRelevance: GxPRelevance, groups: string[]) {
  const repository = new URSRepository();
  await repository.createApprovalWorkflow(GXP_WORKFLOW as any);
  await repository.createApprovalWorkflow(NON_GXP_WORKFLOW as any);
  await repository.createRequirementSet(requirementSet(gxpRelevance));
  await repository.createBaseline(baseline());

  const service = new URSService({
    logger: mockLogger as any,
    repository,
    catalog: catalogWithGroups(groups),
  });

  for (const user of [
    'user:default/author',
    'user:default/reviewer',
    'user:default/qa',
  ]) {
    await new SignaturePinReAuth(repository).enroll(user, TEST_PIN);
  }

  return { repository, service };
}

describe('Approval role resolution', () => {
  test('resolves QUALITY_REVIEWER from the urs-quality-reviewers group', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-quality-reviewers',
    ]);

    const roles = await service.getUserApprovalRoles(
      'user:default/qa',
      {} as any,
    );

    expect(roles).toContain(ApprovalRole.QUALITY_REVIEWER);
  });

  test('resolves reviewer and product manager from their urs-* groups', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-business-reviewers',
      'group:default/urs-product-managers',
    ]);

    const roles = await service.getUserApprovalRoles(
      'user:default/reviewer',
      {} as any,
    );

    expect(roles).toEqual(
      expect.arrayContaining([
        ApprovalRole.BUSINESS_REVIEWER,
        ApprovalRole.PRODUCT_MANAGER,
      ]),
    );
  });

  test('keeps the legacy group names working', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, [
      'group:default/business-capability-leads',
    ]);

    const roles = await service.getUserApprovalRoles(
      'user:default/lead',
      {} as any,
    );

    expect(roles).toContain(ApprovalRole.BUSINESS_REVIEWER);
  });
});

describe('Workflow selection by GxP relevance', () => {
  test('NONE selects the two-step non-GxP workflow', async () => {
    const { service } = await setup(GxPRelevance.NONE, []);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );

    expect(instance.workflowId).toBe('non-gxp-urs');
    expect(instance.steps).toHaveLength(2);
  });

  test('DIRECT selects the three-step GxP workflow', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, []);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );

    expect(instance.workflowId).toBe('standard-gxp-urs');
    expect(instance.steps).toHaveLength(3);
  });
});

describe('Approval steps', () => {
  test('steps are individually retrievable and carry their instance id', async () => {
    const { repository, service } = await setup(GxPRelevance.DIRECT, []);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );

    const steps = await repository.listApprovalSteps(instance.id);

    expect(steps).toHaveLength(3);
    expect(steps.map(s => s.sequence)).toEqual([1, 2, 3]);
    expect(steps.every(s => s.approvalInstanceId === instance.id)).toBe(true);
    expect(steps.every(s => s.required === true)).toBe(true);
  });

  test('approving the first of three steps does not release the baseline', async () => {
    const { repository, service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-business-reviewers',
    ]);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );
    const firstStep = instance.steps.find(s => s.sequence === 1)!;

    const updated = await service.approveApprovalStep(
      instance.id,
      firstStep.id,
      'user:default/reviewer',
      'looks good',
      {} as any,
      TEST_PIN,
    );

    expect(updated.status).toBe(ApprovalInstanceStatus.IN_PROGRESS);
    expect(
      updated.steps.filter(s => s.status === ApprovalStepStatus.APPROVED),
    ).toHaveLength(1);

    const stored = await repository.getBaseline('baseline-001');
    expect(stored?.status).toBe(URSStatus.IN_REVIEW);
  });

  test('a failing cascade rolls back the whole approval', async () => {
    const { repository, service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-business-reviewers',
    ]);
    await repository.createApprovalWorkflow({
      id: 'single-step-urs',
      name: 'Single Step',
      steps: [
        { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
      ],
      createdAt: new Date(),
    } as any);

    const instance = await service.createApprovalInstance(
      'baseline-001',
      'single-step-urs',
      'user:default/author',
    );
    const onlyStep = instance.steps[0];

    // Fail part-way through the final cascade, after the step audit event
    // has already been written.
    jest
      .spyOn(repository, 'updateBaseline')
      .mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(
      service.approveApprovalStep(
        instance.id,
        onlyStep.id,
        'user:default/reviewer',
        undefined,
        {} as any,
        TEST_PIN,
      ),
    ).rejects.toThrow('storage unavailable');

    const stepAudit = await repository.getEntityAuditTrail(
      onlyStep.id,
      'APPROVAL_STEP',
    );
    expect(stepAudit).toHaveLength(0);

    const storedInstance = await repository.getApprovalInstance(instance.id);
    expect(storedInstance?.status).not.toBe(ApprovalInstanceStatus.APPROVED);
    expect(storedInstance?.steps[0].status).not.toBe(
      ApprovalStepStatus.APPROVED,
    );

    const storedBaseline = await repository.getBaseline('baseline-001');
    expect(storedBaseline?.status).toBe(URSStatus.DRAFT);
  });

  test('a quality reviewer cannot approve the business step', async () => {
    // Asserted on the step that is *due*, so the role rule is what answers.
    //
    // This case used to reach for step 3 while step 1 was still open, which
    // the order rule below now refuses first — the role check never ran, and
    // the test passed for the wrong reason. Isolating the two keeps both
    // guarantees pinned instead of one masking the other.
    const { service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-quality-reviewers',
    ]);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );
    const businessStep = instance.steps.find(s => s.sequence === 1)!;

    await expect(
      service.approveApprovalStep(
        instance.id,
        businessStep.id,
        'user:default/qa',
        undefined,
        {} as any,
        TEST_PIN,
      ),
    ).rejects.toThrow(/requires role 'BUSINESS_REVIEWER'/);
  });

  test('a later step cannot be approved while an earlier one is open', async () => {
    // The chain has to be a chain. Driving the journey on a running stack
    // showed the QUALITY_REVIEWER step being approved while the
    // PRODUCT_MANAGER step below it was still PENDING, and the platform
    // accepting it — the quality reviewer signing off on a package the product
    // manager had not reviewed. NXD-059, finding 1.
    //
    // The actor here holds the role the step requires, so nothing but the
    // order stands between them and the approval.
    const { service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-quality-reviewers',
    ]);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );
    const qualityStep = instance.steps.find(s => s.sequence === 3)!;

    await expect(
      service.approveApprovalStep(
        instance.id,
        qualityStep.id,
        'user:default/qa',
        undefined,
        {} as any,
        TEST_PIN,
      ),
    ).rejects.toThrow(
      /Step 3 \(QUALITY_REVIEWER\) cannot be approved while step 1 \(BUSINESS_REVIEWER\) is still PENDING/,
    );
  });
});

/**
 * `currentStepSequence` names the step the chain is waiting on.
 *
 * It did not. `approveApprovalStep` incremented it instead of setting it to
 * the step it had just activated, and picked that step by array position
 * rather than by lowest sequence. The increment was off by one from the very
 * first advance — approve step 1 of the three-step GxP workflow and the field
 * read 1 while the step now due was 2, so it named the step just *approved*.
 *
 * Nothing caught it because the only assertion on the field compared two
 * hand-written numbers in a frontend fixture, and the backend contract test
 * stopped before the first approval. The page now reads this field to decide
 * which step to offer a decision on, so it has to be right. NXD-072.
 */
describe('the sequence the chain is waiting on', () => {
  const ALL_APPROVAL_GROUPS = [
    'group:default/urs-business-reviewers',
    'group:default/urs-product-managers',
    'group:default/urs-quality-reviewers',
  ];

  async function approve(
    service: any,
    instanceId: string,
    stepId: string,
  ): Promise<ApprovalInstance> {
    return service.approveApprovalStep(
      instanceId,
      stepId,
      'user:default/reviewer',
      undefined,
      {} as any,
      TEST_PIN,
    );
  }

  test('points at the first step before anyone has approved anything', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, ALL_APPROVAL_GROUPS);

    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );

    // Was 0 — a sequence no step has — until the first approval moved it.
    expect(instance.currentStepSequence).toBe(1);
  });

  test('advances to the step now due, not past it', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, ALL_APPROVAL_GROUPS);
    const instance = await service.submitBaseline(
      'baseline-001',
      'user:default/author',
    );

    const afterFirst = await approve(
      service,
      instance.id,
      instance.steps.find(s => s.sequence === 1)!.id,
    );
    // The mutation check: with the old `+ 1` this is 1, naming the step that
    // was just approved.
    expect(afterFirst.currentStepSequence).toBe(2);
    expect(
      afterFirst.steps.find(s => s.sequence === 2)!.status,
    ).toBe(ApprovalStepStatus.ACTIVE);

    const afterSecond = await approve(
      service,
      instance.id,
      afterFirst.steps.find(s => s.sequence === 2)!.id,
    );
    expect(afterSecond.currentStepSequence).toBe(3);
    expect(
      afterSecond.steps.find(s => s.sequence === 3)!.status,
    ).toBe(ApprovalStepStatus.ACTIVE);
  });

  test('the due step is the lowest open sequence, not the first in the array', async () => {
    // The seeded workflows are dense 1..2..3 and written in order, so array
    // position and sequence order agree and neither can distinguish a correct
    // implementation from the old one. This workflow is neither dense nor
    // written in order.
    const { repository, service } = await setup(
      GxPRelevance.DIRECT,
      ALL_APPROVAL_GROUPS,
    );
    await repository.createApprovalWorkflow({
      id: 'sparse-urs',
      name: 'Sparse and out of order',
      steps: [
        { sequence: 30, role: ApprovalRole.QUALITY_REVIEWER, required: true },
        { sequence: 10, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
        { sequence: 20, role: ApprovalRole.PRODUCT_MANAGER, required: true },
      ],
      createdAt: new Date(),
    } as any);

    const instance = await service.createApprovalInstance(
      'baseline-001',
      'sparse-urs',
      'user:default/author',
    );
    expect(instance.currentStepSequence).toBe(10);

    const advanced = await approve(
      service,
      instance.id,
      instance.steps.find(s => s.sequence === 10)!.id,
    );
    // Array position would have given 30, the step written first.
    expect(advanced.currentStepSequence).toBe(20);
  });

  test('an optional step is never the one the chain waits on', async () => {
    const { repository, service } = await setup(
      GxPRelevance.DIRECT,
      ALL_APPROVAL_GROUPS,
    );
    await repository.createApprovalWorkflow({
      id: 'optional-first-urs',
      name: 'Optional first',
      steps: [
        { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: false },
        { sequence: 2, role: ApprovalRole.PRODUCT_MANAGER, required: true },
      ],
      createdAt: new Date(),
    } as any);

    const instance = await service.createApprovalInstance(
      'baseline-001',
      'optional-first-urs',
      'user:default/author',
    );

    // The workflow says step 1 may be left out; making the chain wait on it
    // would make it mandatory by the back door.
    expect(instance.currentStepSequence).toBe(2);
  });
});

describe('Repository transactions', () => {
  test('withTransaction discards writes when the callback throws', async () => {
    const repository = new URSRepository();

    await expect(
      repository.withTransaction(async repo => {
        await repo.createBusinessRole({
          id: 'role:temporary',
          name: 'Temporary',
          status: 'ACTIVE',
          createdAt: new Date(),
          createdBy: 'tester',
          version: 1,
        });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await repository.getBusinessRole('role:temporary')).toBeNull();
  });

  test('withTransaction keeps writes when the callback resolves', async () => {
    const repository = new URSRepository();

    await repository.withTransaction(async repo => {
      await repo.createBusinessRole({
        id: 'role:kept',
        name: 'Kept',
        status: 'ACTIVE',
        createdAt: new Date(),
        createdBy: 'tester',
        version: 1,
      });
    });

    expect(await repository.getBusinessRole('role:kept')).not.toBeNull();
  });
});
