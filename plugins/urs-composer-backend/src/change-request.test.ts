/**
 * Change control: identifiers, the assessment-before-approval rule,
 * separation of duties on the decision, and the requirement that a released
 * requirement may only be changed under an approved request (invariant 8).
 */

import { ConflictError, NotAllowedError } from '@backstage/errors';
import { URSService } from './service';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import { hashOf } from './domain/signature-service';
import {
  ChangeRequestStatus,
  RequirementPriority,
  RequirementVersion,
  SignatureTargetType,
  URSStatus,
} from './types';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const REQUESTER = 'user:default/requester';
const ASSESSOR = 'user:default/assessor';
const QA = 'user:default/qa';
const PIN = 'signing-pin-1';

const CATALOG: any = {
  getEntityByRef: jest.fn(async (ref: string) => ({
    kind: 'User',
    metadata: { name: ref },
    spec: {
      memberOf:
        ref === QA
          ? ['group:default/urs-quality-reviewers']
          : ['group:default/urs-authors'],
    },
  })),
};

async function setup() {
  const repository = new URSRepository();
  const service = new URSService({
    logger: mockLogger,
    repository,
    catalog: CATALOG,
  });
  for (const user of [REQUESTER, ASSESSOR, QA]) {
    await new SignaturePinReAuth(repository).enroll(user, PIN);
  }
  return { repository, service };
}

const DRAFT_REQUEST = {
  title: 'Raise sampling rate',
  description: 'Record temperature every 30 seconds instead of 60.',
  reason: 'A regulator asked for finer granularity.',
  affectedRequirementIds: ['URS-CR-001'],
};

const ASSESSMENT = {
  summary: 'Touches the sampling loop and its acceptance criteria.',
  gxpImpact: true,
  validationImpact: 'The sampling test case has to be re-executed.',
};

/** Raise a request and take it all the way to APPROVED. */
async function approvedRequest(service: URSService) {
  const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
  await service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR);
  await service.approveChangeRequest(created.id, QA, PIN, 'Approved');
  return created.id;
}

describe('Identifiers', () => {
  test('follow CR-<year>-<sequence> and are assigned server-side', async () => {
    const { service } = await setup();
    const year = new Date().getFullYear();

    const first = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    expect(first.id).toBe(`CR-${year}-0001`);
  });

  test('count up within the year', async () => {
    const { service } = await setup();
    const year = new Date().getFullYear();

    await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    const second = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    const third = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);

    expect([second.id, third.id]).toEqual([
      `CR-${year}-0002`,
      `CR-${year}-0003`,
    ]);
  });

  test('a new request starts as a draft raised by the caller', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);

    expect(created).toMatchObject({
      status: ChangeRequestStatus.DRAFT,
      requestedBy: REQUESTER,
    });
  });
});

describe('Assessment before approval', () => {
  test('an unassessed request cannot be approved', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);

    await expect(
      service.approveChangeRequest(created.id, QA, PIN),
    ).rejects.toThrow(/must be ASSESSED/);
  });

  test('assessing moves the request to ASSESSED', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);

    await service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR);

    expect(await service.getChangeRequest(created.id)).toMatchObject({
      status: ChangeRequestStatus.ASSESSED,
    });
  });

  test('a request is assessed only once', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    await service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR);

    await expect(
      service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR),
    ).rejects.toThrow(ConflictError);
  });

  test('a decided request cannot be assessed afterwards', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    await service.rejectChangeRequest(created.id, 'Not now', QA);

    await expect(
      service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR),
    ).rejects.toThrow(ConflictError);
  });
});

describe('Deciding a change request', () => {
  test('approval requires the quality role', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    await service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR);

    await expect(
      service.approveChangeRequest(created.id, ASSESSOR, PIN),
    ).rejects.toThrow(NotAllowedError);
  });

  test('the requester cannot approve their own request', async () => {
    const { repository, service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, QA);
    await service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR);

    await expect(
      service.approveChangeRequest(created.id, QA, PIN),
    ).rejects.toThrow(/raised .* and cannot approve/);

    expect(await repository.getChangeRequest(created.id)).toMatchObject({
      status: ChangeRequestStatus.ASSESSED,
    });
  });

  test('the assessor cannot also approve', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    await service.assessChangeRequest(created.id, ASSESSMENT, QA);

    await expect(
      service.approveChangeRequest(created.id, QA, PIN),
    ).rejects.toThrow(/assessed .* and cannot also approve/);
  });

  test('approval requires the signing PIN', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);
    await service.assessChangeRequest(created.id, ASSESSMENT, ASSESSOR);

    await expect(
      service.approveChangeRequest(created.id, QA, 'wrong-pin'),
    ).rejects.toThrow(/Re-authentication failed/);
  });

  test('a valid approval records a signature and the decision', async () => {
    const { repository, service } = await setup();
    const id = await approvedRequest(service);

    expect(await repository.getChangeRequest(id)).toMatchObject({
      status: ChangeRequestStatus.APPROVED,
      decidedBy: QA,
    });
    expect(
      await repository.listSignatures(SignatureTargetType.CHANGE_REQUEST, id),
    ).toHaveLength(1);
  });

  test('rejection needs a reason and takes no signature', async () => {
    const { service } = await setup();
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);

    await expect(
      service.rejectChangeRequest(created.id, '   ', QA),
    ).rejects.toThrow(/reason is required/);

    const rejected = await service.rejectChangeRequest(
      created.id,
      'Superseded by a different approach',
      QA,
    );
    expect(rejected).toMatchObject({
      status: ChangeRequestStatus.REJECTED,
      decidedBy: QA,
    });
  });

  test('a decided request cannot be decided again', async () => {
    const { service } = await setup();
    const id = await approvedRequest(service);

    await expect(service.rejectChangeRequest(id, 'Changed my mind', QA)).rejects.toThrow(
      ConflictError,
    );
  });
});

