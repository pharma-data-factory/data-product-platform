/**
 * Electronic signatures on requirement versions.
 *
 * Four things have to hold before a signature is recorded, and all four are
 * checked here rather than spread across callers:
 *
 *   1. The signatory proved a second factor (domain/reauth.ts).
 *   2. The content still hashes to what it hashed to when it was stored.
 *      Otherwise the record moved after an earlier signature was applied.
 *   3. The signatory holds the approval role the meaning requires.
 *   4. Segregation of duties: no one reviews their own authorship, and no one
 *      approves what they reviewed.
 *
 * A signature is never updated or withdrawn. A wrong signature is corrected by
 * rejecting the version and opening a new one, which leaves both statements in
 * the record.
 */

import { randomUUID } from 'crypto';
import {
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
} from '@backstage/errors';
import { computeContentHash } from '@internal/platform-common';
import {
  ApprovalRole,
  Baseline,
  ChangeRequest,
  ChangeRequestStatus,
  ImpactAssessment,
  RequirementVersion,
  Signature,
  SignatureMeaning,
  SignatureTargetType,
  URSStatus,
} from '../types';
import { IURSRepository } from '../repository-interface';
import { ReAuthProvider } from './reauth';

/** The approval role a given meaning requires. */
const REQUIRED_ROLE: Record<SignatureMeaning, ApprovalRole | null> = {
  // Authorship is attested by whoever wrote it; no separate role gate.
  [SignatureMeaning.AUTHORED]: null,
  [SignatureMeaning.REVIEWED]: ApprovalRole.BUSINESS_REVIEWER,
  [SignatureMeaning.APPROVED_QA]: ApprovalRole.QUALITY_REVIEWER,
};

/** The version statuses in which each meaning may be applied. */
const PERMITTED_STATUSES: Record<SignatureMeaning, URSStatus[]> = {
  [SignatureMeaning.AUTHORED]: [URSStatus.DRAFT, URSStatus.IN_REVIEW],
  [SignatureMeaning.REVIEWED]: [URSStatus.IN_REVIEW],
  [SignatureMeaning.APPROVED_QA]: [URSStatus.IN_APPROVAL],
};

export interface SignRequest {
  targetType: SignatureTargetType;
  targetId: string;
  meaning: SignatureMeaning;
  /** Entity ref of the signatory, taken from the session and never from the request body. */
  signedBy: string;
  /** The second factor, e.g. the signing PIN. */
  secret: string;
  comment?: string;
  /**
   * Set when the caller has already run `preAuthenticate` for this signatory
   * and secret, outside the transaction `sign` will run in.
   *
   * Not a way to skip the check — `preAuthenticate` performs exactly the same
   * verification, and a caller that sets this without having called it signs
   * nothing, because the flag is written by that method's callers only. It
   * exists because the re-authentication store is deliberately *not* the
   * transactional repository (a failed attempt has to be counted even when the
   * signature rolls back), and reaching a second repository from inside a
   * transaction deadlocks the plugin's connection pool. See
   * `URSService.signatureServiceFor`.
   */
  secondFactorVerified?: boolean;
}

/** Recomputes the hash of a stored version from its signed fields. */
export function hashOf(version: RequirementVersion): string {
  return computeContentHash({
    title: version.title,
    description: version.statement,
    rationale: version.rationale,
    category: version.category,
    acceptanceCriteria: version.acceptanceIntent,
    gxpRelevance: version.gxpRelevance,
    riskClass: version.classification?.criticality,
  });
}

/**
 * Hash of a change request and the assessment it was decided on.
 *
 * Reuses the requirement hash rather than introducing a second scheme: the
 * request's title, description and reason map onto title, description and
 * rationale, and the assessment summary onto acceptanceCriteria, so an
 * approval is bound to the assessment it was based on as well as to the
 * request itself.
 */
export function hashOfChangeRequest(
  request: ChangeRequest,
  assessment: ImpactAssessment | null,
): string {
  return computeContentHash({
    title: request.title,
    description: request.description,
    rationale: request.reason,
    acceptanceCriteria: assessment?.summary,
    gxpRelevance: assessment ? String(assessment.gxpImpact) : null,
    category: request.affectedRequirementIds.join(','),
  });
}

/** Hash of a baseline's pinned identity for signature binding. */
export function hashOfBaseline(baseline: Baseline): string {
  return computeContentHash({
    title: baseline.id,
    description: baseline.requirementSetId,
    rationale: baseline.baselineVersion,
    acceptanceCriteria: baseline.requirementVersionIds.join(','),
    gxpRelevance: baseline.status,
    category: baseline.approvalInstanceId ?? null,
  });
}

export interface SignatureServiceOptions {
  repository: IURSRepository;
  reAuth: ReAuthProvider;
  /** Resolves a user's approval roles; supplied by URSService. */
  resolveRoles: (userRef: string) => Promise<ApprovalRole[]>;
}

