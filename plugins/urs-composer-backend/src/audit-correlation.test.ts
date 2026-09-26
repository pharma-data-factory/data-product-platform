/**
 * One operation, one correlation id, however many events.
 *
 * `audit_events` has carried a `correlation_id` column, a type field and
 * both repository mappings since the table was created, and not one of the
 * 35 write sites ever set it. Every row was NULL. A baseline approbation
 * writes events for the approval step, the instance, the baseline and each
 * requirement version it releases, plus the signature — and nothing joined
 * them, so "what happened in this one operation" had no answer.
 *
 * These tests assert the join exists. They capture what reaches the
 * repository rather than reading the service's return values, because the
 * defect was invisible from the outside: every one of those calls succeeded
 * the whole time.
 *
 * The final-approval case is the one the requirement named. It crosses four
 * methods — approveApprovalStep, the signature service, releaseBaseline and
 * the version release inside it — and those are exactly the boundaries a
 * correlation id gets lost at, because each was free to open its own.
 */

import { SignaturePinReAuth } from './domain/reauth';
import { URSRepository } from './repository';
import { URSService } from './service';
import {
  ApprovalRole,
  AuditEvent,
  GxPRelevance,
  RequirementPriority,
  SolutionType,
} from './types';

const TEST_PIN = 'signing-pin-1';
const CAPABILITY = 'business-capability:make/equipment-performance-management';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

function catalogWithGroups(groups: string[]): any {
  return {
    getEntityByRef: jest.fn(async () => ({
      kind: 'User',
      metadata: { name: 'tester' },
      spec: { memberOf: groups },
    })),
  };
}

/**
 * Captures every audit event the service writes, in order.
 *
 * Spying on the repository rather than reading a getter keeps the test
 * independent of which repository implementation is in use, and catches
 * writes made through a transaction handle — half the write sites use one.
 */
function captureAuditEvents(repository: URSRepository) {
  const written: AuditEvent[] = [];
  const original = repository.createAuditEvent.bind(repository);
  jest
    .spyOn(repository, 'createAuditEvent')
    .mockImplementation(async (event: AuditEvent) => {
      written.push(event);
      return original(event);
    });
  return {
    all: () => written,
    /** Events written since the marker, i.e. by one operation. */
    since: (marker: number) => written.slice(marker),
    mark: () => written.length,
  };
}

