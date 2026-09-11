/**
 * Electronic signatures: content binding, segregation of duties, and the
 * release that a quality signature triggers.
 *
 * Runs against the in-memory repository, so it covers the domain rules rather
 * than the database guarantees; those are in gxp-invariants.test.ts.
 */

import { ConflictError, NotAllowedError } from '@backstage/errors';
import { URSService } from './service';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import { hashOf } from './domain/signature-service';
import {
  RequirementPriority,
  RequirementVersion,
  SignatureMeaning,
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

const AUTHOR = 'user:default/author';
const REVIEWER = 'user:default/reviewer';
const QA = 'user:default/qa';
const PIN = 'signing-pin-1';

/** Catalog stub that hands each user the groups listed for them. */
function catalogWithMemberships(memberships: Record<string, string[]>): any {
  return {
    getEntityByRef: jest.fn(async (ref: string) => ({
      kind: 'User',
      metadata: { name: ref },
      spec: { memberOf: memberships[ref] ?? [] },
    })),
  };
}

const CATALOG = catalogWithMemberships({
  [AUTHOR]: ['group:default/urs-authors'],
  [REVIEWER]: ['group:default/urs-business-reviewers'],
  [QA]: ['group:default/urs-quality-reviewers'],
});

function aVersion(overrides: Partial<RequirementVersion> = {}): RequirementVersion {
  const version: RequirementVersion = {
    id: 'ver-001',
    requirementId: 'URS-SIG-001',
    version: '0.1',
    versionLabel: '0.1',
    major: 0,
    minor: 1,
    versionNumber: 1,
    title: 'Temperature monitoring',
    statement: 'The system shall record temperature every 60 seconds.',
    priority: RequirementPriority.MUST,
    status: URSStatus.IN_REVIEW,
    createdBy: AUTHOR,
    createdAt: new Date(),
    revision: 1,
    ...overrides,
  };
  return { ...version, contentHash: overrides.contentHash ?? hashOf(version) };
}

async function setup() {
  const repository = new URSRepository();
  const service = new URSService({
    logger: mockLogger,
    repository,
    catalog: CATALOG,
  });

  for (const user of [AUTHOR, REVIEWER, QA]) {
    await new SignaturePinReAuth(repository).enroll(user, PIN);
  }

  return { repository, service };
}

describe('Content binding', () => {
  test('a signature records the hash of what was signed', async () => {
    const { repository, service } = await setup();
    const version = aVersion();
    await repository.createRequirementVersion(version);

    const signature = await service.signRequirementVersion(
      version.id,
      SignatureMeaning.REVIEWED,
      REVIEWER,
      PIN,
    );

    expect(signature.contentHashAtSigning).toBe(version.contentHash);
    expect(signature.signedBy).toBe(REVIEWER);
  });

  test('signing is refused when the content no longer matches its hash', async () => {
    const { repository, service } = await setup();
    // A hash that does not describe this content: the record was altered
    // after it was stored.
    await repository.createRequirementVersion(
      aVersion({ contentHash: 'a'.repeat(64) }),
    );

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.REVIEWED,
        REVIEWER,
        PIN,
      ),
    ).rejects.toThrow(/Content of ver-001 has changed/);
  });

  test('a version predating content hashes can still be signed', async () => {
    const { repository, service } = await setup();
    const version = aVersion();
    await repository.createRequirementVersion({
      ...version,
      contentHash: undefined,
    });

    await expect(
      service.signRequirementVersion(
        version.id,
        SignatureMeaning.REVIEWED,
        REVIEWER,
        PIN,
      ),
    ).resolves.toMatchObject({ contentHashAtSigning: version.contentHash });
  });
});

describe('Segregation of duties', () => {
  test('the author cannot review their own version', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.REVIEWED,
        AUTHOR,
        PIN,
      ),
    ).rejects.toThrow(NotAllowedError);
  });

  test('the reviewer cannot also give the quality approval', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await service.signRequirementVersion(
      'ver-001',
      SignatureMeaning.REVIEWED,
      REVIEWER,
      PIN,
    );

    // Grant the reviewer the quality role too; the conflict must still stand,
    // because it comes from what they already did, not from what they may do.
    const service2 = new URSService({
      logger: mockLogger,
      repository,
      catalog: catalogWithMemberships({
        [REVIEWER]: [
          'group:default/urs-business-reviewers',
          'group:default/urs-quality-reviewers',
        ],
      }),
    });
    await repository.updateRequirementVersion({
      ...(await repository.getRequirementVersion('ver-001'))!,
      status: URSStatus.REVIEWED,
    });
    await repository.updateRequirementVersion({
      ...(await repository.getRequirementVersion('ver-001'))!,
      status: URSStatus.IN_APPROVAL,
    });

    await expect(
      service2.signRequirementVersion(
        'ver-001',
        SignatureMeaning.APPROVED_QA,
        REVIEWER,
        PIN,
      ),
    ).rejects.toThrow(/already reviewed/);
  });

  test('a business reviewer cannot give the quality approval', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(
      aVersion({ status: URSStatus.IN_APPROVAL }),
    );

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.APPROVED_QA,
        REVIEWER,
        PIN,
      ),
    ).rejects.toThrow(/requires the QUALITY_REVIEWER role/);
  });

  test('the same person cannot sign the same meaning twice', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await service.signRequirementVersion(
      'ver-001',
      SignatureMeaning.REVIEWED,
      REVIEWER,
      PIN,
    );

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.REVIEWED,
        REVIEWER,
        PIN,
      ),
    ).rejects.toThrow(ConflictError);
  });
});

