import platformVersions from './platform-versions.json';
import { parseSemver, versionSatisfies } from './compatibility';

export const UPGRADE_STATUSES = [
  'CURRENT',
  'UPDATE_AVAILABLE',
  'UPGRADE_REQUIRED',
  'UNSUPPORTED',
] as const;

export type UpgradeStatus = (typeof UPGRADE_STATUSES)[number];

export interface PlatformVersions {
  standard: string;
  sdk: string;
  templates: Record<string, string>;
  compatible: {
    standard: string;
    sdk: string;
    templates: Record<string, string>;
  };
}

export interface ArtifactUpgrade {
  artifact: 'standard' | 'sdk' | 'template';
  current?: string;
  supported: string;
  status: UpgradeStatus;
}

export interface ProductUpgrade {
  standard: ArtifactUpgrade;
  sdk: ArtifactUpgrade;
  template: ArtifactUpgrade;
  overall: UpgradeStatus;
}

export function loadPlatformVersions(): PlatformVersions {
  return platformVersions as PlatformVersions;
}

export function compareSemver(left: string, right: string): number | undefined {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
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

export function evaluateVersionStatus(
  current: string | undefined,
  supported: string,
  compatibleRange: string,
): UpgradeStatus {
  if (!current) {
    return 'UNSUPPORTED';
  }
  const comparison = compareSemver(current, supported);
  if (comparison === undefined) {
    return 'UNSUPPORTED';
  }
  if (comparison === 0) {
    return 'CURRENT';
  }
  if (comparison > 0) {
    return 'UNSUPPORTED';
  }
  return versionSatisfies(current, [compatibleRange])
    ? 'UPDATE_AVAILABLE'
    : 'UPGRADE_REQUIRED';
}

const RANK: Record<UpgradeStatus, number> = {
  CURRENT: 0,
  UPDATE_AVAILABLE: 1,
  UPGRADE_REQUIRED: 2,
  UNSUPPORTED: 3,
};

export function overallUpgradeStatus(statuses: UpgradeStatus[]): UpgradeStatus {
  return statuses.reduce<UpgradeStatus>((worst, status) => {
    return RANK[status] > RANK[worst] ? status : worst;
  }, 'CURRENT');
}

export function evaluateProductUpgrade(input: {
  standardVersion?: string;
  sdkVersion?: string;
  templateName?: string;
  templateVersion?: string;
  platform?: PlatformVersions;
}): ProductUpgrade {
  const platform = input.platform ?? loadPlatformVersions();
  const templateSupported =
    (input.templateName && platform.templates[input.templateName]) ||
    platform.sdk;
  const templateRange =
    (input.templateName && platform.compatible.templates[input.templateName]) ||
    platform.compatible.sdk;

  const standard: ArtifactUpgrade = {
    artifact: 'standard',
    current: input.standardVersion,
    supported: platform.standard,
    status: evaluateVersionStatus(
      input.standardVersion,
      platform.standard,
      platform.compatible.standard,
    ),
  };
  const sdk: ArtifactUpgrade = {
    artifact: 'sdk',
    current: input.sdkVersion,
    supported: platform.sdk,
    status: evaluateVersionStatus(
      input.sdkVersion,
      platform.sdk,
      platform.compatible.sdk,
    ),
  };
  const template: ArtifactUpgrade = {
    artifact: 'template',
    current: input.templateVersion,
    supported: templateSupported,
    status: evaluateVersionStatus(
      input.templateVersion,
      templateSupported,
      templateRange,
    ),
  };

  return {
    standard,
    sdk,
    template,
    overall: overallUpgradeStatus([
      standard.status,
      sdk.status,
      template.status,
    ]),
  };
}
