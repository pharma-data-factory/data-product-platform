/**
 * Which action the review-chain panel offers, and why.
 *
 * The rule under test is the asymmetry at the end of the chain: the first three
 * steps are status transitions, the last is a signature. A UI that treats all
 * four the same either dead-ends the user at IN_APPROVAL — which is what
 * shipped, and is why no user-created baseline could ever be released — or
 * implies a way to reach APPROVED without a QA signature, which the service
 * refuses at `assertTransition`.
 */

import { URSStatus, RequirementVersion } from '../api/types';
import {
  allApproved,
  chainPosition,
  nextReviewChainAction,
  statusCounts,
  versionsAwaitingSignature,
} from './reviewChain';

let seq = 0;
function version(status: URSStatus): RequirementVersion {
  seq += 1;
  return {
    id: `version-${seq}`,
    requirementId: `URS-BATCH-${String(seq).padStart(3, '0')}`,
    versionNumber: 10,
    versionLabel: '0.1',
    statement: 'The system shall display the current batch status.',
    status,
    revision: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    createdBy: 'user:default/author',
  };
}

describe('nextReviewChainAction', () => {
  it('offers review submission while the set is DRAFT', () => {
    const action = nextReviewChainAction([version(URSStatus.DRAFT)]);
    expect(action).toMatchObject({
      kind: 'ADVANCE',
      target: URSStatus.IN_REVIEW,
    });
  });

  it('offers the QA signature at IN_APPROVAL, not a transition', () => {
    // The load-bearing assertion. IN_APPROVAL -> APPROVED is not a transition;
    // an ADVANCE here would send a request the service refuses.
    const action = nextReviewChainAction([version(URSStatus.IN_APPROVAL)]);
    expect(action.kind).toBe('SIGN');
    expect(action).not.toHaveProperty('target');
  });

  it('never offers APPROVED as a transition target', () => {
    const everyStatus = [
      URSStatus.DRAFT,
      URSStatus.IN_REVIEW,
      URSStatus.REVIEWED,
      URSStatus.IN_APPROVAL,
      URSStatus.APPROVED,
    ];
    const targets = everyStatus
      .map(status => nextReviewChainAction([version(status)]))
      .filter(action => action.kind === 'ADVANCE')
      .map(action => (action as { target: URSStatus }).target);

    expect(targets).not.toContain(URSStatus.APPROVED);
    expect(targets.length).toBeGreaterThan(0);
  });

  it('walks the chain one step at a time', () => {
    expect(nextReviewChainAction([version(URSStatus.IN_REVIEW)])).toMatchObject({
      kind: 'ADVANCE',
      target: URSStatus.REVIEWED,
    });
    expect(nextReviewChainAction([version(URSStatus.REVIEWED)])).toMatchObject({
      kind: 'ADVANCE',
      target: URSStatus.IN_APPROVAL,
    });
  });

  it('follows the laggard, not the leader, when the set is uneven', () => {
    // The set moves together. Offering the furthest-along step would produce a
    // button that silently skips every version behind it.
    const action = nextReviewChainAction([
      version(URSStatus.DRAFT),
      version(URSStatus.IN_APPROVAL),
    ]);
    expect(action).toMatchObject({ kind: 'ADVANCE', target: URSStatus.IN_REVIEW });
  });

  it('reports completion once every version is approved', () => {
    const action = nextReviewChainAction([version(URSStatus.APPROVED)]);
    expect(action.kind).toBe('NONE');
    expect(action.description).toMatch(/baseline/i);
  });

  it('explains an empty set rather than rendering nothing', () => {
    const action = nextReviewChainAction([]);
    expect(action.kind).toBe('NONE');
    expect(action.description).toMatch(/nothing to review/i);
  });

  it('explains a set whose versions are all off the chain', () => {
    const action = nextReviewChainAction([
      version(URSStatus.REJECTED),
      version(URSStatus.OBSOLETE),
    ]);
    expect(action.kind).toBe('NONE');
    expect(action.description).toMatch(/change control/i);
  });

  it('ignores off-chain versions when others are still moving', () => {
    const action = nextReviewChainAction([
      version(URSStatus.REJECTED),
      version(URSStatus.REVIEWED),
    ]);
    expect(action).toMatchObject({
      kind: 'ADVANCE',
      target: URSStatus.IN_APPROVAL,
    });
  });
});

describe('versionsAwaitingSignature', () => {
  it('selects only the versions a QA signature is valid for', () => {
    // Signing a DRAFT is refused by validateVersionSignature. Sending the whole
    // set would turn one legitimate refusal into one per version.
    const awaiting = version(URSStatus.IN_APPROVAL);
    const selected = versionsAwaitingSignature([
      version(URSStatus.DRAFT),
      awaiting,
      version(URSStatus.APPROVED),
    ]);
    expect(selected).toEqual([awaiting]);
  });
});

describe('chainPosition and statusCounts', () => {
  it('returns undefined when nothing is on the chain', () => {
    expect(chainPosition([version(URSStatus.SUPERSEDED)])).toBeUndefined();
  });

  it('orders the summary along the chain, not alphabetically', () => {
    const counts = statusCounts([
      version(URSStatus.IN_APPROVAL),
      version(URSStatus.DRAFT),
      version(URSStatus.DRAFT),
    ]);
    expect(counts).toEqual([
      { status: URSStatus.DRAFT, count: 2 },
      { status: URSStatus.IN_APPROVAL, count: 1 },
    ]);
  });
});

describe('allApproved', () => {
  it('is false for an empty set', () => {
    // An empty set is not a released one. `assertPinnedVersionsReleased`
    // returns early on no versions, so the UI must not imply readiness here.
    expect(allApproved([])).toBe(false);
  });

  it('is true only when every version is approved', () => {
    expect(allApproved([version(URSStatus.APPROVED)])).toBe(true);
    expect(
      allApproved([version(URSStatus.APPROVED), version(URSStatus.IN_APPROVAL)]),
    ).toBe(false);
  });
});
