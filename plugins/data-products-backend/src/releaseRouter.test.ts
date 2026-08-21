import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import { AuthorizeResult } from '@backstage/plugin-permission-common';

import { FileReleaseOverlay } from './releaseCatalog';
import { createRouter } from './router';
import { GithubActionsClient } from './types';

describe('Golden Path release router', () => {
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

  it('returns version-controlled releases without a product database', async () => {
    const router = await createRouter({
      logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), child: jest.fn() } as never,
      catalog: catalog as never,
      httpAuth: httpAuth as never,
      github,
    });
    const server = express();
    server.use(router);
    const listener = server.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => listener.once('listening', () => resolve()));
    try {
      const { port } = listener.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/releases`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.releases.map((item: { template: string }) => item.template)).toEqual(
        expect.arrayContaining([
          'mqtt-temperature-data-product',
          'rest-equipment-data-product',
        ]),
      );
      expect(body.disclaimer).toMatch(/not GxP/i);
    } finally {
      await new Promise<void>((resolve, reject) =>
        listener.close(error => (error ? reject(error) : resolve())),
      );
    }
  });

  it('denies Developer release approval and allows Platform Admin', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-router-'));
    const overlay = new FileReleaseOverlay(path.join(dir, 'release-overrides.json'));
    const deny = {
      authorize: async () => [{ result: AuthorizeResult.DENY }],
    };
    const allow = {
      authorize: async () => [{ result: AuthorizeResult.ALLOW }],
    };

    async function post(permissions: { authorize: () => Promise<{ result: string }[]> }) {
      const router = await createRouter({
        logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), child: jest.fn() } as never,
        catalog: catalog as never,
        httpAuth: httpAuth as never,
        github,
        permissions: permissions as never,
        releaseOverlay: overlay,
      });
      const server = express();
      server.use(router);
      const listener = server.listen(0, '127.0.0.1');
      await new Promise<void>(resolve => listener.once('listening', () => resolve()));
      try {
        const { port } = listener.address() as AddressInfo;
        return await fetch(`http://127.0.0.1:${port}/releases/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'mqtt-temperature-data-product',
            version: '1.0.0',
            targetStatus: 'DEPRECATED',
          }),
        });
      } finally {
        await new Promise<void>((resolve, reject) =>
          listener.close(error => (error ? reject(error) : resolve())),
        );
      }
    }

    const denied = await post(deny);
    expect(denied.status).toBe(403);

    const approved = await post(allow);
    expect(approved.status).toBe(200);
    await expect(approved.json()).resolves.toMatchObject({
      ok: true,
      status: 'DEPRECATED',
      persisted: true,
    });
    expect(overlay.getStatus('mqtt-temperature-data-product', '1.0.0')).toBe(
      'DEPRECATED',
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
