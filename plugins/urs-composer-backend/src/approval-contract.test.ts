/**
 * The backend half of the approval wire contract.
 *
 * This does not assert against a fixture. It drives a real approval instance
 * through the service — requirement set, versions, baseline, submit — and
 * serialises the result the way Express does, then checks that every field
 * `@internal/platform-common` promises a client is actually there.
 *
 * A fixture would have passed the whole time the contract was broken. The
 * frontend declared `createdAt` and `createdBy` as non-optional and the
 * backend has never sent either; only a response produced by the code can
 * catch that.
 *
 * The frontend half lives at
 * `plugins/urs-composer/src/api/approval-contract.test.ts` and checks the
 * same list against the declared TypeScript type. Neither test can see the
 * other side, which is the reason the shared list exists.
 */

import {
  APPROVAL_INSTANCE_OPTIONAL_FIELDS,
  APPROVAL_INSTANCE_REQUIRED_FIELDS,
  APPROVAL_STEP_OPTIONAL_FIELDS,
  APPROVAL_STEP_REQUIRED_FIELDS,
  missingWireFields,
} from '@internal/platform-common';

import { URSRepository } from './repository';
import { URSService } from './service';
import { SolutionType } from './types';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

/** What `res.json(instance)` puts on the wire. */
async function submitRealBaseline(): Promise<Record<string, any>> {
  const service = new URSService({
    logger: mockLogger as any,
    repository: new URSRepository(),
  });

  const set = await service.createRequirementSet(
    {
      businessNeed: 'Approval wire contract',
      solutionType: SolutionType.DATA_PRODUCT,
      businessCapabilityRefs: [
        'business-capability:make/equipment-performance-management',
      ],
      requirements: [
        { title: 'A requirement', statement: 'It shall be approvable.' },
      ],
    } as any,
    'user:default/author',
  );

  const versions = await service.getCurrentVersions(set.id);
  const baseline = await service.createBaseline(
    set.id,
    versions.map(v => v.id),
    '1.0',
    'user:default/author',
  );
  const instance = await service.submitBaseline(
    baseline.id,
    'user:default/author',
  );

  // JSON.stringify is what Express applies, and it is where Date becomes a
  // string and `undefined` disappears. Asserting on the service's return
  // value directly would check a shape no client ever receives.
  return JSON.parse(JSON.stringify(instance));
}

describe('approval instance wire contract', () => {
  it('sends every field a client is promised', async () => {
    const wire = await submitRealBaseline();

    expect(missingWireFields(wire, APPROVAL_INSTANCE_REQUIRED_FIELDS)).toEqual(
      [],
    );
  });

  it('sends the step fields a client is promised', async () => {
    const wire = await submitRealBaseline();

    expect(Array.isArray(wire.steps)).toBe(true);
    expect(wire.steps.length).toBeGreaterThan(0);
    for (const step of wire.steps) {
      expect(missingWireFields(step, APPROVAL_STEP_REQUIRED_FIELDS)).toEqual(
        [],
      );
    }
  });

  it('sends currentStepSequence as a number, not an id', async () => {
    // The frontend declared `currentStepId?: string` for four weeks. The
    // distinction is not cosmetic: steps are ordered and enforced by
    // `sequence`, so a client holding an id cannot say which step is due.
    const wire = await submitRealBaseline();

    expect(typeof wire.currentStepSequence).toBe('number');
    expect(wire).not.toHaveProperty('currentStepId');
  });

  it('names the fields that are absent until the instance completes', async () => {
    // These are declared optional on both sides, so their absence here is
    // the contract holding rather than failing. Asserted so that making one
    // of them required on the client is caught by a red test instead of by a
    // user seeing `undefined`.
    const wire = await submitRealBaseline();

    for (const field of APPROVAL_INSTANCE_OPTIONAL_FIELDS) {
      expect(wire[field]).toBeUndefined();
    }
    for (const field of APPROVAL_STEP_OPTIONAL_FIELDS) {
      expect(wire.steps[0][field]).toBeUndefined();
    }
  });

  it('sends the timestamps as strings, because JSON has no Date', async () => {
    const wire = await submitRealBaseline();

    expect(typeof wire.startedAt).toBe('string');
    expect(Number.isNaN(Date.parse(wire.startedAt))).toBe(false);
  });
});
