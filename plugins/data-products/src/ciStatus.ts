export const PLATFORM_CI_STATUSES = [
  'RUNNING',
  'PASSED',
  'FAILED',
  'CANCELLED',
  'UNKNOWN',
] as const;

export type PlatformCiStatus = (typeof PLATFORM_CI_STATUSES)[number];

// Must stay in sync with QUALITY_STAGES in plugins/data-products-backend:
// sanitizeCiStatus filters failedStages against this list, so a stage missing
// here is dropped before it reaches the UI.
export const QUALITY_STAGES = [
  'Lint',
  'Unit Tests',
  'Contract Tests',
  'Data Quality',
  'Compatibility',
  'Docker Build',
  'Security Scan',
] as const;

export type QualityStage = (typeof QUALITY_STAGES)[number];

export const CI_UNKNOWN_REPRESENTATION = 'DEGRADED / UNVERIFIED';

export function ciStatusRepresentation(status: PlatformCiStatus): string {
  return status === 'UNKNOWN' ? CI_UNKNOWN_REPRESENTATION : status;
}

export interface DataProductCiStatus {
  status: PlatformCiStatus;
  representation?: string;
  workflowName?: string;
  githubStatus?: string;
  conclusion?: string;
  branch?: string;
  commitSha?: string;
  startedAt?: string;
  completedAt?: string;
  htmlUrl?: string;
  failedStages?: QualityStage[];
  message?: string;
}

export function unknownCiStatus(
  message = 'Not available',
): DataProductCiStatus {
  return {
    status: 'UNKNOWN',
    representation: CI_UNKNOWN_REPRESENTATION,
    message,
  };
}

export function sanitizeCiStatus(data: unknown): DataProductCiStatus {
  if (!data || typeof data !== 'object') {
    return unknownCiStatus();
  }
  const raw = data as Record<string, unknown>;
  const status = PLATFORM_CI_STATUSES.includes(raw.status as PlatformCiStatus)
    ? (raw.status as PlatformCiStatus)
    : 'UNKNOWN';
  const failedStages = Array.isArray(raw.failedStages)
    ? raw.failedStages.filter((stage): stage is QualityStage =>
        QUALITY_STAGES.includes(stage as QualityStage),
      )
    : undefined;

  return {
    status,
    representation: ciStatusRepresentation(status),
    ...(typeof raw.workflowName === 'string'
      ? { workflowName: raw.workflowName }
      : {}),
    ...(typeof raw.githubStatus === 'string'
      ? { githubStatus: raw.githubStatus }
      : {}),
    ...(typeof raw.conclusion === 'string' ? { conclusion: raw.conclusion } : {}),
    ...(typeof raw.branch === 'string' ? { branch: raw.branch } : {}),
    ...(typeof raw.commitSha === 'string' ? { commitSha: raw.commitSha } : {}),
    ...(typeof raw.startedAt === 'string' ? { startedAt: raw.startedAt } : {}),
    ...(typeof raw.completedAt === 'string'
      ? { completedAt: raw.completedAt }
      : {}),
    ...(typeof raw.htmlUrl === 'string' ? { htmlUrl: raw.htmlUrl } : {}),
    ...(failedStages && failedStages.length > 0 ? { failedStages } : {}),
    ...(typeof raw.message === 'string' ? { message: raw.message } : {}),
  };
}
