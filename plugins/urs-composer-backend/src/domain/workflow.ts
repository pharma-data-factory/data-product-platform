/**
 * Workflow view (invariant 17).
 *
 * A derived reading of where something stands, consolidated from its status,
 * its signatures and its audit trail. Nothing here is stored: the timeline is
 * computed on request, so it can never disagree with the records it is
 * summarising.
 */

import {
  ApprovalInstance,
  ApprovalStepStatus,
  AuditEvent,
  Baseline,
  RequirementVersion,
  Signature,
  SignatureMeaning,
  URSStatus,
} from '../types';

export enum WorkflowStage {
  CREATED = 'CREATED',
  REVIEW = 'REVIEW',
  QA_APPROVAL = 'QA_APPROVAL',
  RELEASED = 'RELEASED',
}

export enum WorkflowState {
  /** Happened; who and when are recorded. */
  DONE = 'DONE',
  /** Where the work currently sits. */
  ACTIVE = 'ACTIVE',
  /** Still ahead. */
  OPEN = 'OPEN',
  /** Will not happen: the workflow ended before reaching this stage. */
  STOPPED = 'STOPPED',
}

export interface WorkflowStep {
  stage: WorkflowStage;
  state: WorkflowState;
  actor?: string;
  timestamp?: Date;
  comment?: string;
}

export interface WorkflowView {
  targetType: 'REQUIREMENT_VERSION' | 'BASELINE';
  targetId: string;
  status: URSStatus;
  steps: WorkflowStep[];
}

/** Statuses a requirement version reaches only by being released. */
const RELEASED_VERSION_STATUSES: readonly URSStatus[] = [
  URSStatus.APPROVED,
  URSStatus.SUPERSEDED,
  URSStatus.OBSOLETE,
];

/** Statuses that end the workflow without a release. */
const ABANDONED_STATUSES: readonly URSStatus[] = [
  URSStatus.REJECTED,
  URSStatus.RETIRED,
];

/** Review is behind a version once it has moved past being reviewed. */
const PAST_REVIEW_STATUSES: readonly URSStatus[] = [
  URSStatus.REVIEWED,
  URSStatus.IN_APPROVAL,
  ...RELEASED_VERSION_STATUSES,
];

function signatureFor(
  signatures: Signature[],
  meaning: SignatureMeaning,
): Signature | undefined {
  return signatures.find(s => s.meaning === meaning);
}

function releasedStageState(
  released: boolean,
  abandoned: boolean,
): WorkflowState {
  if (released) {
    return WorkflowState.DONE;
  }
  if (abandoned) {
    return WorkflowState.STOPPED;
  }
  return WorkflowState.OPEN;
}

function fromSignature(
  stage: WorkflowStage,
  signature: Signature,
): WorkflowStep {
  return {
    stage,
    state: WorkflowState.DONE,
    actor: signature.signedBy,
    timestamp: signature.signedAt,
    comment: signature.comment,
  };
}

function lastEvent(
  audit: AuditEvent[],
  eventType: string,
): AuditEvent | undefined {
  return audit
    .filter(e => e.eventType === eventType)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .pop();
}

/**
 * Where a requirement version stands.
 *
 * The review and approval stages read from signatures when there are any,
 * since a signature says who attested to what and when. A version released
 * through a baseline approval chain has no signatures of its own, so those
 * stages are inferred from the status it reached.
 */
