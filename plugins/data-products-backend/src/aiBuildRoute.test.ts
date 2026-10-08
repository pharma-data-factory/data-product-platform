/**
 * NXD-153. The AI build: data-products fires the repository_dispatch event a
 * Golden Path's workflow listens for, and reports what GitHub shows of an
 * assignment. Only the Composer, as a service, may dispatch.
 */

import express from 'express';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { createRouter } from './router';

const ID = '0f8b7c4e-1d2a-4b3c-9e8f-0123456789ab';
const REPO_URL = 'https://github.com/acme/oee';

describe('AI build routes (NXD-153)', () => {
  let github: any;
  let principal: { type: string; subject?: string; userEntityRef?: string };
  let listener: { url: string; close: () => Promise<void> };

  beforeEach(async () => {
    principal = { type: 'service', subject: 'plugin:composer' };
    github = {
      getLatestRun: async () => ({ ok: true, value: undefined }),
      getFailedStages: async () => [],
      getDefaultBranch: jest.fn(async () => ({ ok: true, value: 'main' })),
      getFileAtRef: jest.fn(async () => ({
        ok: true,
        value: 'name: Nexora AI build',
      })),
      dispatchRepositoryEvent: jest.fn(async () => ({
        ok: true,
        value: undefined,
      })),
      findWorkflowRun: jest.fn(async () => ({ ok: true, value: undefined })),
      findPullRequestByHead: jest.fn(async () => ({
        ok: true,
        value: undefined,
      })),
    };
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      catalog: { getEntityByRef: jest.fn(), refreshEntity: jest.fn() } as never,
      httpAuth: {
        credentials: jest.fn(
          async (_req: unknown, opts: { allow: string[] }) => {
            if (!opts.allow.includes(principal.type)) {
              const error = new Error('not allowed');
              error.name = 'NotAllowedError';
              throw error;
            }
            return { principal };
          },
        ),
      } as never,
      github,
      permissions: {
        authorize: async () => [{ result: AuthorizeResult.ALLOW }],
      } as never,
    });
    const server = express();
    server.use(router);
    listener = await listenOnFetchablePort(server);
  });

  afterEach(async () => {
    await listener.close();
  });

  const dispatch = (body: unknown) =>
    fetch(`${listener.url}/ai-build/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  describe('POST /ai-build/dispatch', () => {
    it('fires nexora-ai-build with the payload when the default branch has the workflow', async () => {
      const payload = {
        assignmentId: ID,
        model: 'claude-opus-5-5',
        requirements: [],
      };
      const response = await dispatch({ repoUrl: REPO_URL, payload });
      expect(await response.json()).toEqual({
        dispatched: true,
        repository: 'acme/oee',
        defaultBranch: 'main',
        branch: `nexora/ai-${ID}`,
      });
      expect(github.getFileAtRef).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'acme', repo: 'oee' }),
        '.github/workflows/nexora-ai-build.yml',
        'main',
      );
      expect(github.dispatchRepositoryEvent).toHaveBeenCalledWith(
        expect.objectContaining({ repo: 'oee' }),
        'nexora-ai-build',
        payload,
      );
    });

    it('does not dispatch into a repository that has no AI build workflow', async () => {
      github.getFileAtRef.mockResolvedValueOnce({ ok: true, value: undefined });
      expect(
        await (
          await dispatch({ repoUrl: REPO_URL, payload: { assignmentId: ID } })
        ).json(),
      ).toEqual({
        dispatched: false,
        reason: 'no-ai-build-workflow',
      });
      expect(github.dispatchRepositoryEvent).not.toHaveBeenCalled();
    });

    it('passes GitHub’s refusal on as a reason', async () => {
      github.dispatchRepositoryEvent.mockResolvedValueOnce({
        ok: false,
        reason: 'inaccessible',
      });
      expect(
        await (
          await dispatch({ repoUrl: REPO_URL, payload: { assignmentId: ID } })
        ).json(),
      ).toEqual({
        dispatched: false,
        reason: 'inaccessible',
      });
    });

    it('refuses a payload GitHub would refuse, and an assignment id that is not a UUID', async () => {
      const tooMany = Object.fromEntries(
        Array.from({ length: 11 }, (_, i) => [`k${i}`, i]),
      );
      expect(
        (
          await dispatch({
            repoUrl: REPO_URL,
            payload: { ...tooMany, assignmentId: ID },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await dispatch({
            repoUrl: REPO_URL,
            payload: { assignmentId: ID, big: 'x'.repeat(61_000) },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await dispatch({
            repoUrl: REPO_URL,
            payload: { assignmentId: 'main; rm -rf' },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await dispatch({
            repoUrl: 'not a url',
            payload: { assignmentId: ID },
          })
        ).status,
      ).toBe(400);
      expect(github.dispatchRepositoryEvent).not.toHaveBeenCalled();
    });

    it('is refused to a person: only the Composer dispatches, after it recorded the assignment', async () => {
      principal = { type: 'user', userEntityRef: 'user:default/dev' };
      expect(
        (await dispatch({ repoUrl: REPO_URL, payload: { assignmentId: ID } }))
          .status,
      ).toBe(403);
      expect(github.dispatchRepositoryEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET /ai-build/status', () => {
    const status = (id = ID) =>
      fetch(
        `${listener.url}/ai-build/status?repoUrl=${encodeURIComponent(
          REPO_URL,
        )}&assignmentId=${id}`,
      );

    it('names the run by the assignment id and the pull request by its branch', async () => {
      github.findWorkflowRun.mockResolvedValueOnce({
        ok: true,
        value: {
          id: 5,
          name: 'Nexora AI build',
          status: 'completed',
          conclusion: 'success',
          headBranch: 'main',
          headSha: 's',
          htmlUrl: 'https://github.com/acme/oee/actions/runs/5',
          completedAt: '2026-10-08T14:00:00Z',
        },
      });
      github.findPullRequestByHead.mockResolvedValueOnce({
        ok: true,
        value: {
          number: 9,
          title: 'AI build',
          htmlUrl: 'https://github.com/acme/oee/pull/9',
          headRef: `nexora/ai-${ID}`,
          headSha: 'h',
          draft: false,
          state: 'closed',
          merged: true,
          mergedAt: '2026-10-08T15:00:00Z',
        },
      });
      expect(await (await status()).json()).toEqual({
        available: true,
        branch: `nexora/ai-${ID}`,
        run: {
          id: 5,
          url: 'https://github.com/acme/oee/actions/runs/5',
          status: 'completed',
          conclusion: 'success',
          completedAt: '2026-10-08T14:00:00Z',
        },
        pullRequest: {
          number: 9,
          title: 'AI build',
          url: 'https://github.com/acme/oee/pull/9',
          headSha: 'h',
          state: 'closed',
          merged: true,
          mergedAt: '2026-10-08T15:00:00Z',
        },
      });
      expect(github.findWorkflowRun).toHaveBeenCalledWith(
        expect.anything(),
        'nexora-ai-build.yml',
        ID,
      );
      expect(github.findPullRequestByHead).toHaveBeenCalledWith(
        expect.anything(),
        `nexora/ai-${ID}`,
      );
    });

    it('says neither exists yet, and refuses an id that is not a UUID', async () => {
      expect(await (await status()).json()).toEqual({
        available: true,
        branch: `nexora/ai-${ID}`,
      });
      expect((await status('x')).status).toBe(400);
    });
  });

  describe('GET /ci-evidence/pull-requests', () => {
    it('takes the dispatched ci.yml run when it is newer than any pull_request run', async () => {
      github.listOpenPullRequests = jest.fn(async () => ({
        ok: true,
        value: [
          {
            number: 9,
            title: 'AI build',
            htmlUrl: 'u',
            headRef: `nexora/ai-${ID}`,
            headSha: 'h',
            draft: false,
          },
        ],
      }));
      github.getLatestCompletedRun = jest.fn(
        async (_repo: unknown, filter: { event: string }) =>
          filter.event === 'workflow_dispatch'
            ? {
                ok: true,
                value: {
                  id: 2,
                  name: 'CI',
                  status: 'completed',
                  conclusion: 'success',
                  headBranch: `nexora/ai-${ID}`,
                  headSha: 'h',
                  htmlUrl: 'r2',
                  event: 'workflow_dispatch',
                  completedAt: '2026-10-08T12:00:00Z',
                },
              }
            : { ok: true, value: undefined },
      );
      github.downloadArtifact = jest.fn(async () => ({
        ok: true,
        value: undefined,
      }));
      const body = await (
        await fetch(
          `${
            listener.url
          }/ci-evidence/pull-requests?repoUrl=${encodeURIComponent(REPO_URL)}`,
        )
      ).json();
      expect(body.pullRequests[0]).toEqual(
        expect.objectContaining({
          reason: 'no-evidence-artifact',
          run: expect.objectContaining({ id: 2, event: 'workflow_dispatch' }),
          stale: false,
        }),
      );
    });
  });
});
