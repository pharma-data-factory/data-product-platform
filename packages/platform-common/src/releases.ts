import type { PlatformRole } from './roles';
import { isAtLeast } from './roles';
import catalog from './golden-path-releases.json';

export const GOLDEN_PATH_LIFECYCLE_STATES = [
  'DRAFT',
  'TESTING',
  'CERTIFIED',
  'RELEASED',
  'DEPRECATED',
  'RETIRED',
] as const;

export type GoldenPathLifecycle = (typeof GOLDEN_PATH_LIFECYCLE_STATES)[number];

export const GOLDEN_PATH_CERTIFICATION_STATUSES = [
  'DEVELOPMENT',
  'TESTED',
  'CERTIFIED',
] as const;

export type GoldenPathCertificationStatus =
  (typeof GOLDEN_PATH_CERTIFICATION_STATUSES)[number];

export const DISTRIBUTION_CHANNELS = [
  'INTERNAL',
  'TEMPLATE_EDITION',
  'PLATFORM_EDITION',
  'SAAS',
] as const;

export type DistributionChannel = (typeof DISTRIBUTION_CHANNELS)[number];

export type DistributionAvailability =
  | 'AVAILABLE'
  | 'AVAILABLE FOR PILOT'
  | 'PLANNED'
  | 'FUTURE';

export const DISTRIBUTION_AVAILABILITY: Record<
  DistributionChannel,
  DistributionAvailability
> = {
  INTERNAL: 'AVAILABLE',
  TEMPLATE_EDITION: 'AVAILABLE FOR PILOT',
  PLATFORM_EDITION: 'PLANNED',
  SAAS: 'FUTURE',
};

export const AVAILABLE_DISTRIBUTION_CHANNELS: readonly DistributionChannel[] = [
  'INTERNAL',
  'TEMPLATE_EDITION',
];

export const OFFICIAL_GOLDEN_PATHS = [
  'aas-data-product',
  'mqtt-temperature-data-product',
  'rest-equipment-data-product',
  'oee-data-product',
] as const;

export type OfficialGoldenPathId = (typeof OFFICIAL_GOLDEN_PATHS)[number];

export const RELEASE_CATALOG_PATH = '/releases';

export const LIFECYCLE_TRANSITIONS: Record<
  GoldenPathLifecycle,
  readonly GoldenPathLifecycle[]
> = {
  DRAFT: ['TESTING'],
  TESTING: ['CERTIFIED'],
  CERTIFIED: ['RELEASED'],
  RELEASED: ['DEPRECATED'],
  DEPRECATED: ['RETIRED'],
  RETIRED: [],
};

export interface GoldenPathChangelog {
  breaking: readonly string[];
  capabilities: readonly string[];
  fixes: readonly string[];
  migration: string;
}

export interface GoldenPathDeprecation {
  replacementVersion?: string;
  deprecationDate?: string;
  supportUntil?: string;
  migrationGuide?: string;
}

export interface GoldenPathRelease {
  template: string;
  name: string;
  version: string;
  status: GoldenPathLifecycle;
  certification: {
    status: GoldenPathCertificationStatus;
    standard: string;
    sdk: string;
  };
  distribution: readonly DistributionChannel[];
  release: {
    date: string;
    notes: string;
  };
  changelog: GoldenPathChangelog;
  deprecation?: GoldenPathDeprecation;
}

export interface GoldenPathReleaseCatalog {
  releases: GoldenPathRelease[];
}

export interface ReleaseValidationIssue {
  path: string;
  message: string;
}

const SEMVER = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;

export function isOfficialGoldenPath(templateId: string): boolean {
  return (OFFICIAL_GOLDEN_PATHS as readonly string[]).includes(templateId);
}

