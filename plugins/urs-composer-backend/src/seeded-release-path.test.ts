/**
 * The whole path a seeded requirement set takes to Released.
 *
 * Nothing covered this end to end. baseline-rules.test.ts reaches a released
 * baseline, but it injects versions that are already APPROVED straight into
 * the repository — so it never exercises how a version gets there, and the
 * gap it hid was total: no service method and no route could move a version
 * out of DRAFT, the signature endpoint required IN_APPROVAL, and a baseline
 * may only be released once every pinned version is approved. No baseline
 * holding requirements could be released at all.
 *
 * This walks the real steps in order, from the data a fresh installation
 * actually starts with:
 *
 *   seed -> version 0.1 DRAFT
 *        -> IN_REVIEW -> REVIEWED -> IN_APPROVAL   (advanceRequirementSetVersions)
 *        -> APPROVED                               (QA signature)
 *        -> baseline DRAFT                         (createBaseline)
 *        -> submit -> approve each step            (approval chain)
 *        -> baseline APPROVED, set APPROVED        ("Released" in the UI)
 */

import { URSRepository } from './repository';
import { URSService } from './service';
import { SignaturePinReAuth } from './domain/reauth';
import { ApprovalRole, SignatureMeaning, URSStatus } from './types';
import { WD_REQUIREMENT_SET } from './data/seedRequirementSets';

const SET_ID = 'seed:urs-wd';
const ACTOR = 'user:default/tester';
const PIN = '482915';

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

async function setup() {
  const repository = new URSRepository();
  repository.seedRequirementSets();
  await repository.createApprovalWorkflow(GXP_WORKFLOW as any);

  const service = new URSService({
    logger: mockLogger,
    repository,
    catalog: CATALOG,
  });
  await new SignaturePinReAuth(repository).enroll(ACTOR, PIN);

  return { repository, service };
}

describe('a seeded requirement set reaches Released', () => {
  test('the full path, step by step', async () => {
    const { repository, service } = await setup();
    const expectedCount = WD_REQUIREMENT_SET.requirements.length;

    // --- The state a fresh installation starts in ---------------------------
    let current = await service.getCurrentVersions(SET_ID);
    expect(current).toHaveLength(expectedCount);
    expect(current.every(v => v.status === URSStatus.DRAFT)).toBe(true);

    // --- Through the version lifecycle, as a set ----------------------------
    for (const status of [
      URSStatus.IN_REVIEW,
      URSStatus.REVIEWED,
      URSStatus.IN_APPROVAL,
    ]) {
      const result = await service.advanceRequirementSetVersions(
        SET_ID,
        status,
        ACTOR,
      );
      expect(result.skipped).toEqual([]);
      expect(result.advanced).toHaveLength(expectedCount);
    }

    // --- QA signature releases each version ---------------------------------
    current = await service.getCurrentVersions(SET_ID);
    for (const version of current) {
      // The target type is fixed by the method itself; the trailing argument
      // is the caller's credentials, which the in-process test does not carry.
      await service.signRequirementVersion(
        version.id,
        SignatureMeaning.APPROVED_QA,
        ACTOR,
        PIN,
      );
    }

    current = await service.getCurrentVersions(SET_ID);
    expect(current.every(v => v.status === URSStatus.APPROVED)).toBe(true);

    // --- Baseline over the approved versions --------------------------------
    const baselineVersion = await service.getNextBaselineVersion(SET_ID);
    expect(baselineVersion).toBe('1.0');

    const baseline = await service.createBaseline(
      SET_ID,
      current.map(v => v.id),
      baselineVersion,
      ACTOR,
    );
    expect(baseline.status).toBe(URSStatus.DRAFT);
    expect(baseline.requirementVersionIds).toHaveLength(expectedCount);

    // --- Approval chain -----------------------------------------------------
    const instance = await service.submitBaseline(baseline.id, ACTOR);
    expect(instance.steps.length).toBeGreaterThan(0);

    for (const step of instance.steps) {
      await service.approveApprovalStep(
        instance.id,
        step.id,
        ACTOR,
        'Approved',
        undefined,
        PIN,
      );
    }

    // --- Released -----------------------------------------------------------
    const released = await repository.getBaseline(baseline.id);
    expect(released!.status).toBe(URSStatus.APPROVED);

    // The user's rule: releasing the requirements releases the set. The set
    // follows its baseline rather than carrying a review of its own; the UI
    // labels APPROVED as "Released".
    const set = await repository.getRequirementSet(SET_ID);
    expect(set!.status).toBe(URSStatus.APPROVED);
  });

  test('release is refused while any pinned version is unapproved', async () => {
    // The guard that made the missing lifecycle driver fatal, now reachable
    // rather than unreachable.
    const { service } = await setup();

    await service.advanceRequirementSetVersions(
      SET_ID,
      URSStatus.IN_REVIEW,
      ACTOR,
    );
    const current = await service.getCurrentVersions(SET_ID);

    const baseline = await service.createBaseline(
      SET_ID,
      current.map(v => v.id),
      '1.0',
      ACTOR,
    );
    const instance = await service.submitBaseline(baseline.id, ACTOR);

    await expect(
      (async () => {
        for (const step of instance.steps) {
          await service.approveApprovalStep(
            instance.id,
            step.id,
            ACTOR,
            'Approved',
            undefined,
            PIN,
          );
        }
      })(),
    ).rejects.toThrow(/not approved/i);
  });
});
