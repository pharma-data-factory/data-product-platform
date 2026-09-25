/**
 * The review chain a requirement version walks, as data the page can render.
 *
 * Kept out of `URSRequirementSetPage.tsx` deliberately. The page is 1600 lines
 * and the rule this encodes is the one the whole URS -> Product journey rests
 * on, so it is worth being able to test it without a DOM.
 *
 * The chain itself is the backend's (`domain/transitions.ts`):
 *
 *     DRAFT -> IN_REVIEW -> REVIEWED -> IN_APPROVAL -> APPROVED
 *
 * with one asymmetry that is the point of this file. The first three steps are
 * status transitions and move the whole set together
 * (`advanceRequirementSetVersions`). The last one is **not a transition at
 * all** — `assertTransition` refuses IN_APPROVAL -> APPROVED, and a version
 * reaches APPROVED only as the consequence of a valid `APPROVED_QA` signature
 * (`service.ts`: "A version reaches APPROVED only through a QA signature").
 *
 * So the UI must offer two different affordances, not four of the same, and it
 * must not present the last one as a status change. Getting that wrong would
 * either dead-end the user at IN_APPROVAL or imply a route round the signature.
 */

import { URSStatus, RequirementVersion } from '../api/types';

/** What the user can do next to the set's versions as a whole. */
export type ReviewChainAction =
  | { kind: 'ADVANCE'; target: URSStatus; label: string; description: string }
  | { kind: 'SIGN'; label: string; description: string }
  | { kind: 'NONE'; label: string; description: string };

/** The order the chain is walked in, for picking "the step they are all on". */
const CHAIN: readonly URSStatus[] = [
  URSStatus.DRAFT,
  URSStatus.IN_REVIEW,
  URSStatus.REVIEWED,
  URSStatus.IN_APPROVAL,
  URSStatus.APPROVED,
];

/** Statuses that are not on the chain and are nobody's next step. */
function onChain(status: URSStatus): boolean {
  return CHAIN.includes(status);
}

/**
 * The least-advanced status among the versions still on the chain.
 *
 * Least-advanced rather than most: the set moves together, so the action to
 * offer is the one that unblocks the laggards. Offering the furthest-along
 * step would produce a button that skips every version behind it.
 */
export function chainPosition(
  versions: readonly RequirementVersion[],
): URSStatus | undefined {
  const positions = versions
    .filter(v => onChain(v.status))
    .map(v => CHAIN.indexOf(v.status));
  if (positions.length === 0) {
    return undefined;
  }
  return CHAIN[Math.min(...positions)];
}

/** How many versions sit at each status, for the summary line. */
export function statusCounts(
  versions: readonly RequirementVersion[],
): Array<{ status: URSStatus; count: number }> {
  const counts = new Map<URSStatus, number>();
  for (const version of versions) {
    counts.set(version.status, (counts.get(version.status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => CHAIN.indexOf(a.status) - CHAIN.indexOf(b.status));
}

/**
 * The single action to offer for the set, given where its versions are.
 *
 * Returns `NONE` with a reason rather than `undefined`, because every reason a
 * button is absent is something the user needs told — an empty panel where an
 * action used to be is the defect this whole batch exists to fix.
 */
export function nextReviewChainAction(
  versions: readonly RequirementVersion[],
): ReviewChainAction {
  if (versions.length === 0) {
    return {
      kind: 'NONE',
      label: 'No versions',
      description:
        'This set has no requirement versions in force, so there is nothing ' +
        'to review. Every requirement gets version 0.1 when it is created.',
    };
  }

  const position = chainPosition(versions);

  if (position === undefined) {
    return {
      kind: 'NONE',
      label: 'Not in review',
      description:
        'No version is on the review chain. Rejected, superseded and obsolete ' +
        'versions are handled through change control, not here.',
    };
  }

  switch (position) {
    case URSStatus.DRAFT:
      return {
        kind: 'ADVANCE',
        target: URSStatus.IN_REVIEW,
        label: 'Submit for review',
        description:
          'Moves every open version from DRAFT to IN_REVIEW. Versions that ' +
          'cannot make the move are listed rather than blocking the rest.',
      };
    case URSStatus.IN_REVIEW:
      return {
        kind: 'ADVANCE',
        target: URSStatus.REVIEWED,
        label: 'Mark as reviewed',
        description: 'Records that the business review is complete.',
      };
    case URSStatus.REVIEWED:
      return {
        kind: 'ADVANCE',
        target: URSStatus.IN_APPROVAL,
        label: 'Send for QA approval',
        description:
          'Hands the set to Quality. The approval itself is a signature, not ' +
          'a status change.',
      };
    case URSStatus.IN_APPROVAL:
      return {
        kind: 'SIGN',
        label: 'Apply QA approval signature',
        description:
          'A version reaches APPROVED only through an APPROVED_QA signature, ' +
          'which requires the QUALITY_REVIEWER role and cannot be applied by ' +
          'whoever authored the version.',
      };
    default:
      return {
        kind: 'NONE',
        label: 'Approved',
        description:
          'Every version is approved. A baseline pinning them can now be ' +
          'created and released.',
      };
  }
}

/**
 * The versions an `APPROVED_QA` signature should be applied to.
 *
 * Only those actually at IN_APPROVAL: signing anything else is refused by
 * `validateVersionSignature`, and sending the whole set would turn one
 * legitimate refusal into N.
 */
export function versionsAwaitingSignature(
  versions: readonly RequirementVersion[],
): RequirementVersion[] {
  return versions.filter(v => v.status === URSStatus.IN_APPROVAL);
}

/** True once every version on the chain has reached APPROVED. */
export function allApproved(
  versions: readonly RequirementVersion[],
): boolean {
  return (
    versions.length > 0 && versions.every(v => v.status === URSStatus.APPROVED)
  );
}