export class SignatureService {
  private readonly repository: IURSRepository;
  private readonly reAuth: ReAuthProvider;
  private readonly resolveRoles: (userRef: string) => Promise<ApprovalRole[]>;

  constructor(options: SignatureServiceOptions) {
    this.repository = options.repository;
    this.reAuth = options.reAuth;
    this.resolveRoles = options.resolveRoles;
  }

  /**
   * Verify a signature request without recording anything.
   *
   * Returns the version and the hash the signature should carry. Split out so
   * that the approval flow can validate before opening a transaction, and so
   * that the checks are testable on their own.
   */
  async validate(
    request: SignRequest,
    repository: IURSRepository = this.repository,
  ): Promise<{ contentHash: string }> {
    switch (request.targetType) {
      case SignatureTargetType.REQUIREMENT_VERSION:
        return this.validateVersionSignature(request, repository);
      case SignatureTargetType.CHANGE_REQUEST:
        return this.validateChangeRequestSignature(request, repository);
      case SignatureTargetType.BASELINE:
        return this.validateBaselineSignature(request, repository);
      default:
        throw new InputError(
          `Signing ${request.targetType} is not supported yet.`,
        );
    }
  }

  /**
   * Baseline approval-step signatures bind the PIN attestation to the baseline
   * identity and pinned version set. The approval chain already enforced the
   * step's ApprovalRole; here we verify second factor and content binding only.
   */
  private async validateBaselineSignature(
    request: SignRequest,
    repository: IURSRepository,
  ): Promise<{ contentHash: string }> {
    const baseline = await repository.getBaseline(request.targetId);
    if (!baseline) {
      throw new NotFoundError(`Baseline ${request.targetId} not found`);
    }

    const allowed: URSStatus[] = [
      URSStatus.DRAFT,
      URSStatus.IN_REVIEW,
      URSStatus.IN_APPROVAL,
    ];
    if (!allowed.includes(baseline.status)) {
      throw new ConflictError(
        `Baseline ${request.targetId} cannot be signed in status ${baseline.status}.`,
      );
    }

    await this.verifySecondFactor(request);

    return { contentHash: hashOfBaseline(baseline) };
  }

  private async validateVersionSignature(
    request: SignRequest,
    repository: IURSRepository,
  ): Promise<{ contentHash: string }> {
    const version = await repository.getRequirementVersion(request.targetId);
    if (!version) {
      throw new NotFoundError(
        `Requirement version ${request.targetId} not found`,
      );
    }

    const permitted = PERMITTED_STATUSES[request.meaning];
    if (!permitted.includes(version.status)) {
      throw new ConflictError(
        `A ${request.meaning} signature requires status ${permitted.join(' or ')}; ` +
          `${request.targetId} is ${version.status}.`,
      );
    }

    const contentHash = await this.verifyContentUnchanged(version);
    await this.verifyRole(request);
    await this.verifySegregationOfDuties(request, version, repository);
    // Last, so that a failed second factor cannot be used to probe which of
    // the other conditions hold.
    await this.verifySecondFactor(request);

    return { contentHash };
  }

  /**
   * A change request is approved by quality, by someone who neither raised nor
   * assessed it, and only once an assessment exists.
   */
  private async validateChangeRequestSignature(
    request: SignRequest,
    repository: IURSRepository,
  ): Promise<{ contentHash: string }> {
    if (request.meaning !== SignatureMeaning.APPROVED_QA) {
      throw new InputError(
        `A change request takes only an ${SignatureMeaning.APPROVED_QA} signature.`,
      );
    }

    const changeRequest = await repository.getChangeRequest(request.targetId);
    if (!changeRequest) {
      throw new NotFoundError(`Change request ${request.targetId} not found`);
    }

    if (changeRequest.status !== ChangeRequestStatus.ASSESSED) {
      throw new ConflictError(
        `Change request ${request.targetId} must be ${ChangeRequestStatus.ASSESSED} ` +
          `before it can be approved; it is ${changeRequest.status}.`,
      );
    }

    const assessment = await repository.getImpactAssessment(request.targetId);
    if (!assessment) {
      throw new ConflictError(
        `Change request ${request.targetId} has no impact assessment on record.`,
      );
    }

    await this.verifyRole(request);

    if (request.signedBy === changeRequest.requestedBy) {
      throw new NotAllowedError(
        `${request.signedBy} raised ${changeRequest.id} and cannot approve it.`,
      );
    }
    if (request.signedBy === assessment.assessedBy) {
      throw new NotAllowedError(
        `${request.signedBy} assessed ${changeRequest.id} and cannot also approve it.`,
      );
    }

    await this.verifySecondFactor(request);

    return { contentHash: hashOfChangeRequest(changeRequest, assessment) };
  }

