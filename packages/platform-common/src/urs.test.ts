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

  test('states carry a semantic tone, not a hardcoded colour', () => {
    // The domain names the meaning; the presentation layer owns the palette.
    // Returning a hex here would put brand colours in the domain layer and
    // would not follow the light/dark theme.
    const toneOf = (s: URSStatus) => ursStatusAppearance(s).tone;

    expect(toneOf(URSStatus.DRAFT)).toBe('neutral');
    expect(toneOf(URSStatus.IN_REVIEW)).toBe('active');
    expect(toneOf(URSStatus.IN_APPROVAL)).toBe('active');
    expect(toneOf(URSStatus.REVIEWED)).toBe('success');
    expect(toneOf(URSStatus.APPROVED)).toBe('success');
    expect(toneOf(URSStatus.BASELINED)).toBe('success');
    expect(toneOf(URSStatus.REJECTED)).toBe('danger');
  });

  test('every status has a tone, including closed-out ones', () => {
    for (const status of Object.values(URSStatus)) {
      expect(ursStatusAppearance(status).tone).toBeDefined();
    }
    // An unknown value must degrade to neutral rather than render blank.
    expect(ursStatusAppearance('NOT_A_STATUS').tone).toBe('neutral');
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
      tone: 'neutral',
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
