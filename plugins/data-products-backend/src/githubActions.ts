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
  GithubRelease,
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

  async function authorizedFetch(
    repo: GithubRepoRef,
    path: string,
    accept = 'application/vnd.github+json',
  ): Promise<GithubFetchResult<Response>> {
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
      Accept: accept,
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
      return { ok: true, value: response };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  async function authorizedRequest(
    repo: GithubRepoRef,
    path: string,
  ): Promise<GithubFetchResult<unknown>> {
    const response = await authorizedFetch(repo, path);
    if (!response.ok) {
      return response;
    }
    try {
      return { ok: true, value: await response.value.json() };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  const repoPath = (repo: GithubRepoRef) =>
    `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;

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

    async getLatestCompletedRun(repo, filter) {
      const query = [
        'status=completed',
        ...(filter?.branch ? [`branch=${encodeURIComponent(filter.branch)}`] : []),
        ...(filter?.event ? [`event=${encodeURIComponent(filter.event)}`] : []),
        'per_page=1',
      ].join('&');
      const runs = await authorizedRequest(
        repo,
        `${repoPath(repo)}/actions/workflows/${CI_WORKFLOW_FILE}/runs?${query}`,
      );
      return runs.ok ? { ok: true, value: firstRun(runs.value) } : runs;
    },

    async getDefaultBranch(repo) {
      const info = await authorizedRequest(repo, repoPath(repo));
      if (!info.ok) return info;
      const branch = (info.value as { default_branch?: unknown }).default_branch;
      return typeof branch === 'string' && branch
        ? { ok: true, value: branch }
        : { ok: false, reason: 'unavailable' };
    },

    async downloadArtifact(repo, runId, name) {
      const listing = await authorizedRequest(
        repo,
        `${repoPath(repo)}/actions/runs/${runId}/artifacts?per_page=100`,
      );
      if (!listing.ok) {
        return listing;
      }
      const artifacts =
        (listing.value as { artifacts?: Array<Record<string, unknown>> })
          .artifacts ?? [];
      const artifact = artifacts.find(a => a.name === name && a.expired !== true);
      if (!artifact) {
        return { ok: true, value: undefined };
      }
      // GitHub answers with a redirect to short-lived blob storage; fetch
      // follows it.
      const zip = await authorizedFetch(
        repo,
        `${repoPath(repo)}/actions/artifacts/${artifact.id}/zip`,
      );
      if (!zip.ok) {
        return zip;
      }
      try {
        return { ok: true, value: Buffer.from(await zip.value.arrayBuffer()) };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },

    async listReleases(repo) {
      const listing = await authorizedRequest(
        repo,
        `${repoPath(repo)}/releases?per_page=100`,
      );
      if (!listing.ok) {
        return listing;
      }
      const releases = Array.isArray(listing.value) ? listing.value : [];
      return {
        ok: true,
        value: releases.map(
          (release: Record<string, any>): GithubRelease => ({
            tag: String(release.tag_name ?? ''),
            url: String(release.html_url ?? ''),
            publishedAt:
              typeof release.published_at === 'string'
                ? release.published_at
                : undefined,
            draft: release.draft === true,
            prerelease: release.prerelease === true,
            assets: (Array.isArray(release.assets) ? release.assets : []).map(
              (asset: Record<string, any>) => ({
                id: Number(asset.id),
                name: String(asset.name ?? ''),
                size: Number(asset.size ?? 0),
              }),
            ),
          }),
        ),
      };
    },

    async downloadReleaseAsset(repo, assetId) {
      // The asset endpoint answers JSON metadata unless asked for the bytes;
      // with octet-stream it redirects to short-lived storage, which fetch
      // follows (and, crossing origins, without the Authorization header).
      const asset = await authorizedFetch(
        repo,
        `${repoPath(repo)}/releases/assets/${assetId}`,
        'application/octet-stream',
      );
      if (!asset.ok) {
        return asset;
      }
      try {
        return { ok: true, value: Buffer.from(await asset.value.arrayBuffer()) };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },

    async getCommitSha(repo, ref) {
      const commit = await authorizedRequest(
        repo,
        `${repoPath(repo)}/commits/${encodeURIComponent(ref)}`,
      );
      if (!commit.ok) {
        return commit;
      }
      const sha = (commit.value as { sha?: unknown }).sha;
      return typeof sha === 'string'
        ? { ok: true, value: sha }
        : { ok: false, reason: 'unavailable' };
    },

    async getFileAtRef(repo, path, ref) {
      const file = await authorizedFetch(
        repo,
        `${repoPath(repo)}/contents/${path
          .split('/')
          .map(encodeURIComponent)
          .join('/')}?ref=${encodeURIComponent(ref)}`,
        'application/vnd.github.raw',
      );
      if (!file.ok) {
        return file.reason === 'not-found' ? { ok: true, value: undefined } : file;
      }
      try {
        return { ok: true, value: await file.value.text() };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
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
    ...(typeof run.event === 'string' ? { event: run.event } : {}),
    startedAt: [run.run_started_at, run.created_at].find(
      (value): value is string => typeof value === 'string',
    ),
    completedAt:
      run.status === 'completed' && typeof run.updated_at === 'string'
        ? run.updated_at
        : undefined,
  };
}
