/**
 * Soft-ref breadcrumb phrases shared by URS Create CR prefill and Composer
 * product_change_signals hydrate. Advisory only — not GxP / structured FKs.
 */

export type SoftRefMatchTarget = {
  productId?: string | null;
  productVersionId?: string | null;
  ursBaselineId?: string | null;
};

export type SoftRefMatchAxis =
  | 'PRODUCT_VERSION'
  | 'PRODUCT'
  | 'URS_BASELINE';

export function productVersionSoftRefLine(productVersionId: string): string {
  return `Product version soft-ref: ${productVersionId}.`;
}

export function productSoftRefLine(productId: string): string {
  return `Product soft-ref: ${productId}.`;
}

export function raisedFromBaselineLine(
  baselineId: string,
  baselineVersion?: string,
): string {
  const versionNote = baselineVersion ? ` (version ${baselineVersion})` : '';
  return `Raised from baseline ${baselineId}${versionNote}.`;
}

export function resolveProductSoftRefMatchAxis(
  cr: { title?: string; description?: string },
  target: SoftRefMatchTarget,
): SoftRefMatchAxis | null {
  const description = cr.description ?? '';
  const title = cr.title ?? '';
  const productId = target.productId?.trim();
  const productVersionId = target.productVersionId?.trim();
  const ursBaselineId = target.ursBaselineId?.trim();

  if (productVersionId) {
    if (description.includes(productVersionSoftRefLine(productVersionId))) {
      return 'PRODUCT_VERSION';
    }
    if (title.includes(`product version ${productVersionId}`)) {
      return 'PRODUCT_VERSION';
    }
  }
  if (productId) {
    if (description.includes(productSoftRefLine(productId))) {
      return 'PRODUCT';
    }
  }
  if (ursBaselineId) {
    if (description.includes(`Raised from baseline ${ursBaselineId}`)) {
      return 'URS_BASELINE';
    }
    if (title.includes(`baseline ${ursBaselineId}`)) {
      return 'URS_BASELINE';
    }
  }
  return null;
}

export function matchesProductSoftRefs(
  cr: { title?: string; description?: string },
  target: SoftRefMatchTarget,
): boolean {
  return resolveProductSoftRefMatchAxis(cr, target) !== null;
}

export function filterChangeRequestsByProductSoftRefs<
  T extends { title?: string; description?: string },
>(items: T[], target: SoftRefMatchTarget): T[] {
  if (
    !target.productId?.trim() &&
    !target.productVersionId?.trim() &&
    !target.ursBaselineId?.trim()
  ) {
    return [];
  }
  return items.filter(item => matchesProductSoftRefs(item, target));
}
