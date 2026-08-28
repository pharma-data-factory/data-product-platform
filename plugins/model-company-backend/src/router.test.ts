import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import express from 'express';
import { AuthenticationError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { ModelCompanyService } from './service';
import { FileSimulationStore } from './store';

const FACTORY = path.resolve(
  __dirname,
  '../../../model-company/factories/model-pharma.yaml',
);

const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => silentLogger,
} as unknown as LoggerService;

/**
 * Unauthenticated caller: httpAuth rejects, so any route that runs the
 * permission check must fail. Only genuinely public routes can answer.
 */
const anonymousHttpAuth = {
  credentials: async () => {
    throw new AuthenticationError('No credentials');
  },
} as never;

/**
 * Permissions always allow, so a rejection can only come from the missing
 * user credentials rather than from an unconfigured permission service.
 */
const permissiveAuthz = {
  authorize: async () => [{ result: AuthorizeResult.ALLOW }],
} as never;

describe('model-company public demo surface', () => {
  let tmp: string;
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-router-'));
    const service = new ModelCompanyService({
      factoryPath: FACTORY,
      store: new FileSimulationStore(
        path.join(tmp, 'state.json'),
        path.join(tmp, 'events.jsonl'),
      ),
      logger: silentLogger,
      brokerConfigured: false,
    });

    const app = express();
    app.use(
      await createRouter({
        logger: silentLogger,
        httpAuth: anonymousHttpAuth,
        permissions: permissiveAuthz,
        service,
      }),
    );

    server = await new Promise<http.Server>(resolve => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind test server');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('serves read-only factory data without a signed-in user', async () => {
    const response = await fetch(`${baseUrl}/public/demo`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.overview.companyName).toBeDefined();
    expect(body.factory.equipmentCount).toBeGreaterThan(0);
    expect(Array.isArray(body.equipment)).toBe(true);
  });

  it('omits internal runtime URLs from the public payload', async () => {
    const body = await (await fetch(`${baseUrl}/public/demo`)).json();
    expect(body.overview.connectivity?.detail).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/runtimeBaseUrl|oeeHealthUrl/);
  });

  it('keeps authenticated read routes closed to anonymous callers', async () => {
    const response = await fetch(`${baseUrl}/overview`);
    expect(response.status).toBe(401);
  });

  it('keeps simulation control closed to anonymous callers', async () => {
    for (const route of [
      '/simulation/start',
      '/simulation/stop',
      '/simulation/reset',
      '/scenarios/run',
    ]) {
      const response = await fetch(`${baseUrl}${route}`, { method: 'POST' });
      expect(response.status).toBe(401);
    }
  });
});
