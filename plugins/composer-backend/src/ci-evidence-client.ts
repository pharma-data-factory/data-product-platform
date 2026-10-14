/**
 * The test evidence of a product repository's newest completed CI run, from
 * the data-products plugin (NXD-123), which owns GitHub Actions access.
 * Composer has no GitHub client of its own and gets none: one plugin talks
 * to GitHub, the others ask it.
 */

export interface CiEvidence {
  available: boolean;
  /** Why not, when not available: no-completed-run, no-evidence-artifact, … */
  reason?: string;
  run?: {
    id: number;
    url: string;
    commit: string;
    branch?: string;
    conclusion: string | null;
    completedAt?: string;
  };
  results?: Array<{
    suite: string;
    testCase: string;
    outcome: 'passed' | 'failed' | 'skipped' | 'error';
    requirements: string[];
  }>;
}

/** NXD-152. One open pull request and its own CI run's evidence. */
export interface PullRequestEvidence extends Omit<CiEvidence, 'run'> {
  number: number;
  title: string;
  url: string;
  headRef: string;
  headSha: string;
  author?: string;
  draft: boolean;
  /** The run tested an older head than the pull request now has. */
  stale?: boolean;
  run?: CiEvidence['run'] & { event?: string };
}

export interface CiEvidenceClient {
  getLatestEvidence(repositoryUrl: string): Promise<CiEvidence>;
  /** NXD-152. Read-only: never recorded as a version's evidence. */
  getPullRequestEvidence?(
    repositoryUrl: string,
  ): Promise<{ available: boolean; reason?: string; pullRequests: PullRequestEvidence[] }>;
}

export function createHttpCiEvidenceClient(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): CiEvidenceClient {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  async function get<T>(path: string): Promise<T> {
    const base = await options.discovery.getBaseUrl('data-products');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: await options.auth.getOwnServiceCredentials(),
      targetPluginId: 'data-products',
    });
    const response = await doFetch(`${base}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const body = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? `data-products answered ${response.status}`);
    }
    return body;
  }
  return {
    getLatestEvidence: repositoryUrl =>
      get<CiEvidence>(`/ci-evidence?repoUrl=${encodeURIComponent(repositoryUrl)}`),
    getPullRequestEvidence: repositoryUrl =>
      get(`/ci-evidence/pull-requests?repoUrl=${encodeURIComponent(repositoryUrl)}`),
  };
}
