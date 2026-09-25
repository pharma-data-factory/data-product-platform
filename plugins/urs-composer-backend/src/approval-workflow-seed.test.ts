/**
 * The approval workflows exist before anyone creates one.
 *
 * `submitBaseline` resolves `standard-gxp-urs` or `non-gxp-urs` by a fixed id,
 * and `createApprovalInstance` throws `Workflow not found` when the lookup
 * misses. Only `db/seeds.ts` ever created those rows and only
 * `postgres-repository.ts` runs it, so in the persistence mode `app-config.yaml`
 * ships (`ursComposer.persistence.mode: memory`) submitting a baseline for
 * approval failed — with no way round it from the UI, which has no screen for
 * creating a workflow.
 *
 * Every other suite in this plugin calls `createApprovalWorkflow` in its own
 * setup, which is exactly why the gap survived: the tests supplied the thing
 * production was missing. This one deliberately does not.
 */

import { URSService } from './service';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import { hashOf } from './domain/signature-service';
import { APPROVAL_WORKFLOWS } from './data/approvalWorkflows';
import {
  ApprovalRole,
  GxPRelevance,
  RequirementPriority,
  RequirementVersion,
  SolutionType,
  URSStatus,
} from './types';

const TEST_PIN = 'signing-pin-1';
const ACTOR = 'user:default/author';
const CAPABILITY = 'business-capability:make/equipment-performance-management';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

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

/**
 * A service over a repository nobody has seeded by hand.
 *
 * The absence of `createApprovalWorkflow` here is the point of the file.
 */
async function setup(gxpRelevance: GxPRelevance) {
  const repository = new URSRepository();
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
  await new SignaturePinReAuth(repository).enroll(ACTOR, TEST_PIN);

  const set = await service.createRequirementSet(
    {
      businessCapabilityRefs: [CAPABILITY],
      businessNeed: 'Approval workflow seeding',
      solutionType: SolutionType.PROJECT,
      solutionName: 'Approval Workflow Seeding',
      gxpRelevance,
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
    id: 'version-001',
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
    // Approved, because completing the chain releases the baseline and a
    // baseline may only pin released versions. Which status a version must
    // hold is invariant 9's business, tested in `baseline-rules.test.ts`.
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

  return { repository, service, baselineId: baseline.id };
}

describe('Approval workflows are reference data, present from the start', () => {
  test('a fresh in-memory repository already resolves both workflow ids', async () => {
    const repository = new URSRepository();

    const gxp = await repository.getApprovalWorkflow('standard-gxp-urs');
    const nonGxp = await repository.getApprovalWorkflow('non-gxp-urs');

    expect(gxp?.steps.map(step => step.role)).toEqual([
      ApprovalRole.BUSINESS_REVIEWER,
      ApprovalRole.PRODUCT_MANAGER,
      ApprovalRole.QUALITY_REVIEWER,
    ]);
    expect(nonGxp?.steps.map(step => step.role)).toEqual([
      ApprovalRole.BUSINESS_REVIEWER,
      ApprovalRole.PRODUCT_MANAGER,
    ]);
  });

  test('the canonical list holds exactly the two ids submitBaseline asks for', () => {
    // A third workflow here would never be selected, and a renamed id would
    // reintroduce the failure this file exists to prevent.
    expect(APPROVAL_WORKFLOWS.map(workflow => workflow.id).sort()).toEqual([
      'non-gxp-urs',
      'standard-gxp-urs',
    ]);
  });

  test('a GxP baseline can be submitted without anyone creating a workflow', async () => {
    const { service, baselineId } = await setup(GxPRelevance.DIRECT);

    const instance = await service.submitBaseline(baselineId, ACTOR);

    expect(instance.workflowId).toBe('standard-gxp-urs');
    expect(instance.steps).toHaveLength(3);
  });

  test('a non-GxP baseline can be submitted without anyone creating a workflow', async () => {
    const { service, baselineId } = await setup(GxPRelevance.NONE);

    const instance = await service.submitBaseline(baselineId, ACTOR);

    expect(instance.workflowId).toBe('non-gxp-urs');
    expect(instance.steps).toHaveLength(2);
  });

  test('the submitted baseline can be approved through to APPROVED', async () => {
    const { repository, service, baselineId } = await setup(GxPRelevance.NONE);

    const instance = await service.submitBaseline(baselineId, ACTOR);
    for (const step of instance.steps) {
      await service.approveApprovalStep(
        instance.id,
        step.id,
        ACTOR,
        'Approved',
        undefined,
        TEST_PIN,
      );
    }

    const baseline = await repository.getBaseline(baselineId);
    expect(baseline?.status).toBe(URSStatus.APPROVED);
  });
});
