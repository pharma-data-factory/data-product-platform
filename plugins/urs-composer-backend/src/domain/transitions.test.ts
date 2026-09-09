import { ConflictError } from '@backstage/errors';
import { URSStatus } from '../types';
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  isTerminal,
} from './transitions';

describe('Requirement version transitions', () => {
  test('walks the full review and approval path', () => {
    const path: URSStatus[] = [
      URSStatus.DRAFT,
      URSStatus.IN_REVIEW,
      URSStatus.REVIEWED,
      URSStatus.IN_APPROVAL,
      URSStatus.APPROVED,
    ];

    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition('version', path[i], path[i + 1])).toBe(true);
    }
  });

  test('cannot skip review on the way to approval', () => {
    expect(canTransition('version', URSStatus.DRAFT, URSStatus.APPROVED)).toBe(
      false,
    );
    expect(
      canTransition('version', URSStatus.IN_REVIEW, URSStatus.IN_APPROVAL),
    ).toBe(false);
  });

  test('rejection is reachable from review and approval only', () => {
    expect(
      canTransition('version', URSStatus.IN_REVIEW, URSStatus.REJECTED),
    ).toBe(true);
    expect(
      canTransition('version', URSStatus.IN_APPROVAL, URSStatus.REJECTED),
    ).toBe(true);
    expect(canTransition('version', URSStatus.DRAFT, URSStatus.REJECTED)).toBe(
      false,
    );
  });

  test('an approved version can be superseded or made obsolete', () => {
    expect(allowedTransitions('version', URSStatus.APPROVED)).toEqual(
      expect.arrayContaining([URSStatus.SUPERSEDED, URSStatus.OBSOLETE]),
    );
  });

  test('rejected, superseded and obsolete are end states', () => {
    expect(isTerminal('version', URSStatus.REJECTED)).toBe(true);
    expect(isTerminal('version', URSStatus.SUPERSEDED)).toBe(true);
    expect(isTerminal('version', URSStatus.OBSOLETE)).toBe(true);
  });
});

describe('Baseline transitions', () => {
  test('walks draft to approved', () => {
    expect(canTransition('baseline', URSStatus.DRAFT, URSStatus.IN_REVIEW)).toBe(
      true,
    );
    expect(
      canTransition('baseline', URSStatus.IN_REVIEW, URSStatus.IN_APPROVAL),
    ).toBe(true);
    expect(
      canTransition('baseline', URSStatus.IN_APPROVAL, URSStatus.APPROVED),
    ).toBe(true);
  });

  test('an approved baseline can only be superseded', () => {
    expect(allowedTransitions('baseline', URSStatus.APPROVED)).toEqual([
      URSStatus.SUPERSEDED,
    ]);
  });

  test('baselines never enter the version-only states', () => {
    expect(canTransition('baseline', URSStatus.DRAFT, URSStatus.REVIEWED)).toBe(
      false,
    );
    expect(
      canTransition('baseline', URSStatus.APPROVED, URSStatus.OBSOLETE),
    ).toBe(false);
  });
});

describe('assertTransition', () => {
  test('passes a legal move', () => {
    expect(() =>
      assertTransition('version', URSStatus.DRAFT, URSStatus.IN_REVIEW),
    ).not.toThrow();
  });

  test('throws ConflictError and names the allowed targets', () => {
    expect(() =>
      assertTransition('version', URSStatus.DRAFT, URSStatus.APPROVED),
    ).toThrow(ConflictError);

    expect(() =>
      assertTransition('version', URSStatus.DRAFT, URSStatus.APPROVED),
    ).toThrow(/Allowed from DRAFT: IN_REVIEW/);
  });

  test('says so when the source is an end state', () => {
    expect(() =>
      assertTransition('version', URSStatus.REJECTED, URSStatus.DRAFT),
    ).toThrow(/REJECTED is an end state/);
  });

  test('includes the caller-supplied context', () => {
    expect(() =>
      assertTransition(
        'baseline',
        URSStatus.APPROVED,
        URSStatus.DRAFT,
        'baseline-001',
      ),
    ).toThrow(/Baseline baseline-001 cannot move/);
  });
});
