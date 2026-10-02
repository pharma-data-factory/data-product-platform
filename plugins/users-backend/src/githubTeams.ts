/**
 * The four GitHub calls the team reconciler needs (NXD-108), and nothing else.
 *
 * Same shape as `data-products-backend/src/githubActions.ts`: credentials from
 * `DefaultGithubCredentialsProvider` (the GitHub App installation token for the
 * organization, or `GITHUB_TOKEN` as the integration fallback), native `fetch`,
 * and a result that names the reason instead of throwing. No Octokit: four
 * endpoints do not justify a client library.
 *
 * The App needs *Organization → Members: read & write* for these calls. Without
 * it GitHub answers 403, which surfaces here as `forbidden` — the reconciler
 * reports it per team rather than failing the run.
 */

import type { RootConfigService } from '@backstage/backend-plugin-api';
import {
  DefaultGithubCredentialsProvider,
  GithubCredentials,
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

type FetchLike = typeof fetch;

/**
 * - `not-found` — 404: the team does not exist in the organization, or (on
 *   DELETE) the user is not a member of it.
 * - `forbidden` — 401/403: no credentials, or the App lacks the Members
 *   permission or is not installed on the organization.
 * - `not-in-org` — 422: GitHub refuses the membership change, which for these
 *   endpoints means the user cannot be added to a team of this organization.
 * - `unavailable` — network failure or any other status.
 */
export type GithubTeamsFailure =
  | 'not-found'
  | 'forbidden'
  | 'not-in-org'
  | 'unavailable';

export type GithubTeamsResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      reason: GithubTeamsFailure;
      status?: number;
      message?: string;
    };

/** `pending` means GitHub sent an invitation the user has not accepted yet. */
export type TeamMembershipState = 'active' | 'pending';

export interface GithubTeamsClient {
  /** Logins of the team's current members. */
  listMembers(teamSlug: string): Promise<GithubTeamsResult<string[]>>;
  /** Logins with an open invitation to the team. Email-only invitations are skipped. */
  listInvitations(teamSlug: string): Promise<GithubTeamsResult<string[]>>;
  addMember(
    teamSlug: string,
    username: string,
  ): Promise<GithubTeamsResult<TeamMembershipState>>;
  removeMember(
    teamSlug: string,
    username: string,
  ): Promise<GithubTeamsResult<void>>;
}

const PAGE_SIZE = 100;
/** 5,000 members per team. Past that something is wrong, not large. */
const MAX_PAGES = 50;

export function createGithubTeamsClient(options: {
  organization: string;
  credentialsProvider: GithubCredentialsProvider;
  host?: string;
  apiBaseUrl?: string;
  fetchFn?: FetchLike;
}): GithubTeamsClient {
  const host = options.host ?? 'github.com';
  const apiBase = (options.apiBaseUrl || 'https://api.github.com').replace(
    /\/$/,
    '',
  );
  const fetchFn = options.fetchFn ?? fetch;
  const org = encodeURIComponent(options.organization);
  // The App installation is looked up by owner, so the URL is the org itself.
  const credentialsUrl = `https://${host}/${options.organization}`;

  async function request(
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<GithubTeamsResult<unknown>> {
    let creds: GithubCredentials;
    try {
      creds = await options.credentialsProvider.getCredentials({
        url: credentialsUrl,
      });
    } catch {
      return { ok: false, reason: 'forbidden' };
    }
    if (!creds.token && !creds.headers) {
      return { ok: false, reason: 'forbidden' };
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(creds.headers ?? {}),
    };
    if (creds.token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${creds.token}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetchFn(`${apiBase}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      return { ok: false, reason: 'unavailable' };
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: statusToReason(response.status),
        status: response.status,
        message: await errorMessage(response),
      };
    }
    if (response.status === 204) {
      return { ok: true, value: undefined };
    }
    try {
      return { ok: true, value: await response.json() };
    } catch {
      return { ok: false, reason: 'unavailable', status: response.status };
    }
  }

  async function listLogins(
    path: string,
  ): Promise<GithubTeamsResult<string[]>> {
    const logins: string[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await request(
        'GET',
        `${path}?per_page=${PAGE_SIZE}&page=${page}`,
      );
      if (!result.ok) {
        return result;
      }
      const items = Array.isArray(result.value) ? result.value : [];
      for (const item of items) {
        const login =
          item && typeof item === 'object'
            ? (item as { login?: unknown }).login
            : undefined;
        if (typeof login === 'string' && login) {
          logins.push(login.toLowerCase());
        }
      }
      if (items.length < PAGE_SIZE) {
        return { ok: true, value: logins };
      }
    }
    return {
      ok: false,
      reason: 'unavailable',
      message: `More than ${MAX_PAGES * PAGE_SIZE} entries at ${path}`,
    };
  }

  const team = (slug: string) =>
    `/orgs/${org}/teams/${encodeURIComponent(slug)}`;
  const membership = (slug: string, username: string) =>
    `${team(slug)}/memberships/${encodeURIComponent(username)}`;

  return {
    listMembers: slug => listLogins(`${team(slug)}/members`),

    listInvitations: slug => listLogins(`${team(slug)}/invitations`),

    async addMember(slug, username) {
      const result = await request('PUT', membership(slug, username), {
        role: 'member',
      });
      if (!result.ok) {
        return result;
      }
      const state = (result.value as { state?: unknown } | undefined)?.state;
      return { ok: true, value: state === 'pending' ? 'pending' : 'active' };
    },

    async removeMember(slug, username) {
      const result = await request('DELETE', membership(slug, username));
      return result.ok ? { ok: true, value: undefined } : result;
    },
  };
}

/**
 * The wiring for the plugin: the integration for `host` supplies the API base
 * URL, and `DefaultGithubCredentialsProvider` the App installation token.
 */
export function createGithubTeamsClientFromConfig(options: {
  config: RootConfigService;
  organization: string;
  host?: string;
  fetchFn?: FetchLike;
}): GithubTeamsClient {
  const host = options.host ?? 'github.com';
  const integrations = ScmIntegrations.fromConfig(options.config);
  return createGithubTeamsClient({
    organization: options.organization,
    host,
    apiBaseUrl: integrations.github.byHost(host)?.config.apiBaseUrl,
    credentialsProvider:
      DefaultGithubCredentialsProvider.fromIntegrations(integrations),
    fetchFn: options.fetchFn,
  });
}

function statusToReason(status: number): GithubTeamsFailure {
  if (status === 404) {
    return 'not-found';
  }
  if (status === 401 || status === 403) {
    return 'forbidden';
  }
  if (status === 422) {
    return 'not-in-org';
  }
  return 'unavailable';
}

/** GitHub's `{ message }`, for `github_team_sync_state.last_error`. */
async function errorMessage(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body?.message === 'string' ? body.message : undefined;
  } catch {
    return undefined;
  }
}
