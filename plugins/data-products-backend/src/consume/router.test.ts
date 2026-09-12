import express from 'express';
import { AddressInfo } from 'net';
import { createServer } from 'http';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import Router from 'express-promise-router';
import { buildUpstreamQueryUrl, mountConsumeRoutes } from './router';

async function get(app: express.Express, urlPath: string) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
}

describe('consume router', () => {
  const catalog = {
    getEntityByRef: jest.fn(),
  };
  const httpAuth = {
    credentials: jest.fn(async () => ({
      $$type: '@backstage/BackstageCredentials',
    })),
  };
  const permissions = {
    authorize: jest.fn(
      async () =>
        [{ result: AuthorizeResult.ALLOW }] as { result: AuthorizeResult }[],
    ),
  };
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    catalog.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'sample-oee-data-product',
        annotations: {
          'dataprod.platform/template': 'oee-data-product',
          'dataprod.platform/interfaces': 'REST',
          'dataprod.platform/validation-status': 'NOT_VALIDATED',
          'dataprod.platform/presentation-extensions': 'oee-dashboard',
          'dataprod.platform/consume-rest-path': '/api/v1/oee',
        },
      },
      spec: {
        type: 'data-product',
        owner: 'group:default/platform-team',
        lifecycle: 'experimental',
      },
    });
  });

  function app(baseUrls: Record<string, string> = {}) {
    const router = Router();
    mountConsumeRoutes(router, {
      logger: logger as any,
      catalog: catalog as any,
      httpAuth: httpAuth as any,
      permissions: permissions as any,
      baseUrls,
    });
    const application = express();
    application.use(router);
    return application;
  }

  it('returns descriptor for a data product', async () => {
    const result = await get(
      app(),
      `/consume/products/${encodeURIComponent('component:default/sample-oee-data-product')}`,
    );
    expect(result.status).toBe(200);
    expect(result.body.name).toBe('sample-oee-data-product');
    expect(result.body.validation.status).toBe('NOT_VALIDATED');
  });

  it('returns fixture query for OEE without upstream', async () => {
    const result = await get(
      app(),
      `/consume/query?entityRef=${encodeURIComponent('component:default/sample-oee-data-product')}&equipment=BOTTLE-FILLER-01`,
    );
    expect(result.status).toBe(200);
    expect(result.body.source).toBe('fixture');
    expect(result.body.rows[0].oee).toBeCloseTo(0.838);
  });

  it('adapts live upstream OEE JSON into Envelope columns', async () => {
    const upstream = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          equipmentId: 'FILLER-01',
          availability: 0.9,
          performance: 0.9,
          quality: 0.9,
          oee: 0.729,
          calculatedAt: '2026-09-10T06:00:00Z',
          context: { site: 'S1', area: 'A1', line: 'L1' },
        }),
      );
    });
    await new Promise<void>(resolve =>
      upstream.listen(0, '127.0.0.1', () => resolve()),
    );
    const { port } = upstream.address() as AddressInfo;
    try {
      const result = await get(
        app({ 'sample-oee-data-product': `http://127.0.0.1:${port}` }),
        `/consume/query?entityRef=${encodeURIComponent('component:default/sample-oee-data-product')}`,
      );
      expect(result.status).toBe(200);
      expect(result.body.source).toBe('upstream');
      expect(result.body.detail).toMatch(/OEE/);
      expect(result.body.rows[0].oee).toBeCloseTo(0.729);
      expect(
        result.body.columns.find((c: { id: string }) => c.id === 'oee')
          .semanticType,
      ).toBe('percentage');
    } finally {
      await new Promise<void>((resolve, reject) =>
        upstream.close(error => (error ? reject(error) : resolve())),
      );
    }
  });

  it('builds upstream URLs with context query params', () => {
    const url = buildUpstreamQueryUrl('http://product:8080', '/api/v1/oee', {
      equipment: 'FILLER-01',
      site: 'S1',
      line: 'L1',
    });
    expect(url).toContain('/api/v1/oee');
    expect(url).toContain('equipmentId=FILLER-01');
    expect(url).toContain('site=S1');
    expect(url).toContain('line=L1');
  });

  it('returns 404 for missing product', async () => {
    catalog.getEntityByRef.mockResolvedValue(undefined);
    const result = await get(
      app(),
      `/consume/products/${encodeURIComponent('component:default/missing')}`,
    );
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('NOT_FOUND');
  });

  it('returns 403 when consume denied', async () => {
    permissions.authorize.mockResolvedValue([{ result: AuthorizeResult.DENY }]);
    const result = await get(
      app(),
      `/consume/query?entityRef=${encodeURIComponent('component:default/sample-oee-data-product')}`,
    );
    expect(result.status).toBe(403);
  });
});
