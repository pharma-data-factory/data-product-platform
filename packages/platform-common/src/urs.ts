/**
 * URS vocabulary shared by the backend and the UI.
 *
 * These enums used to exist twice, once per side, and had already drifted: the
 * UI copy was missing four statuses the backend can produce, so a requirement
 * in one of them rendered as an unknown value. They live here so there is one
 * definition and the two sides cannot disagree again.
 */

/**
 * Requirement/Requirement Set/Baseline status.
 *
 * Shared across the three entities; which subset an entity may use, and which
 * moves between them are legal, is defined by the transition maps in the
 * backend's domain/transitions.ts.
 *
 * Requirement version lifecycle:
 *   DRAFT -> IN_REVIEW -> REVIEWED -> IN_APPROVAL -> APPROVED
 *   APPROVED -> SUPERSEDED | OBSOLETE
 *   IN_REVIEW | IN_APPROVAL -> REJECTED
 *
 * Baseline lifecycle:
 *   DRAFT -> IN_REVIEW -> IN_APPROVAL -> APPROVED -> SUPERSEDED
 *
 * APPROVED is the released state. The spec calls it `released`; renaming it is
 * pure nomenclature and would reach across plugin boundaries, so it is
 * deliberately deferred to its own change.
 */
export enum URSStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  REVIEWED = 'REVIEWED',
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  BASELINED = 'BASELINED',
  SUPERSEDED = 'SUPERSEDED',
  OBSOLETE = 'OBSOLETE',
  REJECTED = 'REJECTED',
  RETIRED = 'RETIRED',
}

/** Change request lifecycle. */
export enum ChangeRequestStatus {
  DRAFT = 'DRAFT',
  ASSESSED = 'ASSESSED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** What a pinned baseline item means relative to the predecessor baseline. */
export enum ReviewScope {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  UNCHANGED = 'UNCHANGED',
  UNKNOWN = 'UNKNOWN',
}

/** What a signer is attesting to. */
export enum SignatureMeaning {
  AUTHORED = 'AUTHORED',
  REVIEWED = 'REVIEWED',
  APPROVED_QA = 'APPROVED_QA',
}

/** What a signature can be applied to. */
export enum SignatureTargetType {
  REQUIREMENT_VERSION = 'REQUIREMENT_VERSION',
  BASELINE = 'BASELINE',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
}

/** Stages of the derived workflow view. */
export enum WorkflowStage {
  CREATED = 'CREATED',
  REVIEW = 'REVIEW',
  QA_APPROVAL = 'QA_APPROVAL',
  RELEASED = 'RELEASED',
}

/** How far along a workflow stage is. */
export enum WorkflowState {
  DONE = 'DONE',
  ACTIVE = 'ACTIVE',
  OPEN = 'OPEN',
  STOPPED = 'STOPPED',
}

/** Wording shown to users, rather than the raw enum value. */
export const URS_STATUS_LABELS: Readonly<Record<URSStatus, string>> = {
  [URSStatus.DRAFT]: 'Draft',
  [URSStatus.IN_REVIEW]: 'In review',
  [URSStatus.REVIEWED]: 'Reviewed',
  [URSStatus.IN_APPROVAL]: 'In approval',
  [URSStatus.APPROVED]: 'Released',
  [URSStatus.BASELINED]: 'Baselined',
  [URSStatus.SUPERSEDED]: 'Superseded',
  [URSStatus.OBSOLETE]: 'Obsolete',
  [URSStatus.REJECTED]: 'Rejected',
  [URSStatus.RETIRED]: 'Retired',
};

/**
 * Semantic tone of a status. Deliberately a name, not a colour: this is the
 * domain layer, and it must not depend on the UI palette — the dependency runs
 * the other way. The presentation layer maps these onto NEXORA_TONE, so a
 * single palette change reaches every surface and the light/dark switch keeps
 * working.
 */
export type StatusTone = 'neutral' | 'active' | 'success' | 'danger';

/** How a status should read at a glance. */
export interface StatusAppearance {
  label: string;
  tone: StatusTone;
  /**
   * Struck through for states that were once effective and no longer are, so
   * a superseded record is visibly not the one to act on.
   */
  strikeThrough: boolean;
}

const STATUS_TONES: Readonly<Record<URSStatus, StatusTone>> = {
  [URSStatus.DRAFT]: 'neutral',
  [URSStatus.IN_REVIEW]: 'active',
  [URSStatus.REVIEWED]: 'success',
  [URSStatus.IN_APPROVAL]: 'active',
  [URSStatus.APPROVED]: 'success',
  [URSStatus.BASELINED]: 'success',
  [URSStatus.SUPERSEDED]: 'neutral',
  [URSStatus.OBSOLETE]: 'neutral',
  [URSStatus.REJECTED]: 'danger',
  [URSStatus.RETIRED]: 'neutral',
};

/** States that were effective once and have been closed out. */
const STRUCK_THROUGH: readonly URSStatus[] = [
  URSStatus.SUPERSEDED,
  URSStatus.OBSOLETE,
  URSStatus.RETIRED,
];

/**
 * How to render a status.
 *
 * Falls back to a neutral grey for a value this build does not know, so an
 * unrecognised status still shows its own name instead of rendering blank.
 */
export function ursStatusAppearance(status: string): StatusAppearance {
  const known = status as URSStatus;
  if (!(known in URS_STATUS_LABELS)) {
    return { label: status, tone: 'neutral', strikeThrough: false };
  }

  return {
    label: URS_STATUS_LABELS[known],
    tone: STATUS_TONES[known],
    strikeThrough: STRUCK_THROUGH.includes(known),
  };
}

/** Statuses in which a requirement version is still being worked on. */
export const OPEN_URS_STATUSES: readonly URSStatus[] = [
  URSStatus.DRAFT,
  URSStatus.IN_REVIEW,
  URSStatus.REVIEWED,
  URSStatus.IN_APPROVAL,
];

/** Statuses a requirement version reaches only by being released. */
export const RELEASED_URS_STATUSES: readonly URSStatus[] = [
  URSStatus.APPROVED,
  URSStatus.SUPERSEDED,
  URSStatus.OBSOLETE,
];