async function setupApprovableBaseline() {
  const repository = new URSRepository();
  const service = new URSService({
    logger: mockLogger as any,
    repository,
    catalog: catalogWithGroups([
      'group:default/urs-authors',
      'group:default/urs-business-reviewers',
      'group:default/urs-product-managers',
      'group:default/urs-quality-reviewers',
    ]),
  });

  for (const user of ['user:default/author', 'user:default/reviewer']) {
    await new SignaturePinReAuth(repository).enroll(user, TEST_PIN);
  }

  const set = await service.createRequirementSet(
    {
      businessNeed: 'Correlated audit trail',
      solutionType: SolutionType.DATA_PRODUCT,
      gxpRelevance: GxPRelevance.NONE,
      businessCapabilityRefs: [CAPABILITY],
      requirements: [
        { title: 'First', statement: 'It shall be traceable.' },
        { title: 'Second', statement: 'It shall also be traceable.' },
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

  return { repository, service, set, baseline, versions };
}

describe('audit correlation', () => {
  it('never writes an event without a correlation id', async () => {
    const { repository, service, set, baseline } =
      await setupApprovableBaseline();
    const audit = captureAuditEvents(repository);

    await service.updateRequirementSetDraft(
      set.id,
      { businessNeed: 'Changed' } as any,
      [
        {
          title: 'Third',
          statement: 'Added later.',
          priority: RequirementPriority.SHOULD,
        },
      ],
      'user:default/author',
    );
    await service.submitBaseline(baseline.id, 'user:default/author');

    expect(audit.all().length).toBeGreaterThan(0);
    for (const event of audit.all()) {
      expect(typeof event.correlationId).toBe('string');
      expect(event.correlationId).not.toHaveLength(0);
    }
  });

  it('gives one operation one id, across the methods it calls', async () => {
    // submitBaseline writes its own event and calls createApprovalInstance,
    // which writes another. Two methods, two events, one operation — the
    // simplest case where a context opened per method would already split.
    const { repository, service, baseline } = await setupApprovableBaseline();
    const audit = captureAuditEvents(repository);

    await service.submitBaseline(baseline.id, 'user:default/author');

    const ids = new Set(audit.all().map(e => e.correlationId));
    expect(audit.all().length).toBeGreaterThan(1);
    expect(ids.size).toBe(1);
  });

  it('holds across a full baseline approbation — step, instance, baseline, versions', async () => {
    // The case the requirement names. The final approval releases the
    // baseline, which releases every requirement version it pins, and signs
    // on the way. All of it is one act by one person.
    const { repository, service, baseline } = await setupApprovableBaseline();
    const instance = await service.submitBaseline(
      baseline.id,
      'user:default/author',
    );

    const audit = captureAuditEvents(repository);

    // Step 1 of the non-GxP chain: business review.
    const before1 = audit.mark();
    await service.approveApprovalStep(
      instance.id,
      instance.steps[0].id,
      'user:default/reviewer',
      'Reviewed',
      {} as any,
      TEST_PIN,
    );
    const firstStep = audit.since(before1);

    // Step 2, the final one: releases the baseline and its versions.
    const before2 = audit.mark();
    await service.approveApprovalStep(
      instance.id,
      instance.steps[1].id,
      'user:default/reviewer',
      'Approved',
      {} as any,
      TEST_PIN,
    );
    const finalStep = audit.since(before2);

    // The final approval is the multi-entity one: it must have written more
    // than the step's own event, or this test is not exercising what it
    // claims to.
    expect(finalStep.length).toBeGreaterThan(1);
    expect(new Set(finalStep.map(e => e.correlationId)).size).toBe(1);

    // More than one entity type under that single id — the join is across
    // records, not repetitions of one.
    expect(new Set(finalStep.map(e => e.entityType)).size).toBeGreaterThan(1);

    // And the two approvals are separate operations, so they must not share
    // an id. A constant would satisfy every assertion above.
    expect(firstStep[0].correlationId).not.toBe(finalStep[0].correlationId);
  });

  it('gives separate calls separate ids', async () => {
    const { repository, service, set } = await setupApprovableBaseline();
    const audit = captureAuditEvents(repository);

    const before = audit.mark();
    await service.createRequirement(
      set.id,
      { title: 'One', statement: 'First call.' },
      'user:default/author',
    );
    const first = audit.since(before);

    const between = audit.mark();
    await service.createRequirement(
      set.id,
      { title: 'Two', statement: 'Second call.' },
      'user:default/author',
    );
    const second = audit.since(between);

    // createRequirement also calls seedInitialRequirementVersion, so each
    // call is itself multi-event: same id within, different id between.
    expect(new Set(first.map(e => e.correlationId)).size).toBe(1);
    expect(new Set(second.map(e => e.correlationId)).size).toBe(1);
    expect(first[0].correlationId).not.toBe(second[0].correlationId);
  });

  it('carries the signature event under the operation that produced it', async () => {
    // The 35th write site, found by making correlationId required rather
    // than by reading the code. It lives in SignatureService, a different
    // class, and had no way to know which operation it was part of.
    //
    // A baseline Signature is written only on the **final** required step —
    // intermediate steps still demand the PIN but record no signature — so
    // the chain has to be walked to the end to reach it. An earlier draft of
    // this test asserted it on step 1 and failed, which is the assertion
    // finding the rule rather than the rule being wrong.
    const { repository, service, baseline } = await setupApprovableBaseline();
    const instance = await service.submitBaseline(
      baseline.id,
      'user:default/author',
    );

    await service.approveApprovalStep(
      instance.id,
      instance.steps[0].id,
      'user:default/reviewer',
      'Reviewed',
      {} as any,
      TEST_PIN,
    );

    const audit = captureAuditEvents(repository);
    await service.approveApprovalStep(
      instance.id,
      instance.steps[1].id,
      'user:default/reviewer',
      'Approved',
      {} as any,
      TEST_PIN,
    );

    const signed = audit.all().filter(e => e.eventType === 'SIGNED');
    expect(signed).toHaveLength(1);
    expect(new Set(audit.all().map(e => e.correlationId)).size).toBe(1);
    // The signature carries the same id as the step approval that caused it.
    expect(signed[0].correlationId).toBe(audit.all()[0].correlationId);
  });
});

describe('ApprovalRole is unchanged by this slice', () => {
  // Guard against the refactor having quietly altered the approval chain
  // while threading a parameter through five signatures.
  it('still resolves roles from catalog groups', async () => {
    const { service } = await setupApprovableBaseline();
    const roles = await service.getUserApprovalRoles(
      'user:default/reviewer',
      {} as any,
    );
    expect(roles).toContain(ApprovalRole.BUSINESS_REVIEWER);
  });
});
