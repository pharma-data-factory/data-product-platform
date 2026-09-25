/**
 * A transaction does no I/O it does not own.
 *
 * Found by walking the journey on a running stack on 2026-09-25, and invisible
 * to every test that existed: signing a requirement version made two calls from
 * inside `repository.withTransaction` that the transaction could not serve —
 * the catalog lookup for the signer's approval roles, and the signing-PIN
 * re-authentication, which is bound to the *base* repository on purpose so a
 * failed attempt survives a rollback.
 *
 * Both need a second database connection. The transaction holds the only one,
 * and knex waits 60 seconds for one that cannot be released until the
 * transaction it is blocking finishes. The two failures then arrive wearing
 * disguises:
 *
 *   - the role lookup goes out without a plugin token (minting one needs a
 *     connection too) and the catalog answers **401**, so the user is told
 *     `Failed to resolve approval roles for <user>: Request failed with 401` —
 *     which reads as a permission problem and is not one;
 *   - the PIN check surfaces as `500 Internal server error`.
 *
 * The effect was that **no requirement version could ever be signed**, so none
 * could reach APPROVED, so no baseline could be released, so the Product page
 * could bind nothing. The three records that end with "the APPROVED branch was
 * not executed live" were describing this without knowing it.
 *
 * Nothing about it is reproducible against a stub repository, which is why the
 * suites were green throughout. What *is* testable is the ordering, and that is
 * what this file pins: both calls must happen before the transaction opens. The
 * stubs here fail loudly instead of stalling, so a regression is a red test
 * rather than a minute of silence.
 */

import { URSService } from './service';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import { hashOf } from './domain/signature-service';
import {
  RequirementPriority,
  RequirementVersion,
  SignatureMeaning,
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
const QA = 'user:default/qa';
const PIN = 'signing-pin-1';

/**
 * A repository that knows whether it is inside a transaction, and refuses the
 * two calls that must not happen there.
 *
 * `getSignatureCredential` stands for the whole re-authentication store: it is
 * the first thing `reAuth.verify` reads, and it goes to the base repository
 * rather than the transactional one.
 */
class BoundaryCheckingRepository extends URSRepository {
  inTransaction = false;
  readonly violations: string[] = [];

  override async withTransaction<T>(fn: (repo: any) => Promise<T>): Promise<T> {
    this.inTransaction = true;
    try {
      return await super.withTransaction(fn);
    } finally {
      this.inTransaction = false;
    }
  }

  override async getSignatureCredential(userRef: string): Promise<any> {
    if (this.inTransaction) {
      this.violations.push('getSignatureCredential');
      throw new Error(
        'Signing-PIN lookup ran inside the transaction. On a real pool this ' +
          'deadlocks for 60 seconds and returns 500.',
      );
    }
    return super.getSignatureCredential(userRef);
  }
}

function aVersion(
  overrides: Partial<RequirementVersion> = {},
): RequirementVersion {
  const version: RequirementVersion = {
    id: 'ver-boundary-001',
    requirementId: 'URS-TXB-001',
    version: '0.1',
    versionLabel: '0.1',
    major: 0,
    minor: 1,
    versionNumber: 1,
    title: 'Temperature monitoring',
    statement: 'The system shall record temperature every 60 seconds.',
    priority: RequirementPriority.MUST,
    status: URSStatus.IN_APPROVAL,
    createdBy: AUTHOR,
    createdAt: new Date(),
    revision: 1,
    ...overrides,
  };
  return { ...version, contentHash: overrides.contentHash ?? hashOf(version) };
}

async function setup() {
  const repository = new BoundaryCheckingRepository();

  const catalogCalls: string[] = [];
  const catalog: any = {
    getEntityByRef: jest.fn(async (ref: string) => {
      if (repository.inTransaction) {
        repository.violations.push('catalog.getEntityByRef');
        throw new Error(
          'Catalog lookup ran inside the transaction. On a real pool the ' +
            'plugin token cannot be minted and the catalog answers 401.',
        );
      }
      catalogCalls.push(ref);
      return {
        kind: 'User',
        metadata: { name: ref },
        spec: {
          memberOf:
            ref === QA
              ? ['group:default/urs-quality-reviewers']
              : ['group:default/urs-authors'],
        },
      };
    }),
  };

  const service = new URSService({
    logger: mockLogger,
    repository,
    catalog,
  });

  for (const user of [AUTHOR, QA]) {
    await new SignaturePinReAuth(repository).enroll(user, PIN);
  }

  return { repository, service, catalogCalls };
}

describe('Signing does its I/O before the transaction opens', () => {
  test('a quality signature resolves roles and the PIN outside the transaction', async () => {
    const { repository, service, catalogCalls } = await setup();
    await repository.createRequirementVersion(aVersion());

    const signature = await service.signRequirementVersion(
      'ver-boundary-001',
      SignatureMeaning.APPROVED_QA,
      QA,
      PIN,
      'approved for quality',
      { principal: { type: 'user', userEntityRef: QA } } as any,
    );

    expect(signature.meaning).toBe(SignatureMeaning.APPROVED_QA);
    expect(repository.violations).toEqual([]);
    // The role lookup happened — the check is that it happened early, not that
    // it was skipped.
    expect(catalogCalls).toContain(QA);

    const released = await repository.getRequirementVersion(
      'ver-boundary-001',
    );
    expect(released?.status).toBe(URSStatus.APPROVED);
  });

  test('the refusals still work, and still come before the transaction', async () => {
    const { repository, service } = await setup();
    await repository.createRequirementVersion(aVersion());

    // Wrong role: the author holds AUTHOR, not QUALITY_REVIEWER. This is the
    // message the live walk finally produced once the deadlock was gone; before
    // the fix it was a 401 about resolving roles.
    await expect(
      service.signRequirementVersion(
        'ver-boundary-001',
        SignatureMeaning.APPROVED_QA,
        AUTHOR,
        PIN,
        undefined,
        { principal: { type: 'user', userEntityRef: AUTHOR } } as any,
      ),
    ).rejects.toThrow(/requires the QUALITY_REVIEWER role/);

    // Wrong PIN: refused by the second factor, which the caller now runs
    // itself. A failed attempt is still counted against the base repository,
    // which is the reason it may not move inside the transaction.
    await expect(
      service.signRequirementVersion(
        'ver-boundary-001',
        SignatureMeaning.APPROVED_QA,
        QA,
        'not-the-pin',
        undefined,
        { principal: { type: 'user', userEntityRef: QA } } as any,
      ),
    ).rejects.toThrow(/Re-authentication failed/);

    expect(repository.violations).toEqual([]);

    const credential = await repository.getSignatureCredential(QA);
    expect(credential?.failedAttempts).toBe(1);
  });
});
