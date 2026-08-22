import express from 'express';
import { AddressInfo } from 'net';
import { ConfigReader } from '@backstage/config';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { createRouter } from './router';

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

describe('nexora industrial router', () => {
  const httpAuth = {
    credentials: jest.fn(async () => ({
      $$type: '@backstage/BackstageCredentials',
    })),
  };
  const allow = {
    authorize: jest.fn(async () => [{ result: AuthorizeResult.ALLOW }]),
  };
  const deny = {
    authorize: jest.fn(async () => [{ result: AuthorizeResult.DENY }]),
  };

  async function app(
    permissions: typeof allow | typeof deny = allow,
  ) {
    const router = await createRouter({
      logger: { warn: jest.fn(), info: jest.fn() } as never,
      config: new ConfigReader({ nexora: { providers: { mode: 'mock' } } }),
      httpAuth: httpAuth as never,
      permissions: permissions as never,
    });
    const server = express();
    server.use(router);
    return server;
  }

  it('returns healthy OEE quality from the mock provider', async () => {
    const response = await get(
      await app(),
      '/quality?entityRef=component:default/filler-01-oee',
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.data.freshness.state).toBe('HEALTHY');
    expect(response.body.data.completeness.value).toBe('99.8 %');
  });

  it('returns warning and error quality without exposing credentials', async () => {
    const response = await get(
      await app(),
      '/quality?entityRef=component:default/line04-equipment-state',
    );
    expect(response.body.data.freshness.state).toBe('ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(/secret|token|password/i);
  });

  it('returns unconfigured when no fixture exists', async () => {
    const response = await get(
      await app(),
      '/connectivity?entityRef=component:default/unknown-asset',
    );
    expect(response.body.status).toBe('unconfigured');
  });

  it('returns MQTT connectivity for filler-01', async () => {
    const response = await get(
      await app(),
      '/connectivity?entityRef=component:default/filler-01',
    );
    expect(response.body.data[0]).toMatchObject({
      kind: 'MQTT',
      state: 'CONNECTED',
    });
  });

  it('denies industrial reads when view permission is not granted', async () => {
    const response = await get(
      await app(deny),
      '/quality?entityRef=component:default/filler-01-oee',
    );
    expect(response.status).toBe(403);
  });
});
