export const PLATFORM_CI_STATUSES = [
  'RUNNING',
  'PASSED',
  'FAILED',
  'CANCELLED',
  'UNKNOWN',
] as const;

export type PlatformCiStatus = (typeof PLATFORM_CI_STATUSES)[number];

export const QUALITY_STAGES = [
  'Lint',
  'Unit Tests',
  'Contract Tests',
  'Data Quality',
  'Compatibility',
  'Docker Build',
] as const;

export type QualityStage = (typeof QUALITY_STAGES)[number];

export interface DataProductCiStatus {
  status: PlatformCiStatus;
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