describe('Invariant 8: changing a released requirement', () => {
  function releasedVersion(): RequirementVersion {
    const version: RequirementVersion = {
      id: 'ver-released',
      requirementId: 'URS-CR-001',
      version: '1.0',
      versionLabel: '1.0',
      major: 1,
      minor: 0,
      versionNumber: 100,
      title: 'Temperature monitoring',
      statement: 'The system shall record temperature every 60 seconds.',
      priority: RequirementPriority.MUST,
      status: URSStatus.APPROVED,
      createdBy: REQUESTER,
      createdAt: new Date(),
      approvedBy: QA,
      approvedAt: new Date(),
      revision: 1,
    };
    return { ...version, contentHash: hashOf(version) };
  }

  function draftVersion(): RequirementVersion {
    const version: RequirementVersion = {
      ...releasedVersion(),
      id: 'ver-draft',
      version: '0.1',
      versionLabel: '0.1',
      major: 0,
      minor: 1,
      versionNumber: 1,
      status: URSStatus.DRAFT,
      approvedBy: undefined,
      approvedAt: undefined,
    };
    return { ...version, contentHash: hashOf(version) };
  }

  test('a requirement that was never released needs no change request', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(draftVersion());
    await repository.updateRequirementVersion({
      ...draftVersion(),
      status: URSStatus.IN_REVIEW,
    });
    await repository.updateRequirementVersion({
      ...(await repository.getRequirementVersion('ver-draft'))!,
      status: URSStatus.REJECTED,
    });

    await expect(
      service.createRevision('ver-draft', 'Second attempt', REQUESTER),
    ).resolves.toBeDefined();
  });

  test('a released requirement cannot be revised without one', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(releasedVersion());

    await expect(
      service.createRevision('ver-released', 'Tighten the interval', REQUESTER),
    ).rejects.toThrow(/requires an approved change request/);
  });

  test('an unapproved change request is not enough', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(releasedVersion());
    const created = await service.createChangeRequest(DRAFT_REQUEST, REQUESTER);

    await expect(
      service.createRevision(
        'ver-released',
        'Tighten the interval',
        REQUESTER,
        created.id,
      ),
    ).rejects.toThrow(/is DRAFT; only an APPROVED request/);
  });

  test('an unknown change request is refused', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(releasedVersion());

    await expect(
      service.createRevision(
        'ver-released',
        'Tighten the interval',
        REQUESTER,
        'CR-1999-0001',
      ),
    ).rejects.toThrow(/not found/);
  });

  test('an approved change request authorises the new version', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(releasedVersion());
    const id = await approvedRequest(service);

    const revision = await service.createRevision(
      'ver-released',
      'Tighten the interval',
      REQUESTER,
      id,
    );

    expect(revision).toMatchObject({
      changeRequestId: id,
      versionLabel: '1.1-draft',
      status: URSStatus.DRAFT,
    });
  });
});

describe('Traceability', () => {
  test('links the request to its assessment, signature and resulting version', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion({
      id: 'ver-released',
      requirementId: 'URS-CR-001',
      version: '1.0',
      versionLabel: '1.0',
      major: 1,
      minor: 0,
      versionNumber: 100,
      title: 'Temperature monitoring',
      statement: 'The system shall record temperature every 60 seconds.',
      priority: RequirementPriority.MUST,
      status: URSStatus.APPROVED,
      createdBy: REQUESTER,
      createdAt: new Date(),
      revision: 1,
    });

    const id = await approvedRequest(service);
    const revision = await service.createRevision(
      'ver-released',
      'Tighten the interval',
      REQUESTER,
      id,
    );

    const trace = await service.getChangeRequestTraceability(id);

    expect(trace.changeRequest.id).toBe(id);
    expect(trace.assessment).toMatchObject({ assessedBy: ASSESSOR });
    expect(trace.signatures).toHaveLength(1);
    expect(trace.resultingVersions.map(v => v.id)).toEqual([revision.id]);
    expect(trace.auditTrail.map(e => e.eventType)).toEqual(
      expect.arrayContaining(['CREATED', 'ASSESSED', 'SIGNED', 'APPROVED']),
    );
  });
});
