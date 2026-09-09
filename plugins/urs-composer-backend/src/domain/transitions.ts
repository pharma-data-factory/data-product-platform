/**
 * Status transition maps.
 *
 * The single place that decides whether a status change is legal. Services
 * must not compare statuses ad hoc; they call assertTransition, which throws a
 * ConflictError that the router maps to 409.
 *
 * Requirement versions and baselines run separate lifecycles even though they
 * share the URSStatus enum, so each has its own map.
 */

import { ConflictError } from '@backstage/errors';
import { URSStatus } from '../types';

/** Requirement version lifecycle (spec invariant 3). */
export const VERSION_TRANSITIONS: Readonly<Record<URSStatus, URSStatus[]>> = {
  [URSStatus.DRAFT]: [URSStatus.IN_REVIEW],
  [URSStatus.IN_REVIEW]: [URSStatus.REVIEWED, URSStatus.REJECTED],
  [URSStatus.REVIEWED]: [URSStatus.IN_APPROVAL],
  // APPROVED is reached only through a valid QA signature, never through a
  // direct status endpoint (spec invariant 6).
  [URSStatus.IN_APPROVAL]: [URSStatus.APPROVED, URSStatus.REJECTED],
  [URSStatus.APPROVED]: [URSStatus.SUPERSEDED, URSStatus.OBSOLETE],
  [URSStatus.SUPERSEDED]: [],
  [URSStatus.OBSOLETE]: [],
  [URSStatus.REJECTED]: [],
  // Not part of the version lifecycle.
  [URSStatus.BASELINED]: [],
  [URSStatus.RETIRED]: [],
};

/** Baseline lifecycle (spec invariant 3). */
export const BASELINE_TRANSITIONS: Readonly<Record<URSStatus, URSStatus[]>> = {
  [URSStatus.DRAFT]: [URSStatus.IN_REVIEW],
  [URSStatus.IN_REVIEW]: [URSStatus.IN_APPROVAL, URSStatus.REJECTED],
  [URSStatus.IN_APPROVAL]: [URSStatus.APPROVED, URSStatus.REJECTED],
  [URSStatus.APPROVED]: [URSStatus.SUPERSEDED],
  [URSStatus.SUPERSEDED]: [],
  [URSStatus.REJECTED]: [],
  // Not part of the baseline lifecycle.
  [URSStatus.REVIEWED]: [],
  [URSStatus.OBSOLETE]: [],
  [URSStatus.BASELINED]: [],
  [URSStatus.RETIRED]: [],
};

/**
 * Requirement set lifecycle.
 *
 * Looser than the other two: a set follows the approval of its baseline rather
 * than carrying its own review workflow, and it can be retired outright.
 */
export const SET_TRANSITIONS: Readonly<Record<URSStatus, URSStatus[]>> = {
  [URSStatus.DRAFT]: [
    URSStatus.IN_REVIEW,
    URSStatus.APPROVED,
    URSStatus.BASELINED,
    URSStatus.RETIRED,
  ],
  [URSStatus.IN_REVIEW]: [
    URSStatus.APPROVED,
    URSStatus.REJECTED,
    URSStatus.DRAFT,
  ],
  [URSStatus.APPROVED]: [
    URSStatus.BASELINED,
    URSStatus.SUPERSEDED,
    URSStatus.RETIRED,
  ],
  [URSStatus.BASELINED]: [URSStatus.SUPERSEDED, URSStatus.RETIRED],
  [URSStatus.REJECTED]: [URSStatus.DRAFT],
  [URSStatus.SUPERSEDED]: [],
  [URSStatus.RETIRED]: [],
  [URSStatus.REVIEWED]: [],
  [URSStatus.IN_APPROVAL]: [],
  [URSStatus.OBSOLETE]: [],
};

export type TransitionKind = 'version' | 'baseline' | 'set';

const MAPS: Record<TransitionKind, Readonly<Record<URSStatus, URSStatus[]>>> = {
  version: VERSION_TRANSITIONS,
  baseline: BASELINE_TRANSITIONS,
  set: SET_TRANSITIONS,
};

const LABELS: Record<TransitionKind, string> = {
  version: 'Requirement version',
  baseline: 'Baseline',
  set: 'Requirement set',
};

/** Whether `to` is reachable from `from` for the given entity kind. */
export function canTransition(
  kind: TransitionKind,
  from: URSStatus,
  to: URSStatus,
): boolean {
  return (MAPS[kind][from] ?? []).includes(to);
}

/** Statuses reachable from `from`, for surfacing available actions. */
export function allowedTransitions(
  kind: TransitionKind,
  from: URSStatus,
): URSStatus[] {
  return [...(MAPS[kind][from] ?? [])];
}

/** Whether the status is an end state for the given entity kind. */
export function isTerminal(kind: TransitionKind, status: URSStatus): boolean {
  return (MAPS[kind][status] ?? []).length === 0;
}

/**
 * Throw unless the transition is legal.
 *
 * @throws ConflictError mapped to HTTP 409 by the router.
 */
export function assertTransition(
  kind: TransitionKind,
  from: URSStatus,
  to: URSStatus,
  context?: string,
): void {
  if (canTransition(kind, from, to)) {
    return;
  }

  const allowed = allowedTransitions(kind, from);
  const target = context ? ` ${context}` : '';
  const options = allowed.length
    ? `Allowed from ${from}: ${allowed.join(', ')}.`
    : `${from} is an end state.`;

  throw new ConflictError(
    `${LABELS[kind]}${target} cannot move from ${from} to ${to}. ${options}`,
  );
}
