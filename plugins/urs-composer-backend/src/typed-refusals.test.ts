/**
 * A refusal says what kind of refusal it is (NXD-176).
 *
 * Twenty-one service paths threw a plain `Error`, and `respondError` maps
 * that to 500 "Internal server error" and hides the message. So "only DRAFT
 * requirement sets can be updated", "business role … already exists" and
 * "baseline not found" each told the person in front of the page that the
 * platform was broken, without saying why. The class now carries the
 * meaning, and the message is unchanged.
 *
 * Three stay plain on purpose: a missing approval workflow seed, a baseline
 * that vanishes inside the approval transaction, and "AI is not configured",
 * which its route already maps to 501. Those are faults, not refusals.
 */

import { ConflictError, InputError, NotFoundError } from '@backstage/errors';

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

const actor = 'user:default/author';

describe('URS refusals carry their kind', () => {
  let repository: URSRepository;
  let service: URSService;

  beforeEach(() => {
    repository = new URSRepository();
    service = new URSService({ logger: mockLogger as any, repository });
  });

  it('refuses a second business capability of the same name as a conflict', async () => {
    const data = { name: 'Weighing', domain: 'make' };
    await service.createBusinessCapability(data, actor);
    await expect(service.createBusinessCapability(data, actor)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('refuses a second business role of the same name as a conflict', async () => {
    await service.createBusinessRole({ name: 'Dispenser' }, actor);
    await expect(
      service.createBusinessRole({ name: 'Dispenser' }, actor),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('refuses missing fields as input', async () => {
    await expect(
      service.createBusinessCapability({ name: ' ', domain: 'make' }, actor),
    ).rejects.toBeInstanceOf(InputError);
    await expect(service.createBusinessRole({ name: '' }, actor)).rejects.toBeInstanceOf(
      InputError,
    );
  });

  it('refuses an edit to a requirement set that is no longer DRAFT as a conflict', async () => {
    const set = await service.createRequirementSet(
      {
        businessNeed: 'A set that will be approved',
        solutionType: SolutionType.DATA_PRODUCT,
        businessCapabilityRefs: [
          'business-capability:make/equipment-performance-management',
        ],
        requirements: [],
      } as any,
      actor,
    );
    await repository.updateRequirementSet({ ...set, status: URSStatus.APPROVED });

    const edit = service.updateRequirementSetDraft(set.id, {}, [], actor);
    await expect(edit).rejects.toBeInstanceOf(ConflictError);
    await expect(edit).rejects.toThrow('Only DRAFT requirement sets can be updated');
  });

  it.each([
    ['updateRequirementSetDraft', (s: URSService) => s.updateRequirementSetDraft('no-set', {}, [], actor)],
    ['submitBaseline', (s: URSService) => s.submitBaseline('no-baseline', actor)],
    ['computeChangeSet', (s: URSService) => s.computeChangeSet('no-baseline', actor)],
    [
      'updateBusinessCapability',
      (s: URSService) => s.updateBusinessCapability('business-capability:make/none', {}, actor),
    ],
  ])('refuses an unknown id in %s as not found', async (_name, call) => {
    await expect(call(service)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('refuses a rejection without a reason as input', async () => {
    await expect(
      service.rejectApprovalStep('any-instance', 'any-step', actor, ''),
    ).rejects.toBeInstanceOf(InputError);
  });
});
