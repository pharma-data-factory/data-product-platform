import { ConfigReader } from '@backstage/config';

import { createGithubActionsClient } from './githubActions';

const config = new ConfigReader({
  integrations: {
    github: [
      {
        host: 'github.com',
        apiBaseUrl: 'https://api.github.com',
      },
    ],
  },
});

const repo = {
  host: 'github.com',
  owner: 'pharma-data-factory',
  repo: 'cold-room-temperature',
  url: 'https://github.com/pharma-data-factory/cold-room-temperature',
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('createGithubActionsClient', () => {
  it('reads the latest ci.yml run with GitHub App credentials', async () => {
    const fetchFn = jest.fn(async (url: string) => {
      expect(String(url)).toContain(
        '/repos/pharma-data-factory/cold-room-temperature/actions/workflows/ci.yml/runs',
      );
      return jsonResponse(200, {
        workflow_runs: [
          {
            id: 42,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            head_branch: 'main',
            head_sha: 'a82f921abc',
            html_url:
              'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/42',
            run_started_at: '2026-08-17T06:00:00Z',
            updated_at: '2026-08-17T06:05:00Z',
          },
        ],
      });
    });

    const client = createGithubActionsClient({
      config,
      fetchFn: fetchFn as unknown as typeof fetch,
      credentialsProvider: {
        getCredentials: async () => ({
          type: 'app',
          token: 'ghs_test-token',
          headers: { Authorization: 'Bearer ghs_test-token' },
        }),
      },
    });

    const result = await client.getLatestRun(repo);
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        id: 42,
        name: 'CI',
        conclusion: 'success',
      }),
    });
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ghs_test-token',
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain('ghs_test-token');
  });

  it('treats a repository without workflow runs as empty, not an error', async () => {
    const fetchFn = jest.fn(async (url: string) => {
      if (String(url).includes('/workflows/ci.yml/runs')) {
        return jsonResponse(404, { message: 'Not Found' });
      }
      return jsonResponse(200, { workflow_runs: [] });
    });

    const client = createGithubActionsClient({
      config,
      fetchFn: fetchFn as unknown as typeof fetch,
      credentialsProvider: {
        getCredentials: async () => ({ type: 'app', token: 'ghs_test-token' }),
      },
    });

    await expect(client.getLatestRun(repo)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('maps GitHub 403 to inaccessible', async () => {
    const client = createGithubActionsClient({
      config,
      fetchFn: (async () => jsonResponse(403, { message: 'Forbidden' })) as unknown as typeof fetch,
      credentialsProvider: {
        getCredentials: async () => ({ type: 'app', token: 'ghs_test-token' }),
      },
    });

    await expect(client.getLatestRun(repo)).resolves.toEqual({
      ok: false,
      reason: 'inaccessible',
    });
  });

  it('maps network failures to unavailable', async () => {
    const client = createGithubActionsClient({
      config,
      fetchFn: (async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch,
      credentialsProvider: {
        getCredentials: async () => ({ type: 'app', token: 'ghs_test-token' }),
      },
    });

    await expect(client.getLatestRun(repo)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('maps credential failures to inaccessible', async () => {
    const client = createGithubActionsClient({
      config,
      fetchFn: jest.fn() as unknown as typeof fetch,
      credentialsProvider: {
        getCredentials: async () => {
          throw new Error('No token available for host: github.com');
        },
      },
    });

    await expect(client.getLatestRun(repo)).resolves.toEqual({
      ok: false,
      reason: 'inaccessible',
    });
  });

  it('reads failed quality-gate steps from the jobs API', async () => {
    const client = createGithubActionsClient({
      config,
      fetchFn: (async () =>
        jsonResponse(200, {
          jobs: [
            {
              name: 'quality-gate',
              conclusion: 'failure',
              steps: [
                { name: 'Lint', conclusion: 'failure' },
                { name: 'Unit tests', conclusion: 'skipped' },
              ],
            },
          ],
        })) as unknown as typeof fetch,
      credentialsProvider: {
        getCredentials: async () => ({ type: 'app', token: 'ghs_test-token' }),
      },
    });

    await expect(client.getFailedStages(repo, 42)).resolves.toEqual(['Lint']);
  });
});
