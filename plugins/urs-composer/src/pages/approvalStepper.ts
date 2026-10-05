/**
 * Which step of a baseline's approval chain the page is waiting on, and how it
 * is numbered.
 *
 * Kept out of `URSRequirementSetPage.tsx` for the reason `reviewChain.tsx`
 * gives: the page is 1600 lines and this rule is worth testing without a DOM.
 *
 * Two things were wrong before this file existed, and they compounded.
 *
 * **The chain was numbered by array position.** MUI's `Stepper` supplies an
 * index icon when `StepLabel` gets none, and `approvalStepIcon` returns one
 * only for decided steps — so an undecided step showed its position in the
 * array, a decided step showed a tick and no number at all, and neither was
 * the `sequence` the server enforces against. `approveApprovalStep` refuses
 * with "step 3 cannot be approved while step 2 is still PENDING"; the page
 * could not show the reviewer which of its rows was step 2.
 *
 * **And the active step was read off a status nothing sets.**
 * `ApprovalStepStatus.ACTIVE` is assigned in exactly one place in the backend,
 * inside the *advance* branch of an approval. Every step of a fresh instance
 * is PENDING, so `steps.findIndex(s => s.status === 'ACTIVE')` returned -1 and
 * the per-step Approve/Reject buttons — gated on the same flag — rendered
 * nowhere. Step one of every chain was unapprovable from the browser.
 *
 * So the authority here is `currentStepSequence`, which the backend maintains
 * and enforces against, rather than `ACTIVE`, which it applies lazily as a
 * display hint. See NXD-072.
 */

import { ApprovalInstance, ApprovalStepInstance } from '../api/types';

/** Instance statuses in which nothing further is expected of a reviewer. */
const SETTLED_INSTANCE_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED'];

function isSettled(instance: ApprovalInstance): boolean {
  return SETTLED_INSTANCE_STATUSES.includes(String(instance.status));
}

/**
 * The index MUI's `Stepper` should treat as active.
 *
 * `steps.length` for a settled instance, so the whole chain reads as walked
 * rather than as stopped on its last row. Never -1: that renders as "no step
 * reached yet" on a chain that has demonstrably been reached, which is the
 * wrong picture for a completed approval and the one the page used to show.
 */
export function activeApprovalStepIndex(instance: ApprovalInstance): number {
  if (isSettled(instance)) {
    return instance.steps.length;
  }
  const index = instance.steps.findIndex(
    step => step.sequence === instance.currentStepSequence,
  );
  return index >= 0 ? index : 0;
}

/**
 * Whether this step is the one a reviewer may act on now.
 *
 * Matched by `sequence` against the instance, not by the step's own status,
 * because the status is set lazily. A step that is already decided is never
 * due, even if the sequence still points at it.
 */
export function isApprovalStepDue(
  step: ApprovalStepInstance,
  instance: ApprovalInstance,
): boolean {
  if (isSettled(instance)) {
    return false;
  }
  if (step.sequence !== instance.currentStepSequence) {
    return false;
  }
  const status = String(step.status);
  return status === 'PENDING' || status === 'ACTIVE';
}

/**
 * The line above the chain: what it is waiting for, and who submitted it.
 *
 * It printed `Status: NOT_STARTED · Started by …`. NOT_STARTED is what the
 * backend calls a submitted chain nobody has signed yet, so the page said a
 * workflow it had just started was not started, and "started by" named the
 * submitter, not a signer. A tester read it as stuck (NXD-104).
 */
export function approvalInstanceSummary(instance: ApprovalInstance): string {
  const submitted = `submitted by ${instance.startedBy}`;
  switch (String(instance.status)) {
    case 'NOT_STARTED':
    case 'IN_PROGRESS': {
      const due = instance.steps.find(
        step => step.sequence === instance.currentStepSequence,
      );
      const waitingFor = due
        ? `Waiting for step ${due.sequence} (${due.role || 'Reviewer'})`
        : 'Waiting for the next step';
      return `${waitingFor} · ${submitted}`;
    }
    case 'APPROVED':
      return `Approved · ${submitted}`;
    case 'REJECTED':
      return `Rejected · ${submitted}`;
    case 'CANCELLED':
      return `Cancelled · ${submitted}`;
    default:
      return `${String(instance.status)} · ${submitted}`;
  }
}

/**
 * Whether the signed-in user holds the role this step needs.
 *
 * Decides only whether Approve is offered. The page offered it to everyone
 * with urs.approve, so an author could fill in the signing dialog for a
 * BUSINESS_REVIEWER step and be refused by the server afterwards.
 *
 * `null` roles means they could not be loaded; the button is then offered as
 * before and the server's refusal is the answer. Hiding it would make one
 * failed read look like a missing role.
 */
export function holdsApprovalStepRole(
  step: ApprovalStepInstance,
  roles: readonly string[] | null,
): boolean {
  if (roles === null || !step.role) {
    return true;
  }
  return roles.includes(String(step.role));
}
