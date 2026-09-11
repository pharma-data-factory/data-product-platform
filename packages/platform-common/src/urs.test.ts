import {
  OPEN_URS_STATUSES,
  RELEASED_URS_STATUSES,
  URSStatus,
  URS_STATUS_LABELS,
  ursStatusAppearance,
} from './urs';

describe('Status presentation', () => {
  test('every status has wording of its own', () => {
    const labels = Object.values(URSStatus).map(s => URS_STATUS_LABELS[s]);

    expect(labels.filter(Boolean)).toHaveLength(Object.values(URSStatus).length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test('the released state reads as released, not approved', () => {
    // The enum still says APPROVED for compatibility; users should not have to
    // know that.
    expect(ursStatusAppearance(URSStatus.APPROVED).label).toBe('Released');
  });

  test('states follow the colours the specification names', () => {
    const colorOf = (s: URSStatus) => ursStatusAppearance(s).color;

    expect(colorOf(URSStatus.DRAFT)).toBe('#9e9e9e');
    expect(colorOf(URSStatus.IN_REVIEW)).toBe('#1976d2');
    expect(colorOf(URSStatus.REVIEWED)).toBe('#00897b');
    expect(colorOf(URSStatus.IN_APPROVAL)).toBe('#7b1fa2');
    expect(colorOf(URSStatus.APPROVED)).toBe('#2e7d32');
    expect(colorOf(URSStatus.REJECTED)).toBe('#c62828');
  });

  test('closed-out states are struck through, live ones are not', () => {
    for (const status of [
      URSStatus.SUPERSEDED,
      URSStatus.OBSOLETE,
      URSStatus.RETIRED,
    ]) {
      expect(ursStatusAppearance(status).strikeThrough).toBe(true);
    }

    for (const status of [
      URSStatus.DRAFT,
      URSStatus.IN_REVIEW,
      URSStatus.APPROVED,
      URSStatus.REJECTED,
    ]) {
      expect(ursStatusAppearance(status).strikeThrough).toBe(false);
    }
  });

  test('an unrecognised status still shows its own name', () => {
    expect(ursStatusAppearance('SOMETHING_NEW')).toEqual({
      label: 'SOMETHING_NEW',
      color: '#9e9e9e',
      strikeThrough: false,
    });
  });
});

describe('Status groupings', () => {
  test('open and released statuses do not overlap', () => {
    const overlap = OPEN_URS_STATUSES.filter(s =>
      RELEASED_URS_STATUSES.includes(s),
    );

    expect(overlap).toEqual([]);
  });

  test('a version being worked on is open, a released one is not', () => {
    expect(OPEN_URS_STATUSES).toContain(URSStatus.DRAFT);
    expect(OPEN_URS_STATUSES).toContain(URSStatus.IN_APPROVAL);
    expect(OPEN_URS_STATUSES).not.toContain(URSStatus.APPROVED);
    expect(RELEASED_URS_STATUSES).toContain(URSStatus.APPROVED);
  });
});
