/**
 * NXD-153. The AI build's transport: data-products fires the repository
 * dispatch and reads back the run and the pull request. Composer issues and
 * records the assignment; it has no GitHub client of its own (NXD-123: one
 * plugin talks to GitHub, the others ask it).
 */

export interface AiBuildDispatchResult {
  dispatched: boolean;
  /** Why not: no-ai-build-workflow, inaccessible, not-found, unavailable. */
  reason?: string;
  branch?: string;
}

export interface AiBuildStatus {
  available: boolean;
  reason?: string;
  branch?: string;
  run?: {
    id: number;
    url: string;
    status: string;
    conclusion: string | null;
    startedAt?: string;
    completedAt?: string;
  };
  pullRequest?: {
    number: number;
    title: string;
    url: string;
    headSha: string;
    state: 'open' | 'closed';
    merged: boolean;
    author?: string;
    mergedAt?: string;
    mergeCommitSha?: string;
    closedAt?: string;
  };
}

export interface AiBuildClient {
  dispatch(
    repositoryUrl: string,
    payload: Record<string, unknown>,
  ): Promise<AiBuildDispatchResult>;
  getStatus(
    repositoryUrl: string,
    assignmentId: string,
  ): Promise<AiBuildStatus>;
}

export function createHttpAiBuildClient(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): AiBuildClient {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  async function call<T>(path: string, body?: unknown): Promise<T> {
    const base = await options.discovery.getBaseUrl('data-products');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: await options.auth.getOwnServiceCredentials(),
      targetPluginId: 'data-products',
    });
    const response = await doFetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const parsed = (await response.json().catch(() => ({}))) as T & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        parsed.error ?? `data-products answered ${response.status}`,
      );
    }
    return parsed;
  }
  return {
    dispatch: (repositoryUrl, payload) =>
      call<AiBuildDispatchResult>('/ai-build/dispatch', {
        repoUrl: repositoryUrl,
        payload,
      }),
    getStatus: (repositoryUrl, assignmentId) =>
      call<AiBuildStatus>(
        `/ai-build/status?repoUrl=${encodeURIComponent(
          repositoryUrl,
        )}&assignmentId=${encodeURIComponent(assignmentId)}`,
      ),
  };
}
