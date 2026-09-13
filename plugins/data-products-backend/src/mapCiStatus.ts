import {
  GithubWorkflowRun,
  PlatformCiStatus,
  QualityStage,
  QUALITY_STAGES,
} from './types';

const RUNNING_STATUSES = new Set([
  'queued',
  'in_progress',
  'waiting',
  'pending',
  'requested',
  'waiting_for_review',
  'action_required',
]);

const STAGE_MATCHERS: Array<{ match: string; stage: QualityStage }> = [
  { match: 'manifest pin', stage: 'Manifest Pins' },
  { match: 'contract test', stage: 'Contract Tests' },
  { match: 'unit test', stage: 'Unit Tests' },
  { match: 'data quality', stage: 'Data Quality' },
  { match: 'quality test', stage: 'Data Quality' },
  { match: 'compatibility', stage: 'Compatibility' },
  { match: 'docker build', stage: 'Docker Build' },
  { match: 'lint', stage: 'Lint' },
];

export function mapGithubRunToPlatformStatus(run: {
  status: string;
  conclusion: string | null;
}): PlatformCiStatus {
  const status = (run.status ?? '').toLowerCase();
  if (status !== 'completed') {
    if (RUNNING_STATUSES.has(status) || status) {
      return 'RUNNING';
    }
    return 'UNKNOWN';
  }

  switch ((run.conclusion ?? '').toLowerCase()) {
    case 'success':
      return 'PASSED';
    case 'failure':
    case 'timed_out':
    case 'startup_failure':
      return 'FAILED';
    case 'cancelled':
    case 'skipped':
      return 'CANCELLED';
    default:
      return 'UNKNOWN';
  }
}

export function shortSha(sha?: string): string | undefined {
  if (!sha) {
    return undefined;
  }
  return sha.slice(0, 7);
}

export function mapFailedStages(
  jobs: Array<{
    name?: string;
    conclusion?: string | null;
    steps?: Array<{ name?: string; conclusion?: string | null }>;
  }>,
): QualityStage[] {
  const found = new Set<QualityStage>();

  for (const job of jobs) {
    const stepFailures = (job.steps ?? []).filter(step =>
      isFailure(step.conclusion),
    );
    for (const step of stepFailures) {
      const stage = matchStage(step.name);
      if (stage) {
        found.add(stage);
      }
    }

    if (isFailure(job.conclusion)) {
      const stage = matchStage(job.name);
      if (stage) {
        found.add(stage);
      }
    }
  }

  return QUALITY_STAGES.filter(stage => found.has(stage));
}

export function toPublicRunFields(run: GithubWorkflowRun) {
  return {
    workflowName: run.name || undefined,
    githubStatus: run.status || undefined,
    conclusion: run.conclusion || undefined,
    branch: run.headBranch || undefined,
    commitSha: shortSha(run.headSha),
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    htmlUrl: isSafeGithubActionsUrl(run.htmlUrl) ? run.htmlUrl : undefined,
  };
}

export function isSafeGithubActionsUrl(value?: string): boolean {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return false;
    }
    return /\/actions\//.test(url.pathname);
  } catch {
    return false;
  }
}

function isFailure(conclusion?: string | null): boolean {
  const value = (conclusion ?? '').toLowerCase();
  return (
    value === 'failure' ||
    value === 'timed_out' ||
    value === 'startup_failure'
  );
}

function matchStage(name?: string): QualityStage | undefined {
  const normalized = (name ?? '').toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return STAGE_MATCHERS.find(entry => normalized.includes(entry.match))?.stage;
}
