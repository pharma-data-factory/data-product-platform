/**
 * Requirement version numbering (spec invariant 7).
 *
 * Labels are computed here and nowhere else. Clients never supply them.
 *
 * The sequence is:
 *   first draft        0.1
 *   release            1.0
 *   next draft round   1.1-draft, 1.2-draft, ...
 *   release            2.0
 *
 * A draft carries the major of the release it descends from; releasing bumps
 * the major and resets the minor. The very first draft is labelled "0.1"
 * without the suffix, matching the examples in the specification.
 */

import { InputError } from '@backstage/errors';

export interface VersionNumber {
  major: number;
  minor: number;
}

export interface Version extends VersionNumber {
  /** Rendered label, e.g. "0.1", "1.0", "1.1-draft". */
  label: string;
  isDraft: boolean;
}

const DRAFT_SUFFIX = '-draft';

/** Render a label from its parts. */
export function formatLabel(
  major: number,
  minor: number,
  isDraft: boolean,
): string {
  const base = `${major}.${minor}`;
  // The initial 0.1 draft is written without the suffix.
  if (!isDraft || (major === 0 && minor === 1)) {
    return base;
  }
  return `${base}${DRAFT_SUFFIX}`;
}

function version(major: number, minor: number, isDraft: boolean): Version {
  return { major, minor, label: formatLabel(major, minor, isDraft), isDraft };
}

/** The first version of a brand new requirement: 0.1, in draft. */
export function firstVersion(): Version {
  return version(0, 1, true);
}

/**
 * Open a new draft round.
 *
 * Pass the currently released version to start a round after a release, or the
 * current draft to iterate within an ongoing round.
 */
export function nextDraft(previous: VersionNumber, fromRelease: boolean): Version {
  if (fromRelease) {
    // A release is always n.0; the following draft round starts at n.1.
    return version(previous.major, 1, true);
  }
  return version(previous.major, previous.minor + 1, true);
}

/** The release that supersedes the given draft: major + 1, minor reset. */
export function releaseOf(draft: VersionNumber): Version {
  return version(draft.major + 1, 0, false);
}

/** Parse a label back into its parts. */
export function parseLabel(label: string): Version {
  const trimmed = label.trim();
  const isDraft = trimmed.endsWith(DRAFT_SUFFIX);
  const base = isDraft ? trimmed.slice(0, -DRAFT_SUFFIX.length) : trimmed;
  const match = /^(\d+)\.(\d+)$/.exec(base);

  if (!match) {
    throw new InputError(`Malformed version label: ${label}`);
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  // Preserve the parsed draft flag rather than re-deriving it, so that "0.1"
  // round-trips as the draft it is.
  return { major, minor, label: trimmed, isDraft: isDraft || (major === 0 && minor === 1) };
}

/**
 * Sortable numeric form, e.g. 1.10 → 110 and 1.9 → 109.
 *
 * The factor matches the values already stored in requirement_versions.
 * version_number, so old and new rows sort against each other correctly.
 */
export function versionOrdinal(v: VersionNumber): number {
  return v.major * 100 + v.minor;
}

/** Negative when a precedes b, positive when a follows b, zero when equal. */
export function compareVersions(a: VersionNumber, b: VersionNumber): number {
  return versionOrdinal(a) - versionOrdinal(b);
}
