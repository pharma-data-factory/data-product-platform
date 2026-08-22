import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import { AuthorizeResult } from '@backstage/plugin-permission-common';

import { FileCertificationOverlay } from './certificationOverlay';
import { createRouter } from './router';
import { GithubActionsClient } from './types';

async function get(app: express.Express, urlPath: string) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`);
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
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
    const listener = server.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => listener.once('listening', () => resolve()));
    try {
      const { port } = listener.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/certification`, {
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
      await new Promise<void>((resolve, reject) =>
        listener.close(error => (error ? reject(error) : resolve())),
      );
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
    const listener = server.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => listener.once('listening', () => resolve()));
    try {
      const { port } = listener.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/certification`, {
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
      await new Promise<void>((resolve, reject) =>
        listener.close(error => (error ? reject(error) : resolve())),
      );
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
});
