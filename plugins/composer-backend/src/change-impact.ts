/**
 * URS requirement delta → change impact / retest markers for Product Composer.
 *
 * Draft URS changes do not create assessments. Only APPROVED/BASELINED baselines
 * assigned to an existing product create an OPEN assessment with RETEST_REQUIRED.
 */

import { randomUUID } from 'crypto';
import type {
  ChangeImpactAssessment,
  RequirementDeltaItem,
  RequirementDeltaType,
} from '@internal/platform-common';

export interface UrsRequirementPin {
  requirementId: string;
  versionId: string;
  contentHash?: string;
}

export function computeRequirementDeltas(
  previous: UrsRequirementPin[],
  current: UrsRequirementPin[],
): RequirementDeltaItem[] {
  const prevByReq = new Map(previous.map(p => [p.requirementId, p]));
  const currByReq = new Map(current.map(c => [c.requirementId, c]));
  const ids = new Set([...prevByReq.keys(), ...currByReq.keys()]);
  const deltas: RequirementDeltaItem[] = [];

  for (const requirementId of [...ids].sort()) {
    const prev = prevByReq.get(requirementId);
    const curr = currByReq.get(requirementId);
    let changeType: RequirementDeltaType;
    if (!prev && curr) {
      changeType = 'ADDED';
    } else if (prev && !curr) {
      changeType = 'REMOVED';
    } else if (
      prev &&
      curr &&
      (prev.versionId !== curr.versionId ||
        (prev.contentHash &&
          curr.contentHash &&
          prev.contentHash !== curr.contentHash))
    ) {
      changeType = 'MODIFIED';
    } else {
      changeType = 'UNCHANGED';
    }
    deltas.push({
      requirementId,
      changeType,
      previousVersionId: prev?.versionId,
      currentVersionId: curr?.versionId,
    });
  }
  return deltas;
}

export function buildChangeImpactAssessment(input: {
  productId: string;
  productVersionId: string;
  productBaselineId: string;
  previousUrsBaselineId?: string;
  ursBaselineId: string;
  requirementSetId: string;
  deltas: RequirementDeltaItem[];
  actor: string;
  /** When false (e.g. draft URS only), returns null — no retest. */
  triggerRetest: boolean;
}): ChangeImpactAssessment | null {
  if (!input.triggerRetest) {
    return null;
  }

  const impacted = input.deltas.filter(d =>
    ['ADDED', 'MODIFIED', 'REMOVED'].includes(d.changeType),
  );
  const unchanged = input.deltas.filter(d => d.changeType === 'UNCHANGED');

  return {
    id: `CIA-${randomUUID()}`,
    productId: input.productId,
    productVersionId: input.productVersionId,
    productBaselineId: input.productBaselineId,
    previousUrsBaselineId: input.previousUrsBaselineId,
    ursBaselineId: input.ursBaselineId,
    requirementSetId: input.requirementSetId,
    deltas: input.deltas,
    impactedRequirementIds: impacted.map(d => d.requirementId),
    retestRequiredRequirementIds: impacted.map(d => d.requirementId),
    carriedForwardRequirementIds: unchanged.map(d => d.requirementId),
    status: impacted.length > 0 ? 'OPEN' : 'CLOSED',
    createdAt: new Date().toISOString(),
    createdBy: input.actor,
    disclaimer: 'technical-control-not-gxp',
  };
}

export function hasOpenRetestRequired(
  assessment: ChangeImpactAssessment | null | undefined,
): boolean {
  return Boolean(
    assessment &&
      assessment.status === 'OPEN' &&
      assessment.retestRequiredRequirementIds.length > 0,
  );
}
