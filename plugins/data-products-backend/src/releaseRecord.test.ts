/**
 * Finding the GitHub Release of a Nexora version and reading its record
 * (NXD-133). Shape only; the Composer decides whether a record is admissible.
 */

import {
  findReleaseForVersion,
  MAX_RECORD_BYTES,
  parseReleaseRecord,
} from './releaseRecord';
import type { GithubRelease } from './types';

const release = (
  tag: string,
  extra: Partial<GithubRelease> = {},
): GithubRelease => ({
  tag,
  url: `https://github.com/o/r/releases/tag/${tag}`,
  draft: false,
  prerelease: false,
  assets: [],
  ...extra,
});

describe('findReleaseForVersion', () => {
  it('finds v1.0.0 for the Composer version 1.0, and the reverse', () => {
    expect(
      findReleaseForVersion([release('v1.1.0'), release('v1.0.0')], '1.0'),
    ).toEqual({
      found: true,
      release: release('v1.0.0'),
    });
    expect(findReleaseForVersion([release('v1.0')], '1.0.0')).toMatchObject({
      found: true,
    });
  });

  it('does not count drafts, pre-releases or tags without the v', () => {
    expect(
      findReleaseForVersion(
        [
          release('v1.0.0', { draft: true }),
          release('v1.0.0', { prerelease: true }),
          release('1.0.0'),
        ],
        '1.0',
      ),
    ).toEqual({ found: false, reason: 'no-release' });
  });

  it('refuses to choose between two releases of one version', () => {
    expect(
      findReleaseForVersion([release('v1.0'), release('v1.0.0')], '1.0'),
    ).toEqual({
      found: false,
      reason: 'ambiguous-release',
      tags: ['v1.0', 'v1.0.0'],
    });
  });
});

describe('parseReleaseRecord', () => {
  const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));

  it('reads a ReleaseRecord', () => {
    const record = {
      apiVersion: 'nexora.dev/v1alpha1',
      kind: 'ReleaseRecord',
      version: '1.0.0',
    };
    expect(parseReleaseRecord(bytes(record))).toEqual({ ok: true, record });
  });

  it.each([
    ['not JSON', Buffer.from('{nope'), 'not JSON'],
    ['an array', bytes([1]), 'not a JSON object'],
    [
      'another kind',
      bytes({ apiVersion: 'nexora.dev/v1alpha1', kind: 'Other' }),
      'not a ReleaseRecord',
    ],
    ['oversized', Buffer.alloc(MAX_RECORD_BYTES + 1, 32), 'larger than'],
  ])('refuses %s', (_label, input, problem) => {
    const parsed = parseReleaseRecord(input as Buffer);
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.problem).toContain(problem);
  });
});
