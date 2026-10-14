import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';

import { FileCertificationOverlay } from './certificationOverlay';
import { createRouter } from './router';
import { GithubActionsClient } from './types';

async function get(app: express.Express, urlPath: string) {
  const server = await listenOnFetchablePort(app);
  try {
    const response = await fetch(`${server.url}${urlPath}`);
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await server.close();
  }
}

describe('data-products router', () => {
  const github: GithubActionsClient = {
    getLatestRun: async () => ({ ok: true, value: undefined }),
    getFailedStages: async () => [],
  };

  const catalog = {
    getEntityByRef: jest.fn(),
    refreshEntity: jest.fn(),
  };

  const httpAuth = {
    credentials: jest.fn(async () => ({
      $$type: '@backstage/BackstageCredentials',
    })),
  };

  async function app() {
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      catalog: catalog as never,
      httpAuth: httpAuth as never,
      github,
    });
    const server = express();
    server.use(router);
    return server;
  }

  it('serves health without requiring GitHub', async () => {
    const response = await get(await app(), '/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns UNKNOWN when entityRef is missing instead of crashing', async () => {
    const response = await get(await app(), '/ci-status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'UNKNOWN',
      representation: 'DEGRADED / UNVERIFIED',
      message: 'Not available',
    });
  });

  it('persists technical certification as a Catalog annotation overlay', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-router-'));
    const overlay = new FileCertificationOverlay(
      path.join(dir, 'certification-overrides.json'),
    );
    catalog.getEntityByRef.mockResolvedValueOnce({
      kind: 'Component',
      metadata: { name: 'cold-room' },
      spec: { type: 'data-product' },
    });
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      catalog: catalog as never,
      httpAuth: httpAuth as never,
      github,
      permissions: {
        authorize: async () => [{ result: AuthorizeResult.ALLOW }],
      } as never,
      certificationOverlay: overlay,
    });
    const server = express();
    server.use(router);
    const listener = await listenOnFetchablePort(server);
    try {
      const response = await fetch(`${listener.url}/certification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityRef: 'component:default/cold-room',
          status: 'CERTIFIED',
        }),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        ok: true,
        status: 'CERTIFIED',
        persisted: true,
        source: 'catalog-annotation-overlay',
      });
      expect(overlay.getStatus('component:default/cold-room')).toBe('CERTIFIED');
      expect(catalog.refreshEntity).toHaveBeenCalled();
    } finally {
      await listener.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('denies technical certification writes without manage permission', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-deny-'));
    const overlay = new FileCertificationOverlay(
      path.join(dir, 'certification-overrides.json'),
    );
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      catalog: catalog as never,
      httpAuth: httpAuth as never,
      github,
      permissions: {
        authorize: async () => [{ result: AuthorizeResult.DENY }],
      } as never,
      certificationOverlay: overlay,
    });
    const server = express();
    server.use(router);
    const listener = await listenOnFetchablePort(server);
    try {
      const response = await fetch(`${listener.url}/certification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityRef: 'component:default/cold-room',
          status: 'CERTIFIED',
        }),
      });
      expect(response.status).toBe(403);
      expect(overlay.getStatus('component:default/cold-room')).toBeUndefined();
    } finally {
      await listener.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('denies CI status reads without data-product view permission', async () => {
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      catalog: catalog as never,
      httpAuth: httpAuth as never,
      github,
      permissions: {
        authorize: async () => [{ result: AuthorizeResult.DENY }],
      } as never,
    });
    const server = express();
    server.use(router);
    const response = await get(server, '/ci-status?entityRef=component:default/cold-room');
    expect(response.status).toBe(403);
  });

  it('returns UNKNOWN when GitHub credentials cannot be established', async () => {
    httpAuth.credentials.mockRejectedValueOnce(new Error('no credentials'));
    const response = await get(
      await app(),
      '/ci-status?entityRef=component:default/cold-room-temperature',
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UNKNOWN');
  });

  describe('GET /release-record (NXD-133)', () => {
    const SHA = 'a'.repeat(40);
    const record = {
      apiVersion: 'nexora.dev/v1alpha1',
      kind: 'ReleaseRecord',
      version: '1.0.0',
      tag: 'v1.0.0',
      commitSha: SHA,
    };
    const releaseWith = (
      assets: Array<{ id: number; name: string; size: number }>,
    ) => ({
      tag: 'v1.0.0',
      url: 'https://github.com/o/r/releases/tag/v1.0.0',
      publishedAt: '2026-10-06T12:00:00Z',
      draft: false,
      prerelease: false,
      assets,
    });

    async function releaseApp(
      releases: GithubActionsClient['listReleases'],
      options: {
        credentials?: unknown;
        allow?: boolean;
        manifestAt?: GithubActionsClient['getFileAtRef'];
      } = {},
    ) {
      const router = await createRouter({
        logger: {
          warn: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          child: jest.fn(),
        } as never,
        catalog: catalog as never,
        httpAuth: {
          credentials: async () =>
            options.credentials ?? {
              principal: { type: 'service', subject: 'plugin:composer' },
            },
        } as never,
        github: {
          ...github,
          listReleases: releases,
          downloadReleaseAsset: async () => ({
            ok: true,
            value: Buffer.from(JSON.stringify(record)),
          }),
          getCommitSha: async () => ({ ok: true, value: SHA }),
          getFileAtRef: options.manifestAt ?? (async () => ({ ok: true, value: 'kind: DATA_PRODUCT\n' })),
        },
        permissions: {
          authorize: async () => [
            {
              result:
                options.allow === false
                  ? AuthorizeResult.DENY
                  : AuthorizeResult.ALLOW,
            },
          ],
        } as never,
      });
      const server = express();
      server.use(router);
      return server;
    }

    const query = '/release-record?repoUrl=https://github.com/o/r&version=1.0';

    it('answers the record, the release and the commit the tag points at', async () => {
      const server = await releaseApp(async () => ({
        ok: true,
        value: [releaseWith([{ id: 5, name: 'nexora-release.json', size: 200 }])],
      }));
      const response = await get(server, query);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        available: true,
        release: {
          tag: 'v1.0.0',
          url: 'https://github.com/o/r/releases/tag/v1.0.0',
          publishedAt: '2026-10-06T12:00:00Z',
          commit: SHA,
        },
        record,
        manifest: 'kind: DATA_PRODUCT\n',
      });
    });

    it('reads the manifest at the commit the tag points at (NXD-137)', async () => {
      const manifestAt = jest.fn(async () => ({ ok: true as const, value: 'x: 1\n' }));
      const server = await releaseApp(
        async () => ({
          ok: true,
          value: [releaseWith([{ id: 5, name: 'nexora-release.json', size: 200 }])],
        }),
        { manifestAt },
      );
      await get(server, query);
      expect(manifestAt).toHaveBeenCalledWith(expect.anything(), 'nexora.yaml', SHA);
    });

    it('still answers the record when the release commit has no manifest', async () => {
      const server = await releaseApp(
        async () => ({
          ok: true,
          value: [releaseWith([{ id: 5, name: 'nexora-release.json', size: 200 }])],
        }),
        { manifestAt: async () => ({ ok: true, value: undefined }) },
      );
      expect((await get(server, query)).body).toMatchObject({
        available: true,
        record,
        manifestReason: 'no-manifest',
      });
    });

    it('says when the version has no release, and when the release has no record', async () => {
      const none = await releaseApp(async () => ({ ok: true, value: [] }));
      expect((await get(none, query)).body).toEqual({
        available: false,
        reason: 'no-release',
      });
      const bare = await releaseApp(async () => ({
        ok: true,
        value: [releaseWith([])],
      }));
      expect((await get(bare, query)).body).toMatchObject({
        available: false,
        reason: 'no-release-record',
        release: { tag: 'v1.0.0' },
      });
    });

    it('refuses an oversized asset without downloading it', async () => {
      const server = await releaseApp(async () => ({
        ok: true,
        value: [
          releaseWith([{ id: 5, name: 'nexora-release.json', size: 10_000_000 }]),
        ],
      }));
      expect((await get(server, query)).body).toMatchObject({
        available: false,
        reason: 'invalid-release-record',
      });
    });

    it('needs a repository URL and a version', async () => {
      const server = await releaseApp(async () => ({ ok: true, value: [] }));
      expect(
        (await get(server, '/release-record?repoUrl=https://github.com/o/r'))
          .status,
      ).toBe(400);
      expect((await get(server, '/release-record?version=1.0')).status).toBe(400);
    });

    it('lets a person read it only with data-product.view', async () => {
      const user = {
        principal: { type: 'user', userEntityRef: 'user:default/x' },
      };
      const denied = await releaseApp(async () => ({ ok: true, value: [] }), {
        credentials: user,
        allow: false,
      });
      expect((await get(denied, query)).status).toBe(403);
      const allowed = await releaseApp(async () => ({ ok: true, value: [] }), {
        credentials: user,
      });
      expect((await get(allowed, query)).status).toBe(200);
    });
  });
});
