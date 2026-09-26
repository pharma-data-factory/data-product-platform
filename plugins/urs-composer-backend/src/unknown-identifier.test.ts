/**
 * An identifier that names nothing must say so.
 *
 * Three paths took a requirement-set id and answered as though the set
 * existed and were empty: `getRequirements` and `getCurrentVersions`
 * returned `[]`, and `advanceRequirementSetVersions` reported "advanced 0,
 * skipped 0" — success, for a set that was never there. A caller could not
 * tell a typo from an empty set, and `addRequirement` answered 404 on the
 * very same id, so one identifier produced two different truths depending on
 * which route you asked.
 *
 * Found by walking the journey rather than by a test, which is why this file
 * exists: the suite asserted the return shape and never the precondition.
 *
 * The approval lookups are here for the same reason. They threw a plain
 * `Error`, which `respondError` can only map to 500 — "the platform is
 * broken" for what is really "no such instance".
 */

import { ConflictError, NotFoundError } from '@backstage/errors';

import { URSRepository } from './repository';
import { URSService } from './service';
import { SolutionType, URSStatus } from './types';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const UNKNOWN = 'set-that-does-not-exist';

describe('an unknown requirement-set id', () => {
  let service: URSService;

  beforeEach(() => {
    service = new URSService({
      logger: mockLogger as any,
      repository: new URSRepository(),
    });
  });

  it.each([
    ['getRequirements', () => service.getRequirements(UNKNOWN)],
    ['getCurrentVersions', () => service.getCurrentVersions(UNKNOWN)],
    [
      'advanceRequirementSetVersions',
      () =>
        service.advanceRequirementSetVersions(
          UNKNOWN,
          URSStatus.IN_REVIEW,
          'user:default/tester',
        ),
    ],
  ])(
    'is refused by %s with NotFoundError, not an empty answer',
    async (_name, call) => {
      await expect(call()).rejects.toBeInstanceOf(NotFoundError);
      await expect(call()).rejects.toThrow(UNKNOWN);
    },
  );

  it('matches createRequirement, which has always answered 404 on the same id', async () => {
    // The route that was already right. Named here so that if someone
    // relaxes the new guard, the disagreement it was added to remove shows
    // up as a failure rather than as two green tests describing two truths.
    await expect(
      service.createRequirement(UNKNOWN, { title: 'x', statement: 'y' }, 'u'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('still answers normally for a set that does exist', async () => {
    // The guard must refuse the unknown id without refusing the empty set —
    // an existing set with no requirements is a legitimate state, and
    // collapsing the two would trade one wrong answer for another.
    const set = await service.createRequirementSet(
      {
        businessNeed: 'A set with no requirements yet',
        solutionType: SolutionType.DATA_PRODUCT,
        businessCapabilityRefs: [
          'business-capability:make/equipment-performance-management',
        ],
        requirements: [],
      } as any,
      'user:default/author',
    );

    await expect(service.getRequirements(set.id)).resolves.toEqual([]);
    await expect(service.getCurrentVersions(set.id)).resolves.toEqual([]);
  });
});

describe('an unknown approval identifier', () => {
  let service: URSService;

  beforeEach(() => {
    service = new URSService({
      logger: mockLogger as any,
      repository: new URSRepository(),
    });
  });

  it.each([
    [
      'approveApprovalStep',
      () => service.approveApprovalStep('no-instance', 'no-step', 'u'),
    ],
    [
      'rejectApprovalStep',
      () =>
        service.rejectApprovalStep('no-instance', 'no-step', 'u', 'a reason'),
    ],
    [
      'cancelApprovalInstance',
      () => service.cancelApprovalInstance('no-instance', 'u'),
    ],
  ])('is refused by %s with NotFoundError, not a 500', async (_name, call) => {
    const error = await call()
      .then(() => undefined)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    // Not a ConflictError: nothing conflicts with the state of a record that
    // does not exist.
    expect(error).not.toBeInstanceOf(ConflictError);
    expect(String(error)).toContain('no-instance');
  });
});
