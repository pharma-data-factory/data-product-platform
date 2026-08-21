import { Config } from '@backstage/config';
import {
  DefaultGithubCredentialsProvider,
  GithubCredentials,
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

import {
  GithubActionsClient,
  GithubFetchFailure,
  GithubFetchResult,
  GithubRepoRef,
  GithubWorkflowRun,
  QualityStage,
} from './types';
import { mapFailedStages } from './mapCiStatus';

const CI_WORKFLOW_FILE = 'ci.yml';

type FetchLike = typeof fetch;

export function createGithubActionsClient(options: {
  config: Config;
  fetchFn?: FetchLike;
  credentialsProvider?: GithubCredentialsProvider;
}): GithubActionsClient {
  const integrations = ScmIntegrations.fromConfig(options.config);
  const credentials =
    options.credentialsProvider ??
    DefaultGithubCredentialsProvider.fromIntegrations(integrations);
  const fetchFn = options.fetchFn ?? fetch;

  async function authorizedRequest(
    repo: GithubRepoRef,
    path: string,
  ): Promise<GithubFetchResult<unknown>> {
    const integration = integrations.github.byUrl(repo.url);
    if (!integration) {
      return { ok: false, reason: 'unavailable' };
    }

    let creds: GithubCredentials;
    try {
      creds = await credentials.getCredentials({ url: repo.url });
    } catch {
      return { ok: false, reason: 'inaccessible' };
    }

    if (!creds.token && !creds.headers) {
      return { ok: false, reason: 'inaccessible' };
    }

    const apiBase = (integration.config.apiBaseUrl || 'https://api.github.com').replace(
      /\/$/,
      '',
    );
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(creds.headers ?? {}),
    };
    if (creds.token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${creds.token}`;
    }

    try {
      const response = await fetchFn(`${apiBase}${path}`, { headers });
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return { ok: false, reason: statusToReason(response.status) };
      }
      if (!response.ok) {
        return { ok: false, reason: 'unavailable' };
      }
      return { ok: true, value: await response.json() };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  return {
    async getLatestRun(repo) {
      const workflowRuns = await authorizedRequest(
        repo,
        `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
          repo.repo,
        )}/actions/workflows/${CI_WORKFLOW_FILE}/runs?per_page=1`,
      );

      if (workflowRuns.ok) {
        const run = firstRun(workflowRuns.value);
        return { ok: true, value: run };
      }

      if (workflowRuns.reason !== 'not-found') {
        return workflowRuns;
      }

      const allRuns = await authorizedRequest(
        repo,
        `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
          repo.repo,
        )}/actions/runs?per_page=1`,
      );
      if (!allRuns.ok) {
        return allRuns;
      }
      return { ok: true, value: firstRun(allRuns.value) };
    },

    async getFailedStages(repo, runId) {
      const jobs = await authorizedRequest(
        repo,
        `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
          repo.repo,
        )}/actions/runs/${runId}/jobs`,
      );
      if (!jobs.ok) {
        return [];
      }
      const body = jobs.value as { jobs?: Array<Record<string, unknown>> };
      return mapFailedStages(
        (body.jobs ?? []).map(job => ({
          name: typeof job.name === 'string' ? job.name : undefined,
          conclusion:
            typeof job.conclusion === 'string' ? job.conclusion : null,
          steps: Array.isArray(job.steps)
            ? job.steps.map(step => ({
                name:
                  step && typeof step === 'object' && typeof (step as { name?: unknown }).name === 'string'
                    ? (step as { name: string }).name
                    : undefined,
                conclusion:
                  step &&
                  typeof step === 'object' &&
                  typeof (step as { conclusion?: unknown }).conclusion === 'string'
                    ? (step as { conclusion: string }).conclusion
                    : null,
              }))
            : [],
        })),
      ) as QualityStage[];
    },
  };
}

function statusToReason(status: number): GithubFetchFailure {
  if (status === 404) {
    return 'not-found';
  }
  if (status === 401 || status === 403) {
    return 'inaccessible';
  }
  return 'unavailable';
}

function firstRun(body: unknown): GithubWorkflowRun | undefined {
  const runs =
    body && typeof body === 'object' && Array.isArray((body as { workflow_runs?: unknown }).workflow_runs)
      ? (body as { workflow_runs: unknown[] }).workflow_runs
      : [];
  const raw = runs[0];
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const run = raw as Record<string, unknown>;
  const id = typeof run.id === 'number' ? run.id : Number(run.id);
  if (!Number.isFinite(id)) {
    return undefined;
  }
  return {
    id,
    name: typeof run.name === 'string' ? run.name : '',
    status: typeof run.status === 'string' ? run.status : '',
    conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
    headBranch: typeof run.head_branch === 'string' ? run.head_branch : '',
    headSha: typeof run.head_sha === 'string' ? run.head_sha : '',
    htmlUrl: typeof run.html_url === 'string' ? run.html_url : '',
    startedAt: [run.run_started_at, run.created_at].find(
      (value): value is string => typeof value === 'string',
    ),
    completedAt:
      run.status === 'completed' && typeof run.updated_at === 'string'
        ? run.updated_at
        : undefined,
  };
}
