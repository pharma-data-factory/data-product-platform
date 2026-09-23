/**
 * Release provenance rules (Phase 5 closure, Slice 3).
 *
 * These two functions decide whether a controlled record may claim to identify
 * a build, so they are tested directly rather than only through the gate.
 */

import {
  isSameProvenance,
  validateReleaseProvenance,
} from './product';

const SHA1 = 'a'.repeat(40);
const SHA256 = 'b'.repeat(64);
const DIGEST = `sha256:${'c'.repeat(64)}`;

describe('validateReleaseProvenance', () => {
  it('accepts a 40-hex git SHA with an OCI digest', () => {
    expect(
      validateReleaseProvenance({
        releaseCommitSha: SHA1,
        artifactDigest: DIGEST,
      }),
    ).toEqual([]);
  });

  it('accepts a 64-hex commit SHA, for repositories that moved to SHA-256', () => {
    expect(
      validateReleaseProvenance({
        releaseCommitSha: SHA256,
        artifactDigest: DIGEST,
      }),
    ).toEqual([]);
  });

  it('rejects an abbreviated SHA', () => {
    // The point of the record is that it resolves back to one commit years
    // later. A 7-character prefix stops being unique as a repository grows.
    const issues = validateReleaseProvenance({
      releaseCommitSha: 'a1b2c3d',
      artifactDigest: DIGEST,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/not a full commit SHA/);
  });

  it('rejects a digest that is not an OCI content digest', () => {
    const issues = validateReleaseProvenance({
      releaseCommitSha: SHA1,
      artifactDigest: 'mvp-1.0',
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/not an OCI content digest/);
  });

  it('rejects a digest with the right prefix and the wrong length', () => {
    expect(
      validateReleaseProvenance({
        releaseCommitSha: SHA1,
        artifactDigest: 'sha256:deadbeef',
      }),
    ).toHaveLength(1);
  });

  it('requires both halves — a digest with no commit identifies nothing', () => {
    expect(
      validateReleaseProvenance({ artifactDigest: DIGEST }),
    ).toEqual(['releaseCommitSha is required']);
    expect(
      validateReleaseProvenance({ releaseCommitSha: SHA1 }),
    ).toEqual(['artifactDigest is required']);
  });

  it('reports both problems at once rather than one at a time', () => {
    expect(validateReleaseProvenance({})).toEqual([
      'releaseCommitSha is required',
      'artifactDigest is required',
    ]);
  });

  it('ignores surrounding whitespace and is case-insensitive about hex', () => {
    expect(
      validateReleaseProvenance({
        releaseCommitSha: `  ${SHA1.toUpperCase()}  `,
        artifactDigest: `  ${DIGEST.toUpperCase()}  `,
      }),
    ).toEqual([]);
  });

  it('rejects a non-string value rather than coercing it', () => {
    expect(
      validateReleaseProvenance({ releaseCommitSha: 12345, artifactDigest: null }),
    ).toHaveLength(2);
  });
});

describe('isSameProvenance', () => {
  const base = { releaseCommitSha: SHA1, artifactDigest: DIGEST };

  it('treats a re-run of the same build as the same claim', () => {
    expect(isSameProvenance(base, { ...base })).toBe(true);
  });

  it('ignores case, because the values are hex either way', () => {
    expect(
      isSameProvenance(base, {
        releaseCommitSha: SHA1.toUpperCase(),
        artifactDigest: DIGEST.toUpperCase(),
      }),
    ).toBe(true);
  });

  it('a different commit is a different claim', () => {
    expect(
      isSameProvenance(base, { ...base, releaseCommitSha: 'd'.repeat(40) }),
    ).toBe(false);
  });

  it('a different digest is a different claim even at the same commit', () => {
    // The same source can produce two images. Only one of them was validated.
    expect(
      isSameProvenance(base, {
        ...base,
        artifactDigest: `sha256:${'e'.repeat(64)}`,
      }),
    ).toBe(false);
  });
});
