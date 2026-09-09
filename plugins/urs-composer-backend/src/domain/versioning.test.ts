import { InputError } from '@backstage/errors';
import {
  compareVersions,
  firstVersion,
  formatLabel,
  nextDraft,
  parseLabel,
  releaseOf,
} from './versioning';

describe('Version label sequence', () => {
  test('the specification example runs 0.1 to 1.0 to 1.1-draft to 2.0', () => {
    const first = firstVersion();
    expect(first.label).toBe('0.1');

    const firstRelease = releaseOf(first);
    expect(firstRelease.label).toBe('1.0');
    expect(firstRelease.isDraft).toBe(false);

    const secondRound = nextDraft(firstRelease, true);
    expect(secondRound.label).toBe('1.1-draft');

    const secondRelease = releaseOf(secondRound);
    expect(secondRelease.label).toBe('2.0');
  });

  test('further draft rounds increment the minor', () => {
    const release = releaseOf(firstVersion());
    const round1 = nextDraft(release, true);
    const round2 = nextDraft(round1, false);
    const round3 = nextDraft(round2, false);

    expect([round1.label, round2.label, round3.label]).toEqual([
      '1.1-draft',
      '1.2-draft',
      '1.3-draft',
    ]);
  });

  test('a release always resets the minor to zero', () => {
    const draft = { major: 4, minor: 7 };
    expect(releaseOf(draft)).toMatchObject({
      major: 5,
      minor: 0,
      label: '5.0',
      isDraft: false,
    });
  });
});

describe('formatLabel', () => {
  test('suffixes drafts except the initial 0.1', () => {
    expect(formatLabel(0, 1, true)).toBe('0.1');
    expect(formatLabel(1, 1, true)).toBe('1.1-draft');
    expect(formatLabel(1, 0, false)).toBe('1.0');
  });
});

describe('parseLabel', () => {
  test('round-trips released and draft labels', () => {
    expect(parseLabel('2.0')).toMatchObject({
      major: 2,
      minor: 0,
      isDraft: false,
    });
    expect(parseLabel('1.3-draft')).toMatchObject({
      major: 1,
      minor: 3,
      isDraft: true,
    });
    expect(parseLabel('0.1')).toMatchObject({
      major: 0,
      minor: 1,
      isDraft: true,
    });
  });

  test('rejects malformed input', () => {
    expect(() => parseLabel('v1')).toThrow(InputError);
    expect(() => parseLabel('1.2.3')).toThrow(InputError);
    expect(() => parseLabel('')).toThrow(InputError);
  });
});

describe('compareVersions', () => {
  test('orders by major then minor', () => {
    expect(
      compareVersions({ major: 1, minor: 0 }, { major: 2, minor: 0 }),
    ).toBeLessThan(0);
    expect(
      compareVersions({ major: 2, minor: 0 }, { major: 1, minor: 9 }),
    ).toBeGreaterThan(0);
    expect(
      compareVersions({ major: 1, minor: 1 }, { major: 1, minor: 1 }),
    ).toBe(0);
  });

  test('does not confuse 1.10 with 1.9', () => {
    expect(
      compareVersions({ major: 1, minor: 10 }, { major: 1, minor: 9 }),
    ).toBeGreaterThan(0);
  });
});
