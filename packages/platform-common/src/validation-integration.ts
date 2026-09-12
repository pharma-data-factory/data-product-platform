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

/**
 * Technical CI Quality Gate evidence metadata registered from Product Composer
 * on controlled RELEASED. Encoded in ValidationEvidenceItem.reference as JSON.
 * Not GxP / Part 11 validation evidence and does not imply VALIDATED.
 */
export interface TechnicalCiEvidenceReference {
  kind: 'ci-quality-gate';
  productId: string;
  productVersionId: string;
  productBaselineId: string;
  ursBaselineId: string;
  manifestContentHash: string;
  entityRef?: string;
  ciStatus: 'PASSED';
  workflowName?: string;
  commitSha?: string;
  branch?: string;
  htmlUrl?: string;
  conclusion?: string;
  registeredAt: string;
  disclaimer: 'technical-control-not-gxp';
}

export type RegisterTechnicalCiEvidenceRequest = {
  evidenceType: 'ci-quality-gate';
  /** Canonical JSON string of TechnicalCiEvidenceReference (or compatible). */
  reference: string;
  createdBy: string;
  candidate?: string;
  /**
   * Stable key for idempotent re-registration
   * (e.g. productVersionId + contentHash + commitSha).
   */
  idempotencyKey: string;
};

export type RegisterTechnicalCiEvidenceResponse = {
  item: {
    id: string;
    evidenceType: string;
    reference: string;
    checksum?: string;
    createdAt: string;
    createdBy?: string;
    source: 'runtime';
  };
  created: boolean;
};

/**
 * Soft QA readiness for Product Composer (advisory).
 * Technical control only — not GxP / Part 11 / VALIDATED.
 */
export type EvidenceCompletenessStatus =
  | 'MISSING'
  | 'PRESENT'
  | 'UNAVAILABLE'
  | 'NOT_APPLICABLE';

/** Live URS baseline currency for the product pin (advisory). */
export type UrsPinCurrencyStatus =
  | 'APPROVED'
  | 'SUPERSEDED'
  | 'NOT_APPROVED'
  | 'UNAVAILABLE'
  | 'MISSING'
  | 'NOT_APPLICABLE';

export interface ProductQaReadiness {
  productVersionId: string;
  versionStatus: string;
  releaseGatePassed: boolean;
  evidenceCompleteness: EvidenceCompletenessStatus;
  evidenceId?: string;
  idempotencyKey?: string;
  /** Live status of the pinned URS baseline (pull-time). */
  ursPinStatus: UrsPinCurrencyStatus;
  ursBaselineId?: string;
  ursSupersededBy?: string;
  ursPinMessage?: string;
  message: string;
  disclaimer: 'technical-control-not-gxp';
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
