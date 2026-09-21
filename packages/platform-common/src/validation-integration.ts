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
 * **Permission:** `validation.approve` — granted to `PLATFORM_ADMIN` only.
 * Automatic or programmatic approval must never be implemented.
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
