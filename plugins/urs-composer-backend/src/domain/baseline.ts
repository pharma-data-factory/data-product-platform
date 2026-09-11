/**
 * Baseline contents.
 *
 * A baseline pins exact requirement versions. Each pinned version carries a
 * review scope saying what changed relative to the predecessor baseline, so a
 * reviewer can tell which items still need looking at.
 */

import { Baseline, BaselineItem, RequirementVersion, ReviewScope } from '../types';

/**
 * The items a baseline pins.
 *
 * Callers that predate baseline_items pass only requirementVersionIds; their
 * items get UNKNOWN, because no comparison was made.
 */
export function baselineItemsOf(baseline: Baseline): BaselineItem[] {
  if (baseline.items?.length) {
    return baseline.items;
  }

  return (baseline.requirementVersionIds ?? []).map((id, position) => ({
    requirementVersionId: id,
    reviewScope: ReviewScope.UNKNOWN,
    position,
  }));
}

/**
 * Classify each pinned version against the predecessor baseline.
 *
 * Compared per logical requirement rather than per version id: a requirement
 * carried forward at a new version is MODIFIED, not a removal plus an
 * addition. Requirements that were dropped leave no item, since the new
 * baseline does not pin them.
 *
 * With no predecessor every item is ADDED — the first baseline is all new.
 */
export function computeReviewScopes(
  versionIds: string[],
  versions: Map<string, RequirementVersion>,
  predecessor: RequirementVersion[] | null,
): BaselineItem[] {
  const previousByRequirement = new Map<string, RequirementVersion>();
  for (const version of predecessor ?? []) {
    previousByRequirement.set(version.requirementId, version);
  }

  return versionIds.map((versionId, position) => {
    const current = versions.get(versionId);
    const previous = current
      ? previousByRequirement.get(current.requirementId)
      : undefined;

    let reviewScope: ReviewScope;
    if (!predecessor) {
      reviewScope = ReviewScope.ADDED;
    } else if (!current) {
      // Nothing to compare against; the caller validates existence separately.
      reviewScope = ReviewScope.UNKNOWN;
    } else if (!previous) {
      reviewScope = ReviewScope.ADDED;
    } else if (previous.id === current.id) {
      reviewScope = ReviewScope.UNCHANGED;
    } else {
      // A different version of the same requirement. Content decides: a
      // version bump that changed nothing signed-relevant is not a re-review.
      reviewScope =
        previous.contentHash &&
        current.contentHash &&
        previous.contentHash === current.contentHash
          ? ReviewScope.UNCHANGED
          : ReviewScope.MODIFIED;
    }

    return { requirementVersionId: versionId, reviewScope, position };
  });
}
