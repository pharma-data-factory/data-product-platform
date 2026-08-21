import {
  GOLDEN_PATH_LIFECYCLE_STATES,
  LIFECYCLE_TRANSITIONS,
  OFFICIAL_GOLDEN_PATHS,
  applyReleaseOverrides,
  canApproveGoldenPathRelease,
  canCreateFromRelease,
  canCreateOfficialGoldenPath,
  canProposeGoldenPathRelease,
  canReviewGoldenPathCertification,
  canTransitionLifecycle,
  currentRelease,
  currentReleasedVersion,
  distributionLabel,
  distributionStatusLines,
  evaluateTemplateReleaseUpgrade,
  filterReleaseCatalogRows,
  isGenerallyAvailableRelease,
  isOfficialGoldenPath,
  loadGoldenPathReleases,
  releaseCatalogRows,
  validateGoldenPathRelease,
  validateGoldenPathReleaseCatalog,
  visibleDistribution,
} from './releases';
import type { GoldenPathRelease } from './releases';

function fixture(overrides: Partial<GoldenPathRelease> = {}): GoldenPathRelease {
  return {
    template: 'mqtt-temperature-data-product',
    name: 'MQTT Temperature Data Product',
    version: '1.0.0',
    status: 'RELEASED',
    certification: { status: 'CERTIFIED', standard: '1.0.x', sdk: '1.x' },
    distribution: ['INTERNAL', 'TEMPLATE_EDITION'],
    release: { date: '2026-08', notes: 'docs/releases/mqtt-temperature-1.0.0.md' },
    changelog: {
      breaking: [],
      capabilities: ['MQTT'],
      fixes: [],
      migration: 'None',
    },
    ...overrides,
  };
}

