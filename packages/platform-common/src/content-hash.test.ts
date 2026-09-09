import {
  canonicalizeContent,
  computeContentHash,
  HASHED_CONTENT_FIELDS,
  RequirementContent,
} from './content-hash';

const MINIMAL: RequirementContent = {
  title: 'Temperature monitoring',
  description: 'The system shall record temperature every 60 seconds.',
};

const FULL: RequirementContent = {
  title: 'Temperature monitoring',
  description: 'The system shall record temperature every 60 seconds.',
  rationale: 'Required for cold chain evidence.',
  category: 'FUNCTIONAL',
  acceptanceCriteria: 'A reading is stored at least once per minute.',
  gxpRelevance: 'DIRECT',
  riskClass: 'HIGH',
};

/**
 * Fixed vectors. These are not regenerated from the implementation: if a
 * change makes one of them fail, every stored hash and therefore every
 * signature in every database is invalidated, and that has to be a deliberate
 * migration rather than a snapshot update.
 */
describe('Known hashes', () => {
  test('empty content', () => {
    expect(computeContentHash({ title: '', description: '' })).toBe(
      '6694330878e875446ab4aeee8dd42d9f8429eb9fdd9ddc0fd10802bb83a7a9db',
    );
  });

  test('title and description only', () => {
    expect(computeContentHash(MINIMAL)).toBe(
      '2183c49556c263f12b25bbd22c51690f7a3ff2e0bf17b01ef0227d7d402cabe8',
    );
  });

  test('all fields populated', () => {
    expect(computeContentHash(FULL)).toBe(
      '90e6ccc9505ecc3051ef2814e6f793e74b7115a06a1dfed85f2eb982eb928b0a',
    );
  });
});

describe('Canonical form', () => {
  test('orders fields alphabetically regardless of input order', () => {
    const reordered: RequirementContent = {
      riskClass: FULL.riskClass,
      title: FULL.title,
      gxpRelevance: FULL.gxpRelevance,
      description: FULL.description,
      acceptanceCriteria: FULL.acceptanceCriteria,
      category: FULL.category,
      rationale: FULL.rationale,
    };

    expect(canonicalizeContent(reordered)).toBe(canonicalizeContent(FULL));
    expect(computeContentHash(reordered)).toBe(computeContentHash(FULL));
  });

  test('covers exactly the seven signed fields', () => {
    expect([...HASHED_CONTENT_FIELDS].sort()).toEqual([
      'acceptanceCriteria',
      'category',
      'description',
      'gxpRelevance',
      'rationale',
      'riskClass',
      'title',
    ]);
    expect(Object.keys(JSON.parse(canonicalizeContent(MINIMAL)))).toHaveLength(7);
  });

  test('treats absent, null and empty as the same value', () => {
    const absent = computeContentHash(MINIMAL);
    const asNull = computeContentHash({ ...MINIMAL, rationale: null });
    const asEmpty = computeContentHash({ ...MINIMAL, rationale: '' });

    expect(asNull).toBe(absent);
    expect(asEmpty).toBe(absent);
  });

  test('ignores unlisted properties', () => {
    const withExtra = { ...FULL, owner: 'someone', priority: 'MUST' } as RequirementContent;
    expect(computeContentHash(withExtra)).toBe(computeContentHash(FULL));
  });
});

describe('Sensitivity to change', () => {
  test.each(Object.keys(FULL) as (keyof RequirementContent)[])(
    'changing %s changes the hash',
    field => {
      const edited = { ...FULL, [field]: 'something else' };
      expect(computeContentHash(edited)).not.toBe(computeContentHash(FULL));
    },
  );

  test('notices a reclassification from INDIRECT to DIRECT', () => {
    const indirect = computeContentHash({ ...FULL, gxpRelevance: 'INDIRECT' });
    const direct = computeContentHash({ ...FULL, gxpRelevance: 'DIRECT' });

    expect(indirect).not.toBe(direct);
  });

  test('notices whitespace-only edits', () => {
    const padded = computeContentHash({ ...FULL, title: `${FULL.title} ` });
    expect(padded).not.toBe(computeContentHash(FULL));
  });

  test('is stable across repeated calls', () => {
    expect(computeContentHash(FULL)).toBe(computeContentHash({ ...FULL }));
  });
});
