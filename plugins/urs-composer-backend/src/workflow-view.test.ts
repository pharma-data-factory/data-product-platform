/**
 * The workflow view (invariant 17): a derived timeline of where something
 * stands, and whether it agrees with the records it summarises.
 */

import { NotFoundError } from '@backstage/errors';
import { URSService } from './service';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import { hashOf } from './domain/signature-service';
import { WorkflowStage, WorkflowState } from './domain/workflow';
import {
  ApprovalRole,
  GxPRelevance,
  RequirementPriority,
  RequirementVersion,
  SignatureMeaning,
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

const AUTHOR = 'user:default/author';
const REVIEWER = 'user:default/reviewer';
const QA = 'user:default/qa';
const PIN = 'signing-pin-1';
const CAPABILITY = 'business-capability:make/equipment-performance-management';

const GROUPS: Record<string, string[]> = {
  [AUTHOR]: ['group:default/urs-authors'],
  [REVIEWER]: ['group:default/urs-business-reviewers'],
  [QA]: ['group:default/urs-quality-reviewers'],
};

const CATALOG: any = {
  getEntityByRef: jest.fn(async (ref: string) => ({
    kind: 'User',
    metadata: { name: ref },
    spec: {
      memberOf: GROUPS[ref] ?? [
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
    { sequence: 2, role: ApprovalRole.QUALITY_REVIEWER, required: true },
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
  for (const user of [AUTHOR, REVIEWER, QA]) {
    await new SignaturePinReAuth(repository).enroll(user, PIN);
  }

  const set = await service.createRequirementSet(
    {
      businessCapabilityRefs: [CAPABILITY],
      businessNeed: 'Workflow view',
      solutionType: SolutionType.PROJECT,
      solutionName: 'Workflow View',
      gxpRelevance: GxPRelevance.NONE,
    },
    AUTHOR,
  );

  return { repository, service, setId: set.id };
}

async function aVersion(
  service: URSService,
  repository: URSRepository,
  setId: string,
  status: URSStatus = URSStatus.DRAFT,
): Promise<RequirementVersion> {
  const requirement = await service.createRequirement(
    setId,
    {
      title: 'Temperature monitoring',
      statement: 'The system shall record temperature every 60 seconds.',
      priority: RequirementPriority.MUST,
    },
    AUTHOR,
  );

  const version: RequirementVersion = {
    id: `ver-${Math.random().toString(36).slice(2, 10)}`,
    requirementId: requirement.requirementId,
    version: '0.1',
    versionLabel: '0.1',
    major: 0,
    minor: 1,
    versionNumber: 1,
    title: 'Temperature monitoring',
    statement: 'The system shall record temperature every 60 seconds.',
    priority: RequirementPriority.MUST,
    status,
    createdBy: AUTHOR,
    createdAt: new Date(),
    revision: 1,
  };
  const stored = { ...version, contentHash: hashOf(version) };
  await repository.createRequirementVersion(stored);
  return stored;
}

/** The state of one stage in the returned timeline. */
function stage(view: any, name: WorkflowStage) {
  return view.steps.find((s: any) => s.stage === name);
}

describe('A requirement version timeline', () => {
  test('always reports the four stages in order', async () => {
    const { repository, service, setId } = await setup();
    const version = await aVersion(service, repository, setId);

    const view = await service.getRequirementVersionWorkflow(version.id);

    expect(view.steps.map(s => s.stage)).toEqual([
      WorkflowStage.CREATED,
      WorkflowStage.REVIEW,
      WorkflowStage.QA_APPROVAL,
      WorkflowStage.RELEASED,
    ]);
  });

  test('a fresh draft is created, with everything else still ahead', async () => {
    const { repository, service, setId } = await setup();
    const version = await aVersion(service, repository, setId);

    const view = await service.getRequirementVersionWorkflow(version.id);

    expect(stage(view, WorkflowStage.CREATED)).toMatchObject({
      state: WorkflowState.DONE,
      actor: AUTHOR,
    });
    expect(stage(view, WorkflowStage.REVIEW).state).toBe(WorkflowState.OPEN);
    expect(stage(view, WorkflowStage.RELEASED).state).toBe(WorkflowState.OPEN);
  });

  test('a version in review shows review as where the work sits', async () => {
    const { repository, service, setId } = await setup();
    const version = await aVersion(service, repository, setId);
    await repository.updateRequirementVersion({
      ...version,
      status: URSStatus.IN_REVIEW,
    });

    const view = await service.getRequirementVersionWorkflow(version.id);

    expect(stage(view, WorkflowStage.REVIEW).state).toBe(WorkflowState.ACTIVE);
    expect(stage(view, WorkflowStage.QA_APPROVAL).state).toBe(
      WorkflowState.OPEN,
    );
  });

  test('a review signature names who reviewed, when and why', async () => {
    const { repository, service, setId } = await setup();
    const version = await aVersion(service, repository, setId);
    await repository.updateRequirementVersion({
      ...version,
      status: URSStatus.IN_REVIEW,
    });

    await service.signRequirementVersion(
      version.id,
      SignatureMeaning.REVIEWED,
      REVIEWER,
      PIN,
      'Reads correctly',
    );

    const view = await service.getRequirementVersionWorkflow(version.id);

    expect(stage(view, WorkflowStage.REVIEW)).toMatchObject({
      state: WorkflowState.DONE,
      actor: REVIEWER,
      comment: 'Reads correctly',
    });
    expect(stage(view, WorkflowStage.REVIEW).timestamp).toBeDefined();
  });

  test('a released version shows approval and release as done', async () => {
    const { repository, service, setId } = await setup();
    const version = await aVersion(service, repository, setId);
    await repository.updateRequirementVersion({
      ...version,
      status: URSStatus.IN_REVIEW,
    });
    await service.signRequirementVersion(
      version.id,
      SignatureMeaning.REVIEWED,
      REVIEWER,
      PIN,
    );
    await repository.updateRequirementVersion({
      ...(await repository.getRequirementVersion(version.id))!,
      status: URSStatus.REVIEWED,
    });
    await repository.updateRequirementVersion({
      ...(await repository.getRequirementVersion(version.id))!,
      status: URSStatus.IN_APPROVAL,
    });
    await service.signRequirementVersion(
      version.id,
      SignatureMeaning.APPROVED_QA,
      QA,
      PIN,
      'Approved for release',
    );

    const view = await service.getRequirementVersionWorkflow(version.id);

    expect(view.status).toBe(URSStatus.APPROVED);
    expect(stage(view, WorkflowStage.QA_APPROVAL)).toMatchObject({
      state: WorkflowState.DONE,
      actor: QA,
      comment: 'Approved for release',
    });
    expect(stage(view, WorkflowStage.RELEASED)).toMatchObject({
      state: WorkflowState.DONE,
      actor: QA,
    });
  });

  test('a rejected version marks the stages it will never reach', async () => {
    const { repository, service, setId } = await setup();
    const version = await aVersion(service, repository, setId);
    await repository.updateRequirementVersion({
      ...version,
      status: URSStatus.IN_REVIEW,
    });
    await repository.updateRequirementVersion({
      ...(await repository.getRequirementVersion(version.id))!,
      status: URSStatus.REJECTED,
    });

    const view = await service.getRequirementVersionWorkflow(version.id);

    expect(stage(view, WorkflowStage.QA_APPROVAL).state).toBe(
      WorkflowState.STOPPED,
    );
    expect(stage(view, WorkflowStage.RELEASED).state).toBe(
      WorkflowState.STOPPED,
    );
  });

  test('an unknown version is a 404, not an empty timeline', async () => {
    const { service } = await setup();

    await expect(
      service.getRequirementVersionWorkflow('no-such-version'),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('A baseline timeline', () => {
  async function aBaseline(service: URSService, setId: string) {
    return service.createBaseline(setId, [], '1.0', AUTHOR);
  }

  test('a draft baseline is created and nothing else', async () => {
    const { service, setId } = await setup();
    const baseline = await aBaseline(service, setId);

    const view = await service.getBaselineWorkflow(baseline.id);

    expect(stage(view, WorkflowStage.CREATED)).toMatchObject({
      state: WorkflowState.DONE,
      actor: AUTHOR,
    });
    expect(stage(view, WorkflowStage.REVIEW).state).toBe(WorkflowState.OPEN);
  });

  test('a submitted baseline shows review as active and who submitted it', async () => {
    const { service, setId } = await setup();
    const baseline = await aBaseline(service, setId);
    await service.submitBaseline(baseline.id, AUTHOR);

    const view = await service.getBaselineWorkflow(baseline.id);

    expect(stage(view, WorkflowStage.REVIEW)).toMatchObject({
      state: WorkflowState.ACTIVE,
      actor: AUTHOR,
    });
  });

  test('a completed chain names the reviewer and the approver separately', async () => {
    const { service, setId } = await setup();
    const baseline = await aBaseline(service, setId);
    const instance = await service.submitBaseline(baseline.id, AUTHOR);

    await service.approveApprovalStep(
      instance.id,
      instance.steps[0].id,
      REVIEWER,
      'Business review done',
      undefined,
      PIN,
    );
    await service.approveApprovalStep(
      instance.id,
      instance.steps[1].id,
      QA,
      'Approved',
      undefined,
      PIN,
    );

    const view = await service.getBaselineWorkflow(baseline.id);

    expect(view.status).toBe(URSStatus.APPROVED);
    expect(stage(view, WorkflowStage.REVIEW)).toMatchObject({
      state: WorkflowState.DONE,
      actor: REVIEWER,
      comment: 'Business review done',
    });
    expect(stage(view, WorkflowStage.QA_APPROVAL)).toMatchObject({
      state: WorkflowState.DONE,
      actor: QA,
      comment: 'Approved',
    });
    expect(stage(view, WorkflowStage.RELEASED).state).toBe(WorkflowState.DONE);
  });

  test('an unknown baseline is a 404', async () => {
    const { service } = await setup();

    await expect(service.getBaselineWorkflow('no-such-baseline')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('The requirement set audit trail', () => {
  test('records the set approval that the baseline chain triggers', async () => {
    const { repository, service, setId } = await setup();
    const baseline = await service.createBaseline(setId, [], '1.0', AUTHOR);
    const instance = await service.submitBaseline(baseline.id, AUTHOR);

    await service.approveApprovalStep(
      instance.id,
      instance.steps[0].id,
      REVIEWER,
      'Reviewed',
      undefined,
      PIN,
    );
    await service.approveApprovalStep(
      instance.id,
      instance.steps[1].id,
      QA,
      'Approved',
      undefined,
      PIN,
    );

    const trail = await repository.getAuditTrail(setId);
    expect(trail.map(e => e.eventType)).toEqual(
      expect.arrayContaining(['CREATED', 'APPROVED']),
    );
    expect(trail.find(e => e.eventType === 'APPROVED')).toMatchObject({
      actor: QA,
    });
  });
});
