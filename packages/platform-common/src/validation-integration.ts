/**
 * URS Composer → Validation Expert integration contract
 *
 * This module defines the ONE explicit boundary between the two domains:
 *
 *   URS Composer owns WHY + WHAT (business capability, business need,
 *   requirements, approved URS baseline, approval lifecycle).
 *   Validation Expert owns HOW VERIFIED (risk, protocol, run, evidence,
 *   finding, validation recommendation).
 *
 * A Validation Context may only be created from an APPROVED URS baseline.
 * Validation Expert must NOT mutate the approved baseline; it references or
 * snapshots it through the `ApprovedURSReference`.
 */

/**
 * Immutable, lossless reference to an approved URS baseline that a Validation
 * Context is anchored to. Uses stable IDs (requirementSetId + baselineId),
 * never title/name-based linking.
 */
export interface ApprovedURSReference {
  requirementSetId: string;
  baselineId: string;
  baselineVersion: string;
  requirementSetTitle?: string;
  requirementSetName?: string;
  businessCapabilityIds: string[];
  approvalStatus: string; // must be 'APPROVED' for a valid context
  approvedAt?: string;
  approvedBy?: string;
  sourceSystem: string; // 'urs-composer'
  /**
   * Immutable snapshot of requirement references at the approved baseline
   * (stable requirement IDs only). May be empty if the baseline carried no
   * version set, but is populated for traceability when available.
   */
  requirementIds: string[];
  createdAt: string;
}

/**
 * A validation context is the Validation Expert side of one approved URS
 * baseline → validation lifecycle. One context per (requirementSetId,
 * baselineId) unless the domain explicitly supports multiple cycles (it does
 * not today → dedupe by that pair).
 */
export interface ValidationContext {
  id: string;
  source: ApprovedURSReference;
  status: string; // 'PENDING' | 'IN_PROGRESS' | 'CLOSED'
  summary?: string;
  createdAt: string;
  createdBy?: string;
}

export type CreateValidationContextRequest = {
  requirementSetId: string;
  baselineId: string;
};

// ── Validation Decision (Phase 5, P5-S1) ─────────────────────────────────────

export const VALIDATION_DECISION_STATUSES = [
  'APPROVED',     // context validated; product may be released
  'CONDITIONAL',  // approved with stated conditions that must be tracked
  'REJECTED',     // context not validated; product must not be released
] as const;

export type ValidationDecisionStatus =
  (typeof VALIDATION_DECISION_STATUSES)[number];

/**
 * The terminal step of the validation lifecycle.
 *
 * A ValidationDecision is the independent expert's verdict on a ValidationContext.
 * It gates Product release: `checkReleaseGate` refuses a version whose
 * URS baseline has no APPROVED ValidationDecision.
 *
 * **Segregation of Duties:** `decidedBy` must differ from the `createdBy` on
 * the ValidationContext (validated in the service). The same person cannot
 * initiate and approve their own validation package.
 *
 * **Permission:** `validation.approve` — the `validation-experts` and
 * `urs-quality-reviewers` domain groups (NXD-119). Automatic or programmatic
 * approval must never be implemented.
 *
 * Since NXD-119 a decision is the outcome of electronic signatures, see
 * `ValidationDecisionSignature` and `validationDecisionProgress`; it is
 * written when the signatures the rule requires are complete.
 *
 * Phase 5 (P5-S1). `riskAccept` and `baselineModify` remain reserved.
 */
export interface ValidationDecision {
  id: string;
  contextId: string;
  status: ValidationDecisionStatus;
  /** Required justification. Must be non-empty for APPROVED and REJECTED. */
  justification: string;
  /** Optional conditions when status === 'CONDITIONAL'. */
  conditions?: string;
  /** The independent expert who made the decision (must ≠ context.createdBy). */
  decidedBy: string;
  decidedAt: string;
  /**
   * NXD-127. The product version this decision is for. Absent on decisions
   * recorded per baseline before NXD-127; those cover no version.
   */
  productVersionId?: string;
  /**
   * True when the decision carries the validation expert's and QA's approval
   * (NXD-119). The release gate requires it for a GMP-relevant product, so a
   * product cannot ride on a baseline approved under the one-signature rule.
   */
  gmpRule?: boolean;
  /** The signatures the decision is the outcome of (NXD-119). */
  signatures?: ValidationDecisionSignature[];
}

/**
 * The two signatures a validation decision can carry (NXD-119).
 *
 * - `VALIDATION_EXPERT` — technical: the tests cover the requirements and
 *   passed. Group `validation-experts`.
 * - `QUALITY_ASSURANCE` — independent quality approval. Group
 *   `urs-quality-reviewers`.
 */
export const VALIDATION_SIGNATURE_ROLES = [
  'VALIDATION_EXPERT',
  'QUALITY_ASSURANCE',
] as const;
export type ValidationSignatureRole =
  (typeof VALIDATION_SIGNATURE_ROLES)[number];

export type ValidationSignatureVerdict = 'APPROVED' | 'REJECTED';

