import { justificationProblem } from './signatureJustification';

describe('justificationProblem (NXD-160)', () => {
  it('refuses an empty or one-word justification, naming what is needed', () => {
    expect(justificationProblem('  ')).toBe('A justification is required.');
    expect(justificationProblem(undefined)).toBe(
      'A justification is required.',
    );
    for (const token of ['freigabe', 'ok', 'Release', 'approved.', 'a b']) {
      expect(justificationProblem(token)).toMatch(
        /at least two words and 10 characters/,
      );
    }
  });

  it('accepts a reason in words', () => {
    for (const reason of [
      'IQ/OQ passed',
      'Gate green.',
      'Evidence review 5/5 from CI.',
    ]) {
      expect(justificationProblem(reason)).toBeUndefined();
    }
  });
});