export function isGoldenPathLifecycle(value: string): value is GoldenPathLifecycle {
  return (GOLDEN_PATH_LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function parseSemverParts(
  version: string,
): { major: number; minor: number; patch: number } | undefined {
  const match = SEMVER.exec(version.trim());
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareReleaseVersions(left: string, right: string): number | undefined {
  const parsedLeft = parseSemverParts(left);
  const parsedRight = parseSemverParts(right);
  if (!parsedLeft || !parsedRight) {
    return undefined;
  }
  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major - parsedRight.major;
  }
  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor - parsedRight.minor;
  }
  return parsedLeft.patch - parsedRight.patch;
}

export function validateGoldenPathRelease(
  release: GoldenPathRelease,
): ReleaseValidationIssue[] {
  const issues: ReleaseValidationIssue[] = [];
  const prefix = `${release.template}@${release.version}`;
  if (!release.template) {
    issues.push({ path: prefix, message: 'template is required' });
  }
  if (!parseSemverParts(release.version)) {
    issues.push({ path: prefix, message: 'version must be SemVer MAJOR.MINOR.PATCH' });
  }
  if (!isGoldenPathLifecycle(release.status)) {
    issues.push({ path: prefix, message: `unknown lifecycle ${release.status}` });
  }
  if (
    (release.status === 'CERTIFIED' ||
      release.status === 'RELEASED' ||
      release.status === 'DEPRECATED') &&
    release.certification.status !== 'CERTIFIED'
  ) {
    issues.push({
      path: prefix,
      message: `${release.status} requires certification.status CERTIFIED`,
    });
  }
  if (release.status === 'RELEASED' && release.certification.status !== 'CERTIFIED') {
    issues.push({
      path: prefix,
      message: 'RELEASED is not a substitute for CERTIFIED',
    });
  }
  for (const channel of release.distribution) {
    if (!(DISTRIBUTION_CHANNELS as readonly string[]).includes(channel)) {
      issues.push({ path: prefix, message: `unknown distribution ${channel}` });
    }
  }
  if (release.status === 'DEPRECATED' && !release.deprecation) {
    issues.push({
      path: prefix,
      message: 'DEPRECATED releases require deprecation metadata',
    });
  }
  if (!release.release?.notes) {
    issues.push({ path: prefix, message: 'release notes path is required' });
  }
  return issues;
}

export function validateGoldenPathReleaseCatalog(
  document: GoldenPathReleaseCatalog,
): ReleaseValidationIssue[] {
  const issues: ReleaseValidationIssue[] = [];
  const seen = new Set<string>();
  for (const release of document.releases) {
    const key = `${release.template}@${release.version}`;
    if (seen.has(key)) {
      issues.push({ path: key, message: 'duplicate template version' });
    }
    seen.add(key);
    issues.push(...validateGoldenPathRelease(release));
  }
  return issues;
}

export function loadGoldenPathReleaseCatalog(): GoldenPathReleaseCatalog {
  return catalog as GoldenPathReleaseCatalog;
}

export function loadGoldenPathReleases(
  document = loadGoldenPathReleaseCatalog(),
): GoldenPathRelease[] {
  const issues = validateGoldenPathReleaseCatalog(document);
  if (issues.length > 0) {
    throw new Error(issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
  }
  return document.releases.map(release => ({ ...release }));
}

export function applyReleaseOverrides(
  releases: readonly GoldenPathRelease[],
  overrides: Record<string, Partial<Pick<GoldenPathRelease, 'status' | 'deprecation'>>>,
): GoldenPathRelease[] {
  return releases.map(release => {
    const override = overrides[releaseKey(release.template, release.version)];
    if (!override) {
      return { ...release };
    }
    return {
      ...release,
      ...override,
      deprecation: override.deprecation ?? release.deprecation,
    };
  });
}

export function releaseKey(template: string, version: string): string {
  return `${template}@${version}`;
}

export function releasesForTemplate(
  template: string,
  releases: readonly GoldenPathRelease[] = loadGoldenPathReleases(),
): GoldenPathRelease[] {
  return [...releases]
    .filter(release => release.template === template)
    .sort((left, right) => (compareReleaseVersions(right.version, left.version) ?? 0));
}

export function currentRelease(
  template: string,
  releases: readonly GoldenPathRelease[] = loadGoldenPathReleases(),
): GoldenPathRelease | undefined {
  const versions = releasesForTemplate(template, releases);
  return (
    versions.find(release => release.status === 'RELEASED') ??
    versions.find(release => release.status === 'DEPRECATED') ??
    versions[0]
  );
}

export function currentReleasedVersion(
  template: string,
  releases: readonly GoldenPathRelease[] = loadGoldenPathReleases(),
): string | undefined {
  return releasesForTemplate(template, releases).find(
    release => release.status === 'RELEASED',
  )?.version;
}

export function isGenerallyAvailableRelease(release?: GoldenPathRelease): boolean {
  return release?.status === 'RELEASED';
}

export function isRetiredRelease(release?: GoldenPathRelease): boolean {
  return release?.status === 'RETIRED';
}

export function canCreateFromRelease(
  role: PlatformRole,
  release?: GoldenPathRelease,
): boolean {
  if (!release) {
    return isAtLeast(role, 'PLATFORM_ADMIN');
  }
  if (release.status === 'RETIRED') {
    return false;
  }
  if (release.status === 'RELEASED') {
    return isAtLeast(role, 'DEVELOPER');
  }
  return isAtLeast(role, 'PLATFORM_ADMIN');
}

export function canCreateOfficialGoldenPath(
  role: PlatformRole,
  templateId: string,
  releases: readonly GoldenPathRelease[] = loadGoldenPathReleases(),
): boolean {
  if (!isOfficialGoldenPath(templateId)) {
    return isAtLeast(role, 'DEVELOPER');
  }
  return canCreateFromRelease(role, currentRelease(templateId, releases));
}

export function templateIdFromResourceRef(resourceRef?: string): string | undefined {
  if (!resourceRef) {
    return undefined;
  }
  const trimmed = resourceRef.trim();
  if (trimmed.includes('/')) {
    return trimmed.split('/').pop();
  }
  return trimmed;
}

export function isScaffolderTemplatePermission(name: string): boolean {
  return (
    name === 'scaffolder.template.parameter.read' ||
    name === 'scaffolder.template.step.read'
  );
}

export function canProposeGoldenPathRelease(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canReviewGoldenPathCertification(role: PlatformRole): boolean {
  return isAtLeast(role, 'DATA_PRODUCT_OWNER');
}

export function canApproveGoldenPathRelease(role: PlatformRole): boolean {
  return isAtLeast(role, 'PLATFORM_ADMIN');
}

export function allowedLifecycleTransitions(
  from: GoldenPathLifecycle,
  role: PlatformRole,
): readonly GoldenPathLifecycle[] {
  const next = LIFECYCLE_TRANSITIONS[from];
  return next.filter(target => canTransitionLifecycle(from, target, role));
}

export function canTransitionLifecycle(
  from: GoldenPathLifecycle,
  to: GoldenPathLifecycle,
  role: PlatformRole,
): boolean {
  if (!LIFECYCLE_TRANSITIONS[from].includes(to)) {
    return false;
  }
  if (to === 'TESTING') {
    return canProposeGoldenPathRelease(role);
  }
  if (to === 'CERTIFIED') {
    return canReviewGoldenPathCertification(role);
  }
  if (to === 'RELEASED' || to === 'DEPRECATED' || to === 'RETIRED') {
    return canApproveGoldenPathRelease(role);
  }
  return false;
}

export function visibleDistribution(
  channels: readonly DistributionChannel[],
): DistributionChannel[] {
  return channels.filter(channel =>
    AVAILABLE_DISTRIBUTION_CHANNELS.includes(channel),
  );
}

export function distributionLabel(channel: DistributionChannel): string {
  switch (channel) {
    case 'INTERNAL':
      return 'Internal';
    case 'TEMPLATE_EDITION':
      return 'Template Edition';
    case 'PLATFORM_EDITION':
      return 'Platform Edition';
    case 'SAAS':
      return 'SaaS';
    default:
      return channel;
  }
}

export function distributionStatusLines(
  approved: readonly DistributionChannel[] = [],
): Array<{
  channel: DistributionChannel;
  label: string;
  availability: DistributionAvailability;
  offered: boolean;
}> {
  return DISTRIBUTION_CHANNELS.map(channel => ({
    channel,
    label: distributionLabel(channel),
    availability: DISTRIBUTION_AVAILABILITY[channel],
    offered:
      AVAILABLE_DISTRIBUTION_CHANNELS.includes(channel) &&
      approved.includes(channel),
  }));
}

export function evaluateTemplateReleaseUpgrade(
  generatedVersion: string | undefined,
  currentVersion: string | undefined,
  compatibleRange = '1.x',
): 'CURRENT' | 'UPDATE_AVAILABLE' | 'UPGRADE_REQUIRED' | 'UNSUPPORTED' {
  if (!generatedVersion || !currentVersion) {
    return 'UNSUPPORTED';
  }
  const comparison = compareReleaseVersions(generatedVersion, currentVersion);
  if (comparison === undefined) {
    return 'UNSUPPORTED';
  }
  if (comparison === 0) {
    return 'CURRENT';
  }
  if (comparison > 0) {
    return 'UNSUPPORTED';
  }
  const generated = parseSemverParts(generatedVersion);
  const current = parseSemverParts(currentVersion);
  if (!generated || !current) {
    return 'UNSUPPORTED';
  }
  if (compatibleRange === '1.x' && generated.major === current.major) {
    return 'UPDATE_AVAILABLE';
  }
  if (compatibleRange.endsWith('.x')) {
    const major = Number(compatibleRange.split('.')[0]);
    if (generated.major === major && current.major === major) {
      return generated.minor === current.minor ? 'CURRENT' : 'UPDATE_AVAILABLE';
    }
  }
  return 'UPGRADE_REQUIRED';
}

export function releaseCatalogRows(
  releases: readonly GoldenPathRelease[] = loadGoldenPathReleases(),
): Array<{
  template: string;
  name: string;
  version: string;
  lifecycle: GoldenPathLifecycle;
  certification: GoldenPathCertificationStatus;
  standard: string;
  sdk: string;
  releaseDate: string;
  distribution: string;
  upgradeStatus: 'CURRENT' | 'UPDATE_AVAILABLE' | 'UPGRADE_REQUIRED' | 'UNSUPPORTED';
  current: boolean;
}> {
  const templates = [...new Set(releases.map(release => release.template))];
  return templates.flatMap(template => {
    const current = currentRelease(template, releases);
    return releasesForTemplate(template, releases).map(release => ({
      template: release.template,
      name: release.name,
      version: release.version,
      lifecycle: release.status,
      certification: release.certification.status,
      standard: release.certification.standard,
      sdk: release.certification.sdk,
      releaseDate: release.release.date,
      distribution: visibleDistribution(release.distribution)
        .map(distributionLabel)
        .join(', '),
      upgradeStatus: evaluateTemplateReleaseUpgrade(
        release.version,
        current?.version,
        '1.x',
      ),
      current: current?.version === release.version && current?.status === release.status,
    }));
  });
}

export function filterReleaseCatalogRows(
  rows: ReturnType<typeof releaseCatalogRows>,
  filter: 'ALL' | 'Released' | 'Certified' | 'Deprecated',
) {
  if (filter === 'ALL') {
    return rows;
  }
  if (filter === 'Released') {
    return rows.filter(row => row.lifecycle === 'RELEASED');
  }
  if (filter === 'Certified') {
    return rows.filter(
      row => row.certification === 'CERTIFIED' || row.lifecycle === 'CERTIFIED',
    );
  }
  return rows.filter(row => row.lifecycle === 'DEPRECATED');
}
