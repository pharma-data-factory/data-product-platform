import express from 'express';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort as listen } from '@internal/backend-test-utils';
import { aasManagePermission, aasReadPermission } from '@internal/platform-common';
import { defaultSeedPath, MemoryAasRepository } from './repository';
import { createAasRouter } from './router';

async function appFor(result: (typeof AuthorizeResult)['ALLOW'] | (typeof AuthorizeResult)['DENY']) {
  const repository = new MemoryAasRepository(defaultSeedPath());
  repository.seed();
  const router = await createAasRouter({
    logger: { info: jest.fn(), warn: jest.fn() } as never,
    httpAuth: {
      credentials: async () => ({
        principal: { type: 'user', userEntityRef: 'user:default/tester' },
      }),
    } as never,
    permissions: {
      authorize: async (queries: Array<{ permission: { name: string } }>) =>
        queries.map(query => ({ permission: query.permission, result })),
    } as never,
    repository,
  });
  const app = express();
  app.use(router);
  app.use(
    (
      error: { name?: string; message?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(error.name === 'NotAllowedError' ? 403 : 500).json({
        detail: error.message,
      });
    },
  );
  return app;
}

describe('AAS router RBAC', () => {
  it('allows reads with aas.read', async () => {
    const server = await listen(await appFor(AuthorizeResult.ALLOW));
    try {
      const response = await fetch(`${server.url}/assets`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ id: string }>;
      expect(body.some(item => item.id === 'filler-01')).toBe(true);
      const health = await fetch(`${server.url}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toMatchObject({
        persistence: 'in-memory',
        prototype: true,
      });
      const lookup = await fetch(
        `${server.url}/resolve/assets/filler-01/properties/speed`,
      );
      expect((await lookup.json()).unit).toBe('rpm');
    } finally {
      await server.close();
    }
  });

  it('denies writes when permission is denied', async () => {
    const server = await listen(await appFor(AuthorizeResult.DENY));
    try {
      const response = await fetch(`${server.url}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'x', displayName: 'X' }),
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    } finally {
      await server.close();
    }
  });
});

describe('AAS permissions are distinct', () => {
  it('keeps read and manage names', () => {
    expect(aasReadPermission.name).toBe('aas.read');
    expect(aasManagePermission.name).toBe('aas.manage');
  });
});