describe('Second factor', () => {
  test('a wrong PIN is refused', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.REVIEWED,
        REVIEWER,
        'wrong-pin',
      ),
    ).rejects.toThrow(/Re-authentication failed/);

    expect(
      await repository.listSignatures(
        SignatureTargetType.REQUIREMENT_VERSION,
        'ver-001',
      ),
    ).toHaveLength(0);
  });

  test('a missing PIN is refused', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.REVIEWED,
        REVIEWER,
        '',
      ),
    ).rejects.toThrow(/requires re-authentication/i);
  });

  test('a failed attempt is counted even though the signature rolls back', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.REVIEWED,
        REVIEWER,
        'wrong-pin',
      ),
    ).rejects.toThrow();

    const credential = await repository.getSignatureCredential(REVIEWER);
    expect(credential!.failedAttempts).toBe(1);
  });
});

describe('Status gating', () => {
  test('a quality signature requires the version to be in approval', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(
      aVersion({ status: URSStatus.DRAFT }),
    );

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.APPROVED_QA,
        QA,
        PIN,
      ),
    ).rejects.toThrow(/requires status IN_APPROVAL/);
  });
});

describe('Release on quality signature', () => {
  async function readyForQa() {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(
      aVersion({ status: URSStatus.IN_APPROVAL }),
    );
    return { repository, service };
  }

  test('the version is released as part of signing', async () => {
    const { repository, service } = await readyForQa();

    await service.signRequirementVersion(
      'ver-001',
      SignatureMeaning.APPROVED_QA,
      QA,
      PIN,
    );

    const released = await repository.getRequirementVersion('ver-001');
    expect(released).toMatchObject({
      status: URSStatus.APPROVED,
      approvedBy: QA,
    });
    expect(released!.releasedAt).toBeInstanceOf(Date);
  });

  test('the previously released version is superseded', async () => {
    const { repository, service } = await readyForQa();
    await repository.createRequirementVersion(
      aVersion({
        id: 'ver-000',
        version: '1.0',
        versionLabel: '1.0',
        major: 1,
        minor: 0,
        versionNumber: 100,
        status: URSStatus.APPROVED,
        approvedBy: QA,
        approvedAt: new Date(),
      }),
    );

    await service.signRequirementVersion(
      'ver-001',
      SignatureMeaning.APPROVED_QA,
      QA,
      PIN,
    );

    expect(await repository.getRequirementVersion('ver-000')).toMatchObject({
      status: URSStatus.SUPERSEDED,
      supersededBy: 'ver-001',
    });
  });

  test('a refused signature releases nothing', async () => {
    const { repository, service } = await readyForQa();

    await expect(
      service.signRequirementVersion(
        'ver-001',
        SignatureMeaning.APPROVED_QA,
        QA,
        'wrong-pin',
      ),
    ).rejects.toThrow();

    expect(await repository.getRequirementVersion('ver-001')).toMatchObject({
      status: URSStatus.IN_APPROVAL,
    });
  });

  test('a review signature does not release anything', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    await service.signRequirementVersion(
      'ver-001',
      SignatureMeaning.REVIEWED,
      REVIEWER,
      PIN,
    );

    expect(await repository.getRequirementVersion('ver-001')).toMatchObject({
      status: URSStatus.IN_REVIEW,
    });
  });

  test('the release is recorded in the audit trail', async () => {
    const { repository, service } = await readyForQa();

    await service.signRequirementVersion(
      'ver-001',
      SignatureMeaning.APPROVED_QA,
      QA,
      PIN,
    );

    const trail = await repository.getEntityAuditTrail(
      'ver-001',
      'REQUIREMENT_VERSION',
    );
    expect(trail.map(e => e.eventType)).toEqual(
      expect.arrayContaining(['SIGNED', 'RELEASED']),
    );
  });
});