describe('Golden Path release model', () => {
  it('keeps CERTIFIED and RELEASED as distinct states', () => {
    expect(GOLDEN_PATH_LIFECYCLE_STATES).toEqual([
      'DRAFT',
      'TESTING',
      'CERTIFIED',
      'RELEASED',
      'DEPRECATED',
      'RETIRED',
    ]);
    expect(LIFECYCLE_TRANSITIONS.CERTIFIED).toEqual(['RELEASED']);
    expect(LIFECYCLE_TRANSITIONS.RELEASED).toEqual(['DEPRECATED']);
    const certified = fixture({ status: 'CERTIFIED', version: '1.1.0' });
    expect(isGenerallyAvailableRelease(certified)).toBe(false);
    expect(validateGoldenPathRelease(certified)).toEqual([]);
    expect(
      validateGoldenPathRelease(
        fixture({
          status: 'RELEASED',
          certification: { status: 'TESTED', standard: '1.0.x', sdk: '1.x' },
        }),
      ).map(issue => issue.message),
    ).toEqual(
      expect.arrayContaining([
        'RELEASED requires certification.status CERTIFIED',
        'RELEASED is not a substitute for CERTIFIED',
      ]),
    );
  });

  it('validates the version-controlled official release catalog', () => {
    const releases = loadGoldenPathReleases();
    expect(validateGoldenPathReleaseCatalog({ releases })).toEqual([]);
    expect(releases.map(release => release.template).sort()).toEqual([
      ...OFFICIAL_GOLDEN_PATHS,
    ].sort());
    expect(currentReleasedVersion('mqtt-temperature-data-product')).toBe('1.0.0');
    expect(currentReleasedVersion('rest-equipment-data-product')).toBe('1.0.0');
    expect(currentReleasedVersion('oee-data-product')).toBe('1.0.0');
    expect(currentRelease('mqtt-temperature-data-product')?.status).toBe('RELEASED');
    expect(currentRelease('mqtt-temperature-data-product')?.certification.status).toBe(
      'CERTIFIED',
    );
  });

  it('resolves the current RELEASED version independently of older lines', () => {
    const releases = [
      fixture({ version: '1.0.0', status: 'DEPRECATED', deprecation: {
        replacementVersion: '1.2.0',
        deprecationDate: '2026-08',
        supportUntil: '2027-02',
        migrationGuide: 'docs/engineering/upgrade-guide.md',
      }}),
      fixture({ version: '1.2.0', status: 'RELEASED' }),
    ];
    expect(currentReleasedVersion('mqtt-temperature-data-product', releases)).toBe(
      '1.2.0',
    );
    expect(
      evaluateTemplateReleaseUpgrade('1.0.0', currentReleasedVersion(
        'mqtt-temperature-data-product',
        releases,
      )),
    ).toBe('UPDATE_AVAILABLE');
  });

  it('allows Developer to propose, Owner to review, and Admin to approve', () => {
    expect(canProposeGoldenPathRelease('DEVELOPER')).toBe(true);
    expect(canApproveGoldenPathRelease('DEVELOPER')).toBe(false);
    expect(canTransitionLifecycle('DRAFT', 'TESTING', 'DEVELOPER')).toBe(true);
    expect(canTransitionLifecycle('TESTING', 'CERTIFIED', 'DEVELOPER')).toBe(false);
    expect(canReviewGoldenPathCertification('DATA_PRODUCT_OWNER')).toBe(true);
    expect(canTransitionLifecycle('TESTING', 'CERTIFIED', 'DATA_PRODUCT_OWNER')).toBe(
      true,
    );
    expect(canTransitionLifecycle('CERTIFIED', 'RELEASED', 'DATA_PRODUCT_OWNER')).toBe(
      false,
    );
    expect(canApproveGoldenPathRelease('PLATFORM_ADMIN')).toBe(true);
    expect(canTransitionLifecycle('CERTIFIED', 'RELEASED', 'PLATFORM_ADMIN')).toBe(
      true,
    );
    expect(canTransitionLifecycle('RELEASED', 'CERTIFIED', 'PLATFORM_ADMIN')).toBe(
      false,
    );
  });

  it('lets Developers create from RELEASED official paths only', () => {
    expect(canCreateOfficialGoldenPath('DEVELOPER', 'mqtt-temperature-data-product')).toBe(
      true,
    );
    expect(canCreateOfficialGoldenPath('DEVELOPER', 'python-microservice')).toBe(true);
    expect(
      canCreateFromRelease(
        'DEVELOPER',
        fixture({ status: 'DRAFT', certification: { status: 'DEVELOPMENT', standard: '1.0.x', sdk: '1.x' } }),
      ),
    ).toBe(false);
    expect(canCreateFromRelease('DEVELOPER', fixture({ status: 'TESTING', certification: { status: 'TESTED', standard: '1.0.x', sdk: '1.x' } }))).toBe(
      false,
    );
    expect(canCreateFromRelease('DEVELOPER', fixture({ status: 'CERTIFIED' }))).toBe(
      false,
    );
    expect(canCreateFromRelease('DEVELOPER', fixture({ status: 'DEPRECATED', deprecation: {
      replacementVersion: '1.1.0',
      deprecationDate: '2026-08',
      supportUntil: '2027-02',
      migrationGuide: 'docs/engineering/upgrade-guide.md',
    } }))).toBe(false);
    expect(canCreateFromRelease('DEVELOPER', fixture({ status: 'RETIRED' }))).toBe(false);
    expect(
      canCreateFromRelease(
        'PLATFORM_ADMIN',
        fixture({ status: 'TESTING', certification: { status: 'TESTED', standard: '1.0.x', sdk: '1.x' } }),
      ),
    ).toBe(true);
    expect(canCreateFromRelease('PLATFORM_ADMIN', fixture({ status: 'RETIRED' }))).toBe(
      false,
    );
  });

  it('does not present Platform Edition or SaaS as available distribution', () => {
    expect(visibleDistribution(['INTERNAL', 'TEMPLATE_EDITION', 'PLATFORM_EDITION', 'SAAS'])).toEqual([
      'INTERNAL',
      'TEMPLATE_EDITION',
    ]);
    expect(distributionLabel('INTERNAL')).toBe('Internal');
    expect(distributionLabel('TEMPLATE_EDITION')).toBe('Template Edition');
    expect(
      distributionStatusLines(['INTERNAL', 'TEMPLATE_EDITION']).map(row => [
        row.label,
        row.availability,
        row.offered,
      ]),
    ).toEqual([
      ['Internal', 'AVAILABLE', true],
      ['Template Edition', 'AVAILABLE FOR PILOT', true],
      ['Platform Edition', 'PLANNED', false],
      ['SaaS', 'FUTURE', false],
    ]);
  });

  it('keeps deprecated releases visible and retires them from Create', () => {
    const deprecated = fixture({
      status: 'DEPRECATED',
      deprecation: {
        replacementVersion: '1.1.0',
        deprecationDate: '2026-08',
        supportUntil: '2027-02',
        migrationGuide: 'docs/engineering/upgrade-guide.md',
      },
    });
    const rows = releaseCatalogRows([
      deprecated,
      fixture({ version: '1.1.0', status: 'RELEASED' }),
    ]);
    expect(filterReleaseCatalogRows(rows, 'Deprecated')).toHaveLength(1);
    expect(isOfficialGoldenPath('mqtt-temperature-data-product')).toBe(true);
    expect(applyReleaseOverrides([deprecated], {
      'mqtt-temperature-data-product@1.0.0': { status: 'RETIRED' },
    })[0].status).toBe('RETIRED');
  });
});
