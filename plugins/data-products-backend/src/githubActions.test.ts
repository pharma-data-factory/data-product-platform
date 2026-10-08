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

  describe('test evidence (NXD-123)', () => {
    const credentialsProvider = {
      getCredentials: async () => ({
        type: 'token' as const,
        token: 'tok',
        headers: { Authorization: 'Bearer tok' },
      }),
    };

    it('asks for the newest completed ci.yml run', async () => {
      const fetchFn = jest.fn(async () =>
        jsonResponse(200, {
          workflow_runs: [
            { id: 7, name: 'CI', status: 'completed', conclusion: 'success', head_sha: 'abc', html_url: 'u' },
          ],
        }),
      );
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      const run = await client.getLatestCompletedRun!(repo);
      expect(run).toMatchObject({ ok: true, value: { id: 7, headSha: 'abc' } });
      expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain(
        '/actions/workflows/ci.yml/runs?status=completed&per_page=1',
      );
    });

    it('narrows the completed run to a branch and an event (NXD-151)', async () => {
      const fetchFn = jest.fn(async () => jsonResponse(200, { workflow_runs: [{ id: 8, event: 'push' }] }));
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      const run = await client.getLatestCompletedRun!(repo, { branch: 'release/1.x', event: 'push' });
      expect(run).toMatchObject({ ok: true, value: { id: 8, event: 'push' } });
      expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain(
        '/actions/workflows/ci.yml/runs?status=completed&branch=release%2F1.x&event=push&per_page=1',
      );
    });

    it('lists open pull requests with their head (NXD-152)', async () => {
      const fetchFn = jest.fn(async () =>
        jsonResponse(200, [
          { number: 3, title: 'T', html_url: 'u', head: { ref: 'ai/x', sha: 's' }, user: { login: 'claude' }, draft: true },
          { title: 'not a pull request' },
        ]),
      );
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      expect(await client.listOpenPullRequests!(repo, 10)).toEqual({
        ok: true,
        value: [{ number: 3, title: 'T', htmlUrl: 'u', headRef: 'ai/x', headSha: 's', author: 'claude', draft: true }],
      });
      expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain(
        '/pulls?state=open&sort=updated&direction=desc&per_page=10',
      );
    });

    it('fires a repository_dispatch event with a JSON body (NXD-153)', async () => {
      const fetchFn = jest.fn(async () => ({ ok: true, status: 204 }) as Response);
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      expect(
        await client.dispatchRepositoryEvent!(repo, 'nexora-ai-build', { assignmentId: 'a' }),
      ).toEqual({ ok: true, value: undefined });
      const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.github.com/repos/pharma-data-factory/cold-room-temperature/dispatches');
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({
        event_type: 'nexora-ai-build',
        client_payload: { assignmentId: 'a' },
      });
      expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer /);
    });

    it('a refused dispatch is a reason, not a throw (NXD-153)', async () => {
      const fetchFn = jest.fn(async () => jsonResponse(403, {}));
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      expect(await client.dispatchRepositoryEvent!(repo, 'e', {})).toEqual({
        ok: false,
        reason: 'inaccessible',
      });
    });

    it('finds the repository’s own pull request by head branch, merged or not (NXD-153)', async () => {
      const fetchFn = jest.fn(async () =>
        jsonResponse(200, [
          {
            number: 8, title: 'AI build', html_url: 'https://github.com/x/pull/8', state: 'closed',
            head: { ref: 'nexora/ai-1', sha: 'abc' }, user: { login: 'github-actions[bot]' },
            merged_at: '2026-10-08T15:00:00Z', closed_at: '2026-10-08T15:00:00Z', merge_commit_sha: 'm1',
          },
        ]),
      );
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      expect(await client.findPullRequestByHead!(repo, 'nexora/ai-1')).toEqual({
        ok: true,
        value: {
          number: 8, title: 'AI build', htmlUrl: 'https://github.com/x/pull/8', headRef: 'nexora/ai-1',
          headSha: 'abc', author: 'github-actions[bot]', draft: false, state: 'closed', merged: true,
          mergedAt: '2026-10-08T15:00:00Z', mergeCommitSha: 'm1', closedAt: '2026-10-08T15:00:00Z',
        },
      });
      expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain(
        '/pulls?state=all&head=pharma-data-factory%3Anexora%2Fai-1&per_page=1',
      );
    });

    it('finds a workflow run by a marker in its title; no workflow is no run (NXD-153)', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            workflow_runs: [
              { id: 1, display_title: 'Nexora AI build other', status: 'completed' },
              { id: 2, display_title: 'Nexora AI build wanted', status: 'in_progress', html_url: 'u' },
            ],
          }),
        )
        .mockResolvedValueOnce(jsonResponse(404, {}));
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      const found = await client.findWorkflowRun!(repo, 'nexora-ai-build.yml', 'wanted');
      expect(found).toEqual({ ok: true, value: expect.objectContaining({ id: 2, status: 'in_progress' }) });
      expect(await client.findWorkflowRun!(repo, 'nexora-ai-build.yml', 'wanted')).toEqual({
        ok: true,
        value: undefined,
      });
    });

    it('reads the default branch from the repository (NXD-151)', async () => {
      const fetchFn = jest.fn(async () => jsonResponse(200, { default_branch: 'trunk' }));
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      expect(await client.getDefaultBranch!(repo)).toEqual({ ok: true, value: 'trunk' });
    });

    it('downloads the named, unexpired artifact of a run as bytes', async () => {
      const zipBytes = Buffer.from('PK-zip-bytes');
      const fetchFn = jest.fn(async (url: string) => {
        if (String(url).endsWith('/actions/runs/7/artifacts?per_page=100')) {
          return jsonResponse(200, {
            artifacts: [
              { id: 1, name: 'nexora-test-evidence', expired: true },
              { id: 2, name: 'other' },
              { id: 3, name: 'nexora-test-evidence', expired: false },
            ],
          });
        }
        if (String(url).endsWith('/actions/artifacts/3/zip')) {
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => zipBytes,
          } as unknown as Response;
        }
        return jsonResponse(404, {});
      });
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      const result = await client.downloadArtifact!(repo, 7, 'nexora-test-evidence');
      expect(result.ok && result.value?.toString()).toBe('PK-zip-bytes');
    });

    it('answers no artifact when the run uploaded none', async () => {
      const fetchFn = jest.fn(async () => jsonResponse(200, { artifacts: [] }));
      const client = createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });
      expect(await client.downloadArtifact!(repo, 7, 'nexora-test-evidence')).toEqual({
        ok: true,
        value: undefined,
      });
    });
  });

  describe('releases (NXD-133)', () => {
    const credentialsProvider = {
      getCredentials: async () => ({
        type: 'token' as const,
        token: 'tok',
        headers: { Authorization: 'Bearer tok' },
      }),
    };
    const client = (fetchFn: jest.Mock) =>
      createGithubActionsClient({
        config,
        fetchFn: fetchFn as unknown as typeof fetch,
        credentialsProvider,
      });

    it('lists releases with their assets', async () => {
      const fetchFn = jest.fn(async () =>
        jsonResponse(200, [
          {
            tag_name: 'v1.0.0',
            html_url: 'https://github.com/o/r/releases/tag/v1.0.0',
            published_at: '2026-10-06T12:00:00Z',
            draft: false,
            prerelease: false,
            assets: [{ id: 5, name: 'nexora-release.json', size: 600 }],
          },
        ]),
      );
      expect(await client(fetchFn).listReleases!(repo)).toEqual({
        ok: true,
        value: [
          {
            tag: 'v1.0.0',
            url: 'https://github.com/o/r/releases/tag/v1.0.0',
            publishedAt: '2026-10-06T12:00:00Z',
            draft: false,
            prerelease: false,
            assets: [{ id: 5, name: 'nexora-release.json', size: 600 }],
          },
        ],
      });
      expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain(
        '/releases?per_page=100',
      );
    });

    it('asks for an asset as bytes, not as its JSON description', async () => {
      const fetchFn = jest.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from('{"kind":"ReleaseRecord"}'),
      }));
      const result = await client(fetchFn).downloadReleaseAsset!(repo, 5);
      expect(result.ok && result.value.toString()).toBe('{"kind":"ReleaseRecord"}');
      const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/releases/assets/5');
      expect((init.headers as Record<string, string>).Accept).toBe(
        'application/octet-stream',
      );
    });

    it('resolves the commit a tag points at', async () => {
      const fetchFn = jest.fn(async () => jsonResponse(200, { sha: 'f'.repeat(40) }));
      expect(await client(fetchFn).getCommitSha!(repo, 'v1.0.0')).toEqual({
        ok: true,
        value: 'f'.repeat(40),
      });
      expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain(
        '/commits/v1.0.0',
      );
    });

    it('reads a file at a ref as raw text, and a missing file as nothing (NXD-137)', async () => {
      const fetchFn = jest.fn(async (url: string) =>
        String(url).includes('/contents/nexora.yaml')
          ? ({ ok: true, status: 200, text: async () => 'kind: DATA_PRODUCT\n' } as unknown as Response)
          : jsonResponse(404, {}),
      );
      const result = await client(fetchFn).getFileAtRef!(repo, 'nexora.yaml', 'a'.repeat(40));
      expect(result).toEqual({ ok: true, value: 'kind: DATA_PRODUCT\n' });
      const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain(`/contents/nexora.yaml?ref=${'a'.repeat(40)}`);
      expect((init.headers as Record<string, string>).Accept).toBe('application/vnd.github.raw');
      expect(await client(fetchFn).getFileAtRef!(repo, 'missing.yaml', 'main')).toEqual({
        ok: true,
        value: undefined,
      });
    });

    it('maps a missing repository to not-found', async () => {
      const fetchFn = jest.fn(async () => jsonResponse(404, {}));
      expect(await client(fetchFn).listReleases!(repo)).toEqual({
        ok: false,
        reason: 'not-found',
      });
    });
  });
});

