/**
 * GET /ci-evidence (NXD-123, NXD-151): the evidence is the default branch's,
 * from a push. Before NXD-151 the newest completed run of any branch was
 * taken, so a pull request's tests could become a version's evidence.
 */

import express from 'express';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { createRouter } from './router';
import { GithubActionsClient } from './types';

describe('GET /ci-evidence (NXD-151)', () => {
  let github: GithubActionsClient & {
    getLatestCompletedRun: jest.Mock;
    getDefaultBranch: jest.Mock;
  };
  let listener: { url: string; close: () => Promise<void> };

  beforeEach(async () => {
    github = {
      getLatestRun: async () => ({ ok: true, value: undefined }),
      getFailedStages: async () => [],
      getLatestCompletedRun: jest.fn(async () => ({ ok: true as const, value: undefined })),
      getDefaultBranch: jest.fn(async () => ({ ok: true as const, value: 'main' })),
      downloadArtifact: async () => ({ ok: true as const, value: undefined }),
    } as never;
    const router = await createRouter({
      logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), child: jest.fn() } as never,
      catalog: { getEntityByRef: jest.fn(), refreshEntity: jest.fn() } as never,
      httpAuth: {
        credentials: jest.fn(async () => ({ principal: { type: 'service', subject: 'plugin:composer' } })),
      } as never,
      github,
      permissions: { authorize: async () => [{ result: AuthorizeResult.ALLOW }] } as never,
    });
    const server = express();
    server.use(router);
    listener = await listenOnFetchablePort(server);
  });

  afterEach(async () => {
    await listener.close();
  });

  const get = (query: string) =>
    fetch(`${listener.url}/ci-evidence?repoUrl=${encodeURIComponent('https://github.com/acme/oee')}${query}`);

  it('reads the default branch’s push runs only', async () => {
    const body = await (await get('')).json();
    expect(body).toEqual({ available: false, reason: 'no-completed-run' });
    expect(github.getDefaultBranch).toHaveBeenCalledWith(expect.objectContaining({ owner: 'acme', repo: 'oee' }));
    expect(github.getLatestCompletedRun).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'acme', repo: 'oee' }),
      { branch: 'main', event: 'push' },
    );
  });

  it('reads another branch only when it is named, still push runs only', async () => {
    await get('&branch=release%2F1.x');
    expect(github.getDefaultBranch).not.toHaveBeenCalled();
    expect(github.getLatestCompletedRun).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'acme', repo: 'oee' }),
      { branch: 'release/1.x', event: 'push' },
    );
  });

  it('answers unavailable, rather than guessing a branch, when the default is unknown', async () => {
    github.getDefaultBranch.mockResolvedValueOnce({ ok: false, reason: 'inaccessible' });
    expect(await (await get('')).json()).toEqual({ available: false, reason: 'inaccessible' });
    expect(github.getLatestCompletedRun).not.toHaveBeenCalled();
  });

  it('names the run’s branch and event', async () => {
    github.getLatestCompletedRun.mockResolvedValueOnce({
      ok: true,
      value: {
        id: 9, name: 'CI', status: 'completed', conclusion: 'success',
        headBranch: 'main', headSha: 'a'.repeat(40), htmlUrl: 'https://github.com/acme/oee/actions/runs/9',
        event: 'push', completedAt: '2026-10-08T10:00:00Z',
      },
    });
    const body = await (await get('')).json();
    expect(body).toEqual({
      available: false,
      reason: 'no-evidence-artifact',
      run: expect.objectContaining({ id: 9, branch: 'main', event: 'push' }),
    });
  });
});

describe('GET /ci-evidence/pull-requests (NXD-152)', () => {
  let github: any;
  let listener: { url: string; close: () => Promise<void> };
  const SHA = 'b'.repeat(40);

  beforeEach(async () => {
    github = {
      getLatestRun: async () => ({ ok: true, value: undefined }),
      getFailedStages: async () => [],
      listOpenPullRequests: jest.fn(async () => ({
        ok: true,
        value: [
          { number: 12, title: 'Implement URS-EPM-003', htmlUrl: 'https://github.com/acme/oee/pull/12', headRef: 'ai/urs-epm-003', headSha: SHA, draft: false, author: 'claude' },
          { number: 11, title: 'Old work', htmlUrl: 'https://github.com/acme/oee/pull/11', headRef: 'feature/x', headSha: 'c'.repeat(40), draft: true },
        ],
      })),
      getLatestCompletedRun: jest.fn(async (_repo: unknown, filter: { branch: string }) =>
        filter.branch === 'ai/urs-epm-003'
          ? { ok: true, value: { id: 41, name: 'CI', status: 'completed', conclusion: 'success', headBranch: filter.branch, headSha: SHA, htmlUrl: 'https://github.com/acme/oee/actions/runs/41', event: 'pull_request', completedAt: '2026-10-08T12:00:00Z' } }
          : { ok: true, value: undefined },
      ),
      downloadArtifact: jest.fn(async () => ({ ok: true, value: undefined })),
    };
    const router = await createRouter({
      logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), child: jest.fn() } as never,
      catalog: { getEntityByRef: jest.fn(), refreshEntity: jest.fn() } as never,
      httpAuth: {
        credentials: jest.fn(async () => ({ principal: { type: 'service', subject: 'plugin:composer' } })),
      } as never,
      github,
      permissions: { authorize: async () => [{ result: AuthorizeResult.ALLOW }] } as never,
    });
    const server = express();
    server.use(router);
    listener = await listenOnFetchablePort(server);
  });

  afterEach(async () => {
    await listener.close();
  });

  it('reads each open pull request’s own pull_request run, and says what is missing', async () => {
    const body = await (
      await fetch(`${listener.url}/ci-evidence/pull-requests?repoUrl=${encodeURIComponent('https://github.com/acme/oee')}`)
    ).json();
    expect(github.listOpenPullRequests).toHaveBeenCalledWith(expect.objectContaining({ repo: 'oee' }), 10);
    expect(github.getLatestCompletedRun).toHaveBeenCalledWith(expect.anything(), {
      branch: 'ai/urs-epm-003',
      event: 'pull_request',
    });
    expect(body.pullRequests).toEqual([
      expect.objectContaining({
        number: 12,
        available: false,
        reason: 'no-evidence-artifact',
        stale: false,
        run: expect.objectContaining({ id: 41, event: 'pull_request' }),
      }),
      expect.objectContaining({ number: 11, available: false, reason: 'no-completed-run', draft: true }),
    ]);
  });

  it('marks a run that tested an older head as stale', async () => {
    github.listOpenPullRequests.mockResolvedValueOnce({
      ok: true,
      value: [{ number: 12, title: 't', htmlUrl: 'u', headRef: 'ai/urs-epm-003', headSha: 'd'.repeat(40), draft: false }],
    });
    const body = await (
      await fetch(`${listener.url}/ci-evidence/pull-requests?repoUrl=${encodeURIComponent('https://github.com/acme/oee')}`)
    ).json();
    expect(body.pullRequests[0].stale).toBe(true);
  });
});
