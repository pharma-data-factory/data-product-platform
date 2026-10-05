/**
 * The validation decision rule (NXD-119), as GAMP 5 and EU GMP Annex 11/15
 * put it: for a GMP-relevant product the validation expert signs and QA
 * approves; otherwise one signature from either suffices; a rejection by
 * either ends the decision.
 */

import {
  baselineNeedsGmpRule,
  isGmpRelevant,
  validationDecisionProgress,
} from './validation-integration';

const sig = (
  role: 'VALIDATION_EXPERT' | 'QUALITY_ASSURANCE',
  verdict: 'APPROVED' | 'REJECTED' = 'APPROVED',
) => ({ role, verdict });

describe('validationDecisionProgress', () => {
  it('GMP: the validation expert signs first, then QA, then it is approved', () => {
    expect(validationDecisionProgress(true, [])).toEqual({
      complete: false,
      nextRoles: ['VALIDATION_EXPERT'],
    });
    expect(
      validationDecisionProgress(true, [sig('VALIDATION_EXPERT')]),
    ).toEqual({ complete: false, nextRoles: ['QUALITY_ASSURANCE'] });
    expect(
      validationDecisionProgress(true, [
        sig('VALIDATION_EXPERT'),
        sig('QUALITY_ASSURANCE'),
      ]),
    ).toEqual({ complete: true, status: 'APPROVED', nextRoles: [] });
  });

  it('GMP: QA alone is not enough', () => {
    expect(
      validationDecisionProgress(true, [sig('QUALITY_ASSURANCE')]).complete,
    ).toBe(false);
  });

  it('not GMP: one signature from either role approves', () => {
    expect(validationDecisionProgress(false, []).nextRoles).toEqual([
      'VALIDATION_EXPERT',
      'QUALITY_ASSURANCE',
    ]);
    for (const role of ['VALIDATION_EXPERT', 'QUALITY_ASSURANCE'] as const) {
      expect(validationDecisionProgress(false, [sig(role)])).toEqual({
        complete: true,
        status: 'APPROVED',
        nextRoles: [],
      });
    }
  });

  it('a rejection by either role ends the decision', () => {
    expect(
      validationDecisionProgress(true, [
        sig('VALIDATION_EXPERT'),
        sig('QUALITY_ASSURANCE', 'REJECTED'),
      ]),
    ).toEqual({ complete: true, status: 'REJECTED', nextRoles: [] });
    expect(
      validationDecisionProgress(false, [sig('VALIDATION_EXPERT', 'REJECTED')])
        .status,
    ).toBe('REJECTED');
  });
});

describe('GMP classification', () => {
  it('only an explicit NONE is not GMP-relevant', () => {
    expect(isGmpRelevant('NONE')).toBe(false);
    expect(isGmpRelevant('INDIRECT')).toBe(true);
    expect(isGmpRelevant('DIRECT')).toBe(true);
    expect(isGmpRelevant(undefined)).toBe(true);
  });

  it('a baseline follows the GMP rule unless every known product is NONE', () => {
    expect(baselineNeedsGmpRule(undefined)).toBe(true);
    expect(baselineNeedsGmpRule([])).toBe(true);
    expect(baselineNeedsGmpRule([{ gxpRelevance: 'NONE' }])).toBe(false);
    expect(
      baselineNeedsGmpRule([{ gxpRelevance: 'NONE' }, { gxpRelevance: 'INDIRECT' }]),
    ).toBe(true);
  });
});