/** One electronic signature on a validation decision. Append-only. */
export interface ValidationDecisionSignature {
  id: string;
  contextId: string;
  /** NXD-127. The product version signed for; absent before NXD-127. */
  productVersionId?: string;
  role: ValidationSignatureRole;
  verdict: ValidationSignatureVerdict;
  justification: string;
  signedBy: string;
  signedAt: string;
  /** Which second factor was verified, e.g. `signature-pin`. */
  reauthMethod: string;
}

/** Body of `POST /contexts/:id/signatures`. */
export interface ValidationSignatureRequest {
  /** NXD-127. The product version whose validation is signed. */
  productVersionId: string;
  role: ValidationSignatureRole;
  verdict: ValidationSignatureVerdict;
  justification: string;
  /** The signer's signing PIN; verified, never stored. */
  pin: string;
}

/**
 * Where a decision stands, given whether a GMP-relevant product depends on
 * the baseline and the signatures so far. Pure, so the service and the page
 * apply the same rule (NXD-119), which follows GAMP 5 / EU GMP Annex 11 and
 * 15: for a GMP-relevant system the validation expert signs and QA approves;
 * otherwise one signature from either suffices. A rejection by either ends
 * the decision.
 */
export interface ValidationDecisionProgress {
  complete: boolean;
  /** Set when complete. */
  status?: 'APPROVED' | 'REJECTED';
  /** Roles that may sign next; empty when complete. */
  nextRoles: ValidationSignatureRole[];
}

export function validationDecisionProgress(
  gmpRelevant: boolean,
  signatures: readonly Pick<ValidationDecisionSignature, 'role' | 'verdict'>[],
): ValidationDecisionProgress {
  if (signatures.some(s => s.verdict === 'REJECTED')) {
    return { complete: true, status: 'REJECTED', nextRoles: [] };
  }
  const approved = (role: ValidationSignatureRole) =>
    signatures.some(s => s.role === role && s.verdict === 'APPROVED');
  if (!gmpRelevant) {
    return signatures.length > 0
      ? { complete: true, status: 'APPROVED', nextRoles: [] }
      : { complete: false, nextRoles: [...VALIDATION_SIGNATURE_ROLES] };
  }
  if (!approved('VALIDATION_EXPERT')) {
    return { complete: false, nextRoles: ['VALIDATION_EXPERT'] };
  }
  if (!approved('QUALITY_ASSURANCE')) {
    return { complete: false, nextRoles: ['QUALITY_ASSURANCE'] };
  }
  return { complete: true, status: 'APPROVED', nextRoles: [] };
}

/** A product that depends on the context's URS baseline, as Composer reports it. */
export interface ValidationGmpProduct {
  id: string;
  name: string;
  gxpRelevance?: string;
}

/** `GET /contexts/:id/decision-state`: everything the decision panel shows. */
export interface ValidationDecisionState {
  contextId: string;
  /** NXD-127. The product version the state is for; absent when none chosen. */
  productVersionId?: string;
  /** NXD-127. Decisions of other versions on this context, and legacy ones. */
  otherDecisions?: ValidationDecision[];
  /** True when any dependent product is INDIRECT or DIRECT, or unknown. */
  gmpRelevant: boolean;
  products: ValidationGmpProduct[];
  /** Set when the classification could not be read; the GMP rule applies. */
  classificationError?: string;
  signatures: ValidationDecisionSignature[];
  progress: ValidationDecisionProgress;
  decision?: ValidationDecision;
  /** NXD-124. Product versions bound to the baseline, for an evidence review. */
  versions?: Array<{
    id: string;
    productId: string;
    productName: string;
    version: string;
    status: string;
  }>;
  /**
   * NXD-124. The newest product evidence review. Approval is refused unless
   * it is complete: every requirement has passing product test evidence.
   */
  evidence?: {
    runId: string;
    candidate: string;
    status: string;
    total: number;
    passed: number;
    complete: boolean;
    completedAt?: string;
  };
}

/**
 * INDIRECT and DIRECT count, and so does no answer: only an explicit NONE
 * takes a product out of the GMP rule (NXD-119).
 */
export function isGmpRelevant(gxpRelevance: string | undefined): boolean {
  return gxpRelevance !== 'NONE';
}

/**
 * Whether a baseline's decision must follow the GMP rule: when any dependent
 * product is GMP-relevant, when none is known yet (a GMP product may bind
 * later), and when the classification could not be read.
 */
export function baselineNeedsGmpRule(
  products: readonly Pick<ValidationGmpProduct, 'gxpRelevance'>[] | undefined,
): boolean {
  return !products || products.length === 0
    ? true
    : products.some(p => isGmpRelevant(p.gxpRelevance));
}

export interface CreateValidationDecisionRequest {
  status: string;
  justification: string;
  conditions?: string;
}

/**
 * Read-through display DTO for a requirement pinned by an approved URS
 * baseline. Resolved on demand via the URS Composer public API; not stored
 * as a second document copy inside Validation Expert.
 */
export interface ValidationContextRequirement {
  requirementId: string;
  requirementVersionId?: string;
  title: string;
  statement: string;
  status?: string;
  priority?: string;
  rationale?: string;
  changeType?: string;
}
