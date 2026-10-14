/**
 * The release record a Golden Path's release workflow publishes (NXD-133;
 * written by NXD-132): `nexora-release.json`, an asset on the GitHub Release
 * for the version's tag.
 *
 * This module finds the release that belongs to a Nexora version and reads
 * the record. It judges shape only — that the bytes are a bounded JSON object
 * of the right kind. Whether the record may be written to a baseline is the
 * Product Composer's decision, which checks it against the version, the tag
 * and the commit the tag points at.
 */

import { versionLabelsEquivalent } from '@internal/platform-common';
import type { GithubRelease } from './types';

export const RELEASE_RECORD_ASSET = 'nexora-release.json';
const RECORD_API_VERSION = 'nexora.dev/v1alpha1';
const RECORD_KIND = 'ReleaseRecord';

/** A record is a few hundred bytes; anything far larger is not one. */
export const MAX_RECORD_BYTES = 64 * 1024;

/** NXD-137. The manifest of the release, read at the tagged commit. */
export const RELEASE_MANIFEST_PATH = 'nexora.yaml';
export const MAX_MANIFEST_BYTES = 256 * 1024;

export type ReleaseLookup =
  | { found: true; release: GithubRelease }
  | {
      found: false;
      reason: 'no-release' | 'ambiguous-release';
      tags?: string[];
    };

/**
 * The published release whose tag is `v` + a label equivalent to `version`.
 *
 * Drafts and pre-releases are not builds of a version: the release workflow
 * creates neither, and a draft has no tag anyone can verify. Two published
 * releases that both match — `v1.0` and `v1.0.0` — are refused rather than
 * chosen between, because picking one would decide which build a controlled
 * record describes.
 */
export function findReleaseForVersion(
  releases: GithubRelease[],
  version: string,
): ReleaseLookup {
  const matching = releases.filter(
    release =>
      !release.draft &&
      !release.prerelease &&
      release.tag.startsWith('v') &&
      versionLabelsEquivalent(release.tag.slice(1), version),
  );
  if (matching.length === 0) {
    return { found: false, reason: 'no-release' };
  }
  if (matching.length > 1) {
    return {
      found: false,
      reason: 'ambiguous-release',
      tags: matching.map(release => release.tag),
    };
  }
  return { found: true, release: matching[0] };
}

/** The record's object, or why the bytes are not one. */
export function parseReleaseRecord(
  bytes: Buffer,
):
  | { ok: true; record: Record<string, unknown> }
  | { ok: false; problem: string } {
  if (bytes.length > MAX_RECORD_BYTES) {
    return { ok: false, problem: `larger than ${MAX_RECORD_BYTES} bytes` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    return { ok: false, problem: 'not JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, problem: 'not a JSON object' };
  }
  const record = parsed as Record<string, unknown>;
  if (record.apiVersion !== RECORD_API_VERSION || record.kind !== RECORD_KIND) {
    return {
      ok: false,
      problem: `not a ${RECORD_KIND} of ${RECORD_API_VERSION}`,
    };
  }
  return { ok: true, record };
}