export function requirementVersionWorkflow(
  version: RequirementVersion,
  signatures: Signature[],
  audit: AuditEvent[],
): WorkflowView {
  const status = version.status;
  const abandoned = ABANDONED_STATUSES.includes(status);
  const released = RELEASED_VERSION_STATUSES.includes(status);

  const created = lastEvent(audit, 'CREATED');
  const steps: WorkflowStep[] = [
    {
      stage: WorkflowStage.CREATED,
      state: WorkflowState.DONE,
      actor: version.createdBy,
      timestamp: version.createdAt,
      comment: created?.reason,
    },
  ];

  const reviewed = signatureFor(signatures, SignatureMeaning.REVIEWED);
  if (reviewed) {
    steps.push(fromSignature(WorkflowStage.REVIEW, reviewed));
  } else if (status === URSStatus.IN_REVIEW) {
    steps.push({ stage: WorkflowStage.REVIEW, state: WorkflowState.ACTIVE });
  } else if (PAST_REVIEW_STATUSES.includes(status)) {
    steps.push({ stage: WorkflowStage.REVIEW, state: WorkflowState.DONE });
  } else {
    steps.push({
      stage: WorkflowStage.REVIEW,
      state: abandoned ? WorkflowState.STOPPED : WorkflowState.OPEN,
    });
  }

  const approved = signatureFor(signatures, SignatureMeaning.APPROVED_QA);
  if (approved) {
    steps.push(fromSignature(WorkflowStage.QA_APPROVAL, approved));
  } else if (status === URSStatus.IN_APPROVAL) {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: WorkflowState.ACTIVE,
    });
  } else if (released) {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: WorkflowState.DONE,
      actor: version.approvedBy,
      timestamp: version.approvedAt,
    });
  } else {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: abandoned ? WorkflowState.STOPPED : WorkflowState.OPEN,
    });
  }

  steps.push({
    stage: WorkflowStage.RELEASED,
    state: releasedStageState(released, abandoned),
    actor: released ? version.approvedBy : undefined,
    timestamp: released ? (version.releasedAt ?? version.approvedAt) : undefined,
  });

  return {
    targetType: 'REQUIREMENT_VERSION',
    targetId: version.id,
    status,
    steps,
  };
}

/**
 * Where a baseline stands.
 *
 * A baseline is reviewed and approved by its approval chain rather than by
 * signatures, so the steps of that chain supply who acted and what they said.
 * The last decided step is the one worth showing for a stage; earlier steps
 * remain visible in the instance itself.
 */
export function baselineWorkflow(
  baseline: Baseline,
  instance: ApprovalInstance | null,
  audit: AuditEvent[],
): WorkflowView {
  const status = baseline.status;
  const abandoned = ABANDONED_STATUSES.includes(status);
  const released =
    status === URSStatus.APPROVED || status === URSStatus.SUPERSEDED;

  const decided = (instance?.steps ?? [])
    .filter(s => s.status === ApprovalStepStatus.APPROVED && s.actedAt)
    .sort((a, b) => a.sequence - b.sequence);

  const submitted = lastEvent(audit, 'SUBMITTED');

  const steps: WorkflowStep[] = [
    {
      stage: WorkflowStage.CREATED,
      state: WorkflowState.DONE,
      actor: baseline.createdBy,
      timestamp: baseline.createdAt,
    },
  ];

  // Everything up to the last required step is the review; the final step is
  // the approval decision.
  const reviewSteps = decided.slice(0, Math.max(decided.length - 1, 0));
  const finalStep = decided.length ? decided[decided.length - 1] : undefined;

  if (reviewSteps.length) {
    const last = reviewSteps[reviewSteps.length - 1];
    steps.push({
      stage: WorkflowStage.REVIEW,
      state: WorkflowState.DONE,
      actor: last.actedBy,
      timestamp: last.actedAt,
      comment: last.comment,
    });
  } else if (status === URSStatus.IN_REVIEW) {
    steps.push({
      stage: WorkflowStage.REVIEW,
      state: WorkflowState.ACTIVE,
      actor: submitted?.actor,
      timestamp: submitted?.timestamp,
    });
  } else if (released || status === URSStatus.IN_APPROVAL) {
    steps.push({ stage: WorkflowStage.REVIEW, state: WorkflowState.DONE });
  } else {
    steps.push({
      stage: WorkflowStage.REVIEW,
      state: abandoned ? WorkflowState.STOPPED : WorkflowState.OPEN,
    });
  }

  if (released && finalStep) {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: WorkflowState.DONE,
      actor: finalStep.actedBy,
      timestamp: finalStep.actedAt,
      comment: finalStep.comment,
    });
  } else if (status === URSStatus.IN_APPROVAL) {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: WorkflowState.ACTIVE,
    });
  } else if (released) {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: WorkflowState.DONE,
      actor: baseline.approvedBy,
      timestamp: baseline.approvedAt,
    });
  } else {
    steps.push({
      stage: WorkflowStage.QA_APPROVAL,
      state: abandoned ? WorkflowState.STOPPED : WorkflowState.OPEN,
    });
  }

  steps.push({
    stage: WorkflowStage.RELEASED,
    state: releasedStageState(released, abandoned),
    actor: released ? baseline.approvedBy : undefined,
    timestamp: released ? baseline.approvedAt : undefined,
  });

  return {
    targetType: 'BASELINE',
    targetId: baseline.id,
    status,
    steps,
  };
}
