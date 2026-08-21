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

export interface GithubRepoRef {
  host: string;
  owner: string;
  repo: string;
  url: string;
}

export interface GithubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  headBranch: string;
  headSha: string;
  htmlUrl: string;
  startedAt?: string;
  completedAt?: string;
}

export type GithubFetchFailure = 'inaccessible' | 'unavailable' | 'not-found';

export type GithubFetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: GithubFetchFailure };

export interface GithubActionsClient {
  getLatestRun(
    repo: GithubRepoRef,
  ): Promise<GithubFetchResult<GithubWorkflowRun | undefined>>;
  getFailedStages(
    repo: GithubRepoRef,
    runId: number,
  ): Promise<QualityStage[]>;
}

export function unknownCiStatus(
  message = 'Not available',
): DataProductCiStatus {
  return {
    status: 'UNKNOWN',
    message,
  };
}

export function publicCiStatus(
  status: DataProductCiStatus,
): DataProductCiStatus {
  const failedStages = Array.isArray(status.failedStages)
    ? status.failedStages.filter((stage): stage is QualityStage =>
        QUALITY_STAGES.includes(stage as QualityStage),
      )
    : undefined;

  return {
    status: PLATFORM_CI_STATUSES.includes(status.status as PlatformCiStatus)
      ? status.status
      : 'UNKNOWN',
    ...(status.workflowName ? { workflowName: status.workflowName } : {}),
    ...(status.githubStatus ? { githubStatus: status.githubStatus } : {}),
    ...(status.conclusion ? { conclusion: status.conclusion } : {}),
    ...(status.branch ? { branch: status.branch } : {}),
    ...(status.commitSha ? { commitSha: status.commitSha } : {}),
    ...(status.startedAt ? { startedAt: status.startedAt } : {}),
    ...(status.completedAt ? { completedAt: status.completedAt } : {}),
    ...(status.htmlUrl ? { htmlUrl: status.htmlUrl } : {}),
    ...(failedStages && failedStages.length > 0 ? { failedStages } : {}),
    ...(status.message ? { message: status.message } : {}),
  };
}
