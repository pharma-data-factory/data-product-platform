/**
 * Prefill helpers for Create Change Request deep-links.
 * Soft refs in description/reason only — no GxP schema fields.
 */

import {
  filterChangeRequestsByProductSoftRefs,
  matchesProductSoftRefs,
  productSoftRefLine,
  productVersionSoftRefLine,
  raisedFromBaselineLine,
  type SoftRefMatchTarget,
} from '@internal/platform-common';

export type { SoftRefMatchTarget };
export { matchesProductSoftRefs, filterChangeRequestsByProductSoftRefs };

export function buildCreateChangeRequestDefaults(params: {
  baselineId?: string | null;
  baselineVersion?: string | null;
  reason?: string | null;
  productVersionId?: string | null;
  productId?: string | null;
  successor?: string | null;
  affectedRequirementIds?: string | null;
}): {
  title: string;
  description: string;
  reason: string;
  affectedIdsRaw: string;
} {
  const baselineId = params.baselineId?.trim() || undefined;
  const baselineVersion = params.baselineVersion?.trim() || undefined;
  const productVersionId = params.productVersionId?.trim() || undefined;
  const productId = params.productId?.trim() || undefined;
  const successor = params.successor?.trim() || undefined;
  const reasonFromQuery = params.reason?.trim() || undefined;

  const lines: string[] = [];
  if (baselineId) {
    lines.push(raisedFromBaselineLine(baselineId, baselineVersion));
  }
  if (productVersionId) {
    lines.push(productVersionSoftRefLine(productVersionId));
  }
  if (productId) {
    lines.push(productSoftRefLine(productId));
  }
  if (successor) {
    lines.push(`Suggested successor URS baseline: ${successor}.`);
  }
  if (lines.length > 0) {
    lines.push(
      'Technical advisory breadcrumbs only — not a GxP / Part 11 controlled product record.',
    );
  }

  return {
    title: baselineId
      ? `Change request for baseline ${baselineId}`
      : productVersionId
        ? `Change request for product version ${productVersionId}`
        : '',
    description: lines.join('\n'),
    reason:
      reasonFromQuery ||
      (baselineId && productVersionId
        ? 'Product Composer pin references a SUPERSEDED URS baseline; align requirements and re-baseline the product.'
        : ''),
    affectedIdsRaw: params.affectedRequirementIds ?? '',
  };
}

export function buildUrsChangeRequestDeepLink(input: {
  ursBaselineId: string;
  productVersionId?: string;
  productId?: string;
  successor?: string;
  reason?: string;
}): string {
  const params = new URLSearchParams();
  params.set('baselineId', input.ursBaselineId);
  if (input.productVersionId) {
    params.set('productVersionId', input.productVersionId);
  }
  if (input.productId) {
    params.set('productId', input.productId);
  }
  if (input.successor) {
    params.set('successor', input.successor);
  }
  params.set(
    'reason',
    input.reason ??
      'Product Composer pin references a SUPERSEDED URS baseline; align requirements and re-baseline the product.',
  );
  return `/urs-composer/change-requests/new?${params.toString()}`;
}
