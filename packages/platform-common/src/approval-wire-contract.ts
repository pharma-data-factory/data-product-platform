/**
 * The approval-chain wire contract, as one statement both sides check.
 *
 * The URS Composer's approval API is consumed by a frontend plugin that
 * cannot import the backend's types — separate workspaces, and a frontend
 * plugin depending on a backend plugin would be a new dependency and the
 * wrong direction besides. So the two sides declared the shape twice, and
 * drifted:
 *
 *   `ApprovalInstance` in `plugins/urs-composer/src/api/types.ts` declared
 *   `currentStepId`, `createdAt` and `createdBy`. The backend sends
 *   `currentStepSequence`, `startedAt` and `startedBy`. Two of the three
 *   phantoms were declared **non-optional**, so the type promised a value
 *   that was `undefined` on every response ever returned. Nothing read them,
 *   which is the only reason the chain rendered at all.
 *
 * This file is the third declaration that makes the other two agree. It
 * lists the fields a **client may rely on** — the backend guarantees to send
 * them, and the frontend type declares them non-optional. Both sides have a
 * test against it:
 *
 *   - `plugins/urs-composer-backend/src/approval-contract.test.ts` drives a
 *     real approval instance through the service, serialises it the way
 *     Express would, and asserts every field below is present.
 *   - `plugins/urs-composer/src/api/approval-contract.test.ts` asserts the
 *     declared TypeScript type accepts exactly this shape.
 *
 * **Not listed: fields the backend sends that no client needs.** `revision`
 * is optimistic-concurrency metadata and `approvalInstanceId` is redundant
 * on a nested step. A client ignoring a field it was sent is harmless; a
 * client relying on a field it was never sent is the defect this exists to
 * prevent. Adding a field here is a promise — only do it when a client
 * reads it.
 *
 * Optional fields are listed separately because "absent" is a legitimate
 * answer for them: a step nobody has acted on has no `actedAt`, and an
 * instance in flight has no `completedAt`.
 */

/** Fields every approval-instance response carries. */
export const APPROVAL_INSTANCE_REQUIRED_FIELDS = [
  'id',
  'workflowId',
  'baselineId',
  'status',
  'currentStepSequence',
  'startedBy',
  'startedAt',
  'steps',
] as const;

/** Approval-instance fields that are absent until the instance completes. */
export const APPROVAL_INSTANCE_OPTIONAL_FIELDS = [
  'completedBy',
  'completedAt',
] as const;

/** Fields every approval-step response carries. */
export const APPROVAL_STEP_REQUIRED_FIELDS = [
  'id',
  'sequence',
  'role',
  'status',
  'required',
] as const;

/** Approval-step fields that are absent until somebody acts on the step. */
export const APPROVAL_STEP_OPTIONAL_FIELDS = [
  'assignedTo',
  'decision',
  'comment',
  'actedBy',
  'actedAt',
] as const;

export type ApprovalInstanceRequiredField =
  (typeof APPROVAL_INSTANCE_REQUIRED_FIELDS)[number];
export type ApprovalStepRequiredField =
  (typeof APPROVAL_STEP_REQUIRED_FIELDS)[number];

/**
 * Which required fields a serialised response is missing.
 *
 * Returns the missing names rather than a boolean so a failing test names
 * what drifted instead of only that something did.
 */
export function missingWireFields(
  payload: Record<string, unknown>,
  required: readonly string[],
): string[] {
  return required.filter(
    field => !Object.prototype.hasOwnProperty.call(payload, field),
  );
}
