import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';

import { ciStatusForEntity, resolveCiStatus } from './resolveCiStatus';
import { GithubActionsClient, GithubWorkflowRun, QualityStage } from './types';

const credentials = { $$type: '@backstage/BackstageCredentials' } as never;

function productEntity(): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'cold-room-temperature',
      annotations: {
        'github.com/project-slug':
          'pharma-data-factory/cold-room-temperature',
      },
    },
    spec: { type: 'data-product' },
  };
}

function run(
  overrides: Partial<GithubWorkflowRun> = {},
): GithubWorkflowRun {
  return {
    id: 42,
    name: 'CI',
    status: 'completed',
    conclusion: 'success',
    headBranch: 'main',
    headSha: 'a82f921abc1234567890',
    htmlUrl:
      'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/42',
    startedAt: '2026-08-17T06:00:00Z',
    completedAt: '2026-08-17T06:05:00Z',
    ...overrides,
  };
}

function githubClient(
  overrides: Partial<GithubActionsClient> = {},
): GithubActionsClient {
  return {
    getLatestRun: async () => ({ ok: true as const, value: run() }),
    getFailedStages: async () => [],
    ...overrides,
  };
}

describe('resolveCiStatus', () => {
  it('returns PASSED for a successful workflow', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient(),
    });
    expect(status).toMatchObject({
      status: 'PASSED',
      workflowName: 'CI',
      branch: 'main',
      commitSha: 'a82f921',
      htmlUrl:
        'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/42',
    });
    expect(JSON.stringify(status)).not.toContain('ghs_');
  });

  it('returns RUNNING for an in-progress workflow', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({
          ok: true,
          value: run({ status: 'in_progress', conclusion: null, completedAt: undefined }),
        }),
      }),
    });
    expect(status.status).toBe('RUNNING');
  });

  it('returns FAILED and failed quality stages', async () => {
    const getFailedStages = jest.fn(
      async (): Promise<QualityStage[]> =>
        ['Lint', 'Unit Tests'] as QualityStage[],
    );
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({
          ok: true,
          value: run({ conclusion: 'failure' }),
        }),
        getFailedStages,
      }),
    });
    expect(status.status).toBe('FAILED');
    expect(status.failedStages).toEqual(['Lint', 'Unit Tests']);
    expect(getFailedStages).toHaveBeenCalled();
  });

  it('returns CANCELLED for a cancelled workflow', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({
          ok: true,
          value: run({ conclusion: 'cancelled' }),
        }),
      }),
    });
    expect(status.status).toBe('CANCELLED');
  });

  it('returns UNKNOWN when the repository has no workflow run', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({ ok: true, value: undefined }),
      }),
    });
    expect(status.status).toBe('UNKNOWN');
    expect(status.message).toMatch(/no workflow run/i);
  });

  it('returns UNKNOWN when GitHub is unavailable', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({ ok: false, reason: 'unavailable' }),
      }),
    });
    expect(status.status).toBe('UNKNOWN');
    expect(status.message).toMatch(/could not be reached/i);
  });

  it('returns UNKNOWN when no CI workflow exists', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({ ok: false, reason: 'not-found' }),
      }),
    });
    expect(status.status).toBe('UNKNOWN');
    expect(status.message).toMatch(/no ci workflow/i);
  });

  // The pilot-exit gate turns on this case: when the GitHub App lacks
  // Actions: Read-only, GitHub answers 403 and the gate reads UNKNOWN. The
  // operator must be able to tell that apart from "CI simply has not run".
  it('names the missing Actions permission when GitHub denies access', async () => {
    const status = await ciStatusForEntity({
      entity: productEntity(),
      github: githubClient({
        getLatestRun: async () => ({ ok: false, reason: 'inaccessible' }),
      }),
    });
    expect(status.status).toBe('UNKNOWN');
    expect(status.message).toContain('Actions: Read-only');
  });

  it('distinguishes every failure cause by message', async () => {
    const messages = await Promise.all(
      (['inaccessible', 'not-found', 'unavailable'] as const).map(reason =>
        ciStatusForEntity({
          entity: productEntity(),
          github: githubClient({
            getLatestRun: async () => ({ ok: false, reason }),
          }),
        }).then(status => status.message),
      ),
    );
    expect(new Set(messages).size).toBe(3);
  });

  it('returns UNKNOWN when Catalog has no GitHub repository', async () => {
    const status = await ciStatusForEntity({
      entity: {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'sample-product' },
        spec: { type: 'data-product' },
      },
      github: githubClient(),
    });
    expect(status.status).toBe('UNKNOWN');
  });

  it('does not throw when Catalog lookup fails', async () => {
    const catalog = {
      getEntityByRef: jest.fn(async () => {
        throw new Error('catalog down');
      }),
    } as unknown as CatalogService;

    await expect(
      resolveCiStatus({
        entityRef: 'component:default/cold-room-temperature',
        catalog,
        credentials,
        github: githubClient(),
      }),
    ).resolves.toEqual({ status: 'UNKNOWN', message: 'Not available' });
  });
});
