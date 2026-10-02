/**
 * The GitHub team client (NXD-108) against a mocked `fetch`. The cases that
 * matter are the refusals: each must come back as a named reason, because the
 * reconciler records them per team instead of failing the run.
 */

import { createGithubTeamsClient } from './githubTeams';

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) {
        throw new SyntaxError('Unexpected end of JSON input');
      }
      return body;
    },
  } as Response;
}

type FetchCall = [
  string,
  RequestInit & { headers: Record<string, string>; body: string },
];

/** The i-th request a mocked fetch received, typed for the assertions. */
function call(fetchFn: jest.Mock, i = 0): FetchCall {
  return fetchFn.mock.calls[i] as unknown as FetchCall;
}

const appCredentials = {
  getCredentials: jest.fn(async () => ({
    type: 'app' as const,
    token: 'installation-token',
    headers: { Authorization: 'Bearer installation-token' },
  })),
};

function client(fetchFn: jest.Mock) {
  return createGithubTeamsClient({
    organization: 'pharma-data-factory',
    credentialsProvider: appCredentials,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
}

beforeEach(() => jest.clearAllMocks());

describe('createGithubTeamsClient', () => {
  it('lists team members with the App installation token for the org', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse(200, [{ login: 'schmeckm' }, { login: 'Dana-Author' }]),
    );
    const result = await client(fetchFn).listMembers('nexora-developers');

    expect(result).toEqual({ ok: true, value: ['schmeckm', 'dana-author'] });
    expect(appCredentials.getCredentials).toHaveBeenCalledWith({
      url: 'https://github.com/pharma-data-factory',
    });
    const [url, init] = call(fetchFn);
    expect(url).toBe(
      'https://api.github.com/orgs/pharma-data-factory/teams/nexora-developers/members?per_page=100&page=1',
    );
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer installation-token');
    expect(init.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
  });

  it('follows pages until a short one', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ login: `user${i}` }));
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, full))
      .mockResolvedValueOnce(jsonResponse(200, [{ login: 'last' }]));
    const result = await client(fetchFn).listMembers('nexora-developers');

    expect(result.ok && result.value).toHaveLength(101);
    expect(call(fetchFn, 1)[0]).toContain('page=2');
  });

  it('lists invitations and skips email-only ones', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse(200, [
        { login: 'invitee' },
        { login: null, email: 'x@y.z' },
      ]),
    );
    const result = await client(fetchFn).listInvitations('nexora-owners');

    expect(result).toEqual({ ok: true, value: ['invitee'] });
    expect(call(fetchFn, 0)[0]).toContain(
      '/orgs/pharma-data-factory/teams/nexora-owners/invitations',
    );
  });

  it('adds a member and reports a pending invitation', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse(200, { state: 'pending', role: 'member' }),
    );
    const result = await client(fetchFn).addMember(
      'nexora-developers',
      'newbie',
    );

    expect(result).toEqual({ ok: true, value: 'pending' });
    const [url, init] = call(fetchFn);
    expect(url).toBe(
      'https://api.github.com/orgs/pharma-data-factory/teams/nexora-developers/memberships/newbie',
    );
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ role: 'member' });
  });

  it('removes a member on 204', async () => {
    const fetchFn = jest.fn(async () => jsonResponse(204));
    const result = await client(fetchFn).removeMember(
      'nexora-admins',
      'leaver',
    );

    expect(result).toEqual({ ok: true, value: undefined });
    expect(call(fetchFn, 0)[1].method).toBe('DELETE');
  });

  it('reports 404 as not-found — the team does not exist', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse(404, { message: 'Not Found' }),
    );
    expect(await client(fetchFn).listMembers('no-such-team')).toEqual({
      ok: false,
      reason: 'not-found',
      status: 404,
      message: 'Not Found',
    });
  });

  it('reports 403 as forbidden — the App lacks Members permission', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse(403, { message: 'Resource not accessible by integration' }),
    );
    expect(
      await client(fetchFn).addMember('nexora-developers', 'someone'),
    ).toEqual({
      ok: false,
      reason: 'forbidden',
      status: 403,
      message: 'Resource not accessible by integration',
    });
  });

  it('reports 422 as not-in-org — the user cannot join this org', async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse(422, { message: 'Validation Failed' }),
    );
    expect(
      await client(fetchFn).addMember('nexora-developers', 'outsider'),
    ).toEqual({
      ok: false,
      reason: 'not-in-org',
      status: 422,
      message: 'Validation Failed',
    });
  });

  it('reports a refusal without a JSON body, keeping the status', async () => {
    const fetchFn = jest.fn(async () => jsonResponse(404));
    expect(await client(fetchFn).removeMember('t', 'u')).toEqual({
      ok: false,
      reason: 'not-found',
      status: 404,
      message: undefined,
    });
  });

  it('reports a network failure as unavailable', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await client(fetchFn).listMembers('t')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('reports missing credentials as forbidden without calling GitHub', async () => {
    const fetchFn = jest.fn();
    const result = await createGithubTeamsClient({
      organization: 'pharma-data-factory',
      credentialsProvider: {
        getCredentials: async () => {
          throw new Error('No installation for pharma-data-factory');
        },
      },
      fetchFn: fetchFn as unknown as typeof fetch,
    }).listMembers('t');

    expect(result).toEqual({ ok: false, reason: 'forbidden' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('uses a GitHub Enterprise API base and encodes path segments', async () => {
    const fetchFn = jest.fn(async () => jsonResponse(200, []));
    await createGithubTeamsClient({
      organization: 'acme',
      host: 'ghe.acme.com',
      apiBaseUrl: 'https://ghe.acme.com/api/v3/',
      credentialsProvider: appCredentials,
      fetchFn: fetchFn as unknown as typeof fetch,
    }).listMembers('team with space');

    expect(call(fetchFn, 0)[0]).toBe(
      'https://ghe.acme.com/api/v3/orgs/acme/teams/team%20with%20space/members?per_page=100&page=1',
    );
    expect(appCredentials.getCredentials).toHaveBeenCalledWith({
      url: 'https://ghe.acme.com/acme',
    });
  });
});