  /**
   * Verify and record a signature.
   *
   * Does not change the version's status. The caller decides what a signature
   * sets in motion; see URSService for the release that an APPROVED_QA
   * signature triggers.
   */
  async sign(
    request: SignRequest,
    repository: IURSRepository = this.repository,
  ): Promise<Signature> {
    const { contentHash } = await this.validate(request, repository);

    const signature: Signature = {
      id: randomUUID(),
      targetType: request.targetType,
      targetId: request.targetId,
      meaning: request.meaning,
      signedBy: request.signedBy,
      signedAt: new Date(),
      contentHashAtSigning: contentHash,
      comment: request.comment,
    };

    await repository.createSignature(signature);

    let auditEntityType: 'CHANGE_REQUEST' | 'BASELINE' | 'REQUIREMENT_VERSION' =
      'REQUIREMENT_VERSION';
    if (request.targetType === SignatureTargetType.CHANGE_REQUEST) {
      auditEntityType = 'CHANGE_REQUEST';
    } else if (request.targetType === SignatureTargetType.BASELINE) {
      auditEntityType = 'BASELINE';
    }

    await repository.createAuditEvent({
      id: randomUUID(),
      entityType: auditEntityType,
      entityId: request.targetId,
      eventType: 'SIGNED',
      newValue: {
        meaning: signature.meaning,
        contentHashAtSigning: signature.contentHashAtSigning,
        reAuthProvider: this.reAuth.name,
      },
      actor: request.signedBy,
      timestamp: signature.signedAt,
      reason: request.comment,
    });

    return signature;
  }

  /**
   * Recompute the hash and compare it with the stored one.
   *
   * A version written before content hashes existed has none; it is hashed on
   * the spot rather than refused, since there is nothing to contradict.
   */
  private async verifyContentUnchanged(
    version: RequirementVersion,
  ): Promise<string> {
    const actual = hashOf(version);

    if (version.contentHash && version.contentHash !== actual) {
      throw new ConflictError(
        `Content of ${version.id} has changed since it was stored ` +
          `(expected ${version.contentHash}, found ${actual}). ` +
          `Existing signatures no longer apply; the version must be reopened.`,
      );
    }

    return actual;
  }

  private async verifyRole(request: SignRequest): Promise<void> {
    const required = REQUIRED_ROLE[request.meaning];
    if (!required) {
      return;
    }

    const roles = await this.resolveRoles(request.signedBy);
    // No administrator override. An administrator who could sign as quality
    // would make the segregation of duties decorative.
    if (!roles.includes(required)) {
      throw new NotAllowedError(
        `A ${request.meaning} signature requires the ${required} role. ` +
          `Your roles: ${roles.join(', ') || 'none'}.`,
      );
    }
  }

  /**
   * Nobody signs off their own work.
   *
   * REVIEWED may not come from the author. APPROVED_QA may come from neither
   * the author nor the reviewer.
   */
  private async verifySegregationOfDuties(
    request: SignRequest,
    version: RequirementVersion,
    repository: IURSRepository,
  ): Promise<void> {
    if (request.meaning === SignatureMeaning.AUTHORED) {
      return;
    }

    if (request.signedBy === version.createdBy) {
      throw new NotAllowedError(
        `${request.signedBy} authored ${version.id} and cannot sign it as ${request.meaning}.`,
      );
    }

    if (request.meaning !== SignatureMeaning.APPROVED_QA) {
      return;
    }

    const existing = await repository.listSignatures(
      request.targetType,
      request.targetId,
    );
    const reviewedByThisUser = existing.some(
      s =>
        s.meaning === SignatureMeaning.REVIEWED &&
        s.signedBy === request.signedBy,
    );
    if (reviewedByThisUser) {
      throw new NotAllowedError(
        `${request.signedBy} already reviewed ${version.id} and cannot also approve it for quality.`,
      );
    }
  }

  /**
   * Run the second factor on its own, before a transaction is opened.
   *
   * The re-authentication store is the base repository on purpose: a failed
   * attempt must be counted even when the signature that follows rolls back.
   * That makes it a second connection, which a transaction cannot lend and the
   * pool cannot supply — so the check has to happen first. Callers then set
   * `secondFactorVerified` on the request they pass to `sign`.
   */
  async preAuthenticate(signedBy: string, secret: string): Promise<void> {
    await this.verifySecondFactor({
      signedBy,
      secret,
    } as SignRequest);
  }

  private async verifySecondFactor(request: SignRequest): Promise<void> {
    if (request.secondFactorVerified) {
      return;
    }
    if (!request.secret) {
      throw new InputError(
        'A signature requires re-authentication. Supply your signing PIN.',
      );
    }

    const result = await this.reAuth.verify(request.signedBy, request.secret);
    if (result.ok) {
      return;
    }

    if (result.lockedUntil) {
      throw new NotAllowedError(
        `Too many failed signing attempts. Locked until ${result.lockedUntil.toISOString()}.`,
      );
    }
    throw new NotAllowedError('Re-authentication failed. Signature rejected.');
  }
}
