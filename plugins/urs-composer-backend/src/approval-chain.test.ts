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
import {
  ApprovalRole,
  ApprovalInstanceStatus,
  ApprovalStepStatus,
  Baseline,
  GxPRelevance,
  RequirementSet,
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
    );

    expect(updated.status).toBe(ApprovalInstanceStatus.IN_PROGRESS);
    expect(
      updated.steps.filter(s => s.status === ApprovalStepStatus.APPROVED),
    ).toHaveLength(1);

    const stored = await repository.getBaseline('baseline-001');
    expect(stored?.status).toBe(URSStatus.IN_REVIEW);
  });

  test('a reviewer cannot approve the quality step', async () => {
    const { service } = await setup(GxPRelevance.DIRECT, [
      'group:default/urs-business-reviewers',
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
        'user:default/reviewer',
        undefined,
        {} as any,
      ),
    ).rejects.toThrow(/requires role 'QUALITY_REVIEWER'/);
  });
});
