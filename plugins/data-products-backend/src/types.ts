export const PLATFORM_CI_STATUSES = [
  'RUNNING',
  'PASSED',
  'FAILED',
  'CANCELLED',
  'UNKNOWN',
] as const;

export type PlatformCiStatus = (typeof PLATFORM_CI_STATUSES)[number];

// Order matches the steps of the official Golden Path quality gate
// (templates/*/content/.github/workflows/data-product-quality.yml) and drives
// the display order in mapFailedStages.
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
  /** `push`, `pull_request`, `workflow_call`, … (NXD-151). */
  event?: string;
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
  /**
   * NXD-123. The newest completed run of the CI workflow; NXD-151 narrows it
   * to a branch and an event, so a pull request's run is not taken for the
   * default branch's.
   */
  getLatestCompletedRun?(
    repo: GithubRepoRef,
    filter?: { branch?: string; event?: string },
  ): Promise<GithubFetchResult<GithubWorkflowRun | undefined>>;
  /** NXD-151. The repository's default branch. */
  getDefaultBranch?(repo: GithubRepoRef): Promise<GithubFetchResult<string>>;
  /** NXD-123. A run's artifact by name, as the zip GitHub serves. */
  downloadArtifact?(
    repo: GithubRepoRef,
    runId: number,
    name: string,
  ): Promise<GithubFetchResult<Buffer | undefined>>;
  /** NXD-133. The repository's published releases, newest first. */
  listReleases?(repo: GithubRepoRef): Promise<GithubFetchResult<GithubRelease[]>>;
  /** NXD-133. One release asset's bytes. */
  downloadReleaseAsset?(
    repo: GithubRepoRef,
    assetId: number,
  ): Promise<GithubFetchResult<Buffer>>;
  /** NXD-133. The commit a ref (a tag) points at, annotated tags resolved. */
  getCommitSha?(
    repo: GithubRepoRef,
    ref: string,
  ): Promise<GithubFetchResult<string>>;
  /** NXD-137. A file's text at a ref; `undefined` when there is no such file. */
  getFileAtRef?(
    repo: GithubRepoRef,
    path: string,
    ref: string,
  ): Promise<GithubFetchResult<string | undefined>>;
}

export interface GithubRelease {
  tag: string;
  url: string;
  publishedAt?: string;
  draft: boolean;
  prerelease: boolean;
  assets: Array<{ id: number; name: string; size: number }>;
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

  const normalized = PLATFORM_CI_STATUSES.includes(status.status as PlatformCiStatus)
    ? status.status
    : 'UNKNOWN';

  return {
    status: normalized,
    representation: ciStatusRepresentation(normalized),
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
