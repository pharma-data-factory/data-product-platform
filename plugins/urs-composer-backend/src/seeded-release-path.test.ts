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
/** Second signatory: a change request may not be approved by whoever raised it. */
const APPROVER = 'user:default/second-approver';
const PIN = '482915';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const CREDENTIALS: any = {
  principal: { type: 'user', userEntityRef: ACTOR },
};

/** Catalog entities the impact query should find. Set per test. */
let catalogEntities: unknown[] = [];

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
  getEntities: jest.fn(async () => ({ items: catalogEntities })),
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
  const reauth = new SignaturePinReAuth(repository);
  await reauth.enroll(ACTOR, PIN);
  await reauth.enroll(APPROVER, PIN);

  catalogEntities = [];

  return { repository, service };
}

/**
 * Drive the seeded set all the way to Released.
 *
 * The long-hand walk is spelled out in the first test; the later ones need the
 * released state as a starting point, not as the subject.
 */
async function releaseWholeSet(service: URSService) {
  for (const status of [
    URSStatus.IN_REVIEW,
    URSStatus.REVIEWED,
    URSStatus.IN_APPROVAL,
  ]) {
    await service.advanceRequirementSetVersions(SET_ID, status, ACTOR);
  }

  for (const version of await service.getCurrentVersions(SET_ID)) {
    await service.signRequirementVersion(
      version.id,
      SignatureMeaning.APPROVED_QA,
      ACTOR,
      PIN,
    );
  }

  const current = await service.getCurrentVersions(SET_ID);
  const baseline = await service.createBaseline(
    SET_ID,
    current.map(v => v.id),
    '1.0',
    ACTOR,
  );
  const instance = await service.submitBaseline(baseline.id, ACTOR);
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
  return baseline;
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

    // ...and only now can a product be built against it. This is what the
    // Scaffolder URS baseline picker lists and what nexora:urs:verify-baseline
    // accepts; before the release it offered nothing, which is the point.
    const options = await service.listApprovedBaselineOptions();
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      baselineId: baseline.id,
      baselineVersion: '1.0',
      requirementSetKey: WD_REQUIREMENT_SET.requirementSetId,
      solutionName: WD_REQUIREMENT_SET.solutionName,
      requirementCount: expectedCount,
    });
  });

  test('impact names the products built on the released baseline', async () => {
    // The question an author has before revising a requirement: who is
    // building on what I am about to change?
    const { service, repository } = await setup();
    await releaseWholeSet(service);

    const released = await repository.getCurrentApprovedBaseline(SET_ID);
    catalogEntities = [
      {
        kind: 'Component',
        metadata: {
          name: 'oee-line-01',
          title: 'OEE Line 01',
          annotations: {
            'dataprod.platform/urs-baseline': released!.id,
          },
        },
        spec: { owner: 'group:default/platform-team' },
      },
    ];

    const impact = await service.getRequirementSetImpact(SET_ID, CREDENTIALS);

    expect(impact.releasedBaselineVersion).toBe('1.0');
    expect(impact.changedSinceRelease).toEqual([]);
    expect(impact.products).toEqual([
      {
        entityRef: 'component:default/oee-line-01',
        name: 'oee-line-01',
        title: 'OEE Line 01',
        owner: 'group:default/platform-team',
      },
    ]);
  });

  /**
   * Drift — a requirement that moved on since the release — is deliberately
   * NOT covered here, because it cannot currently happen.
   *
   * The only route to it is revising a released requirement, and that is
   * broken: a version approved at 0.1 keeps that label (releaseSignedVersion
   * only changes the status), so nextDraft — which documents "a release is
   * always n.0" — proposes 0.1 again. In memory that silently creates a second
   * 0.1; under Postgres the unique index on (requirement_id, version) rejects
   * it outright. releaseOf(), which exists to turn a draft into an n.0
   * release, is never called.
   *
   * getRequirementSetImpact computes drift correctly and the seam is tested
   * through the never-released case below. A test asserting drift would have
   * to fake the very state the platform cannot reach, which would assert the
   * fake rather than the behaviour.
   */

  test('a set that was never released reports no drift and no products', async () => {
    const { service } = await setup();

    const impact = await service.getRequirementSetImpact(SET_ID, CREDENTIALS);

    expect(impact.releasedBaselineId).toBeUndefined();
    expect(impact.changedSinceRelease).toEqual([]);
    expect(impact.products).toEqual([]);
  });

  test('an unreleased baseline is not offered to build against', async () => {
    // The picker must not let anyone bind a product to a draft. The scaffolder
    // action refuses it server-side too, but an option that cannot be used
    // should never appear in the first place.
    const { service } = await setup();

    await service.advanceRequirementSetVersions(
      SET_ID,
      URSStatus.IN_REVIEW,
      ACTOR,
    );
    const current = await service.getCurrentVersions(SET_ID);
    await service.createBaseline(
      SET_ID,
      current.map(v => v.id),
      '1.0',
      ACTOR,
    );

    expect(await service.listApprovedBaselineOptions()).toEqual([]);
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
