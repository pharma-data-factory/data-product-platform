import express from 'express';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import Router from 'express-promise-router';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { mountConsumeRoutes } from './router';

async function get(app: express.Express, urlPath: string) {
  const server = await listenOnFetchablePort(app);
  try {
    const response = await fetch(`${server.url}${urlPath}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await server.close();
  }
}

describe('consume router', () => {
  const catalog = {
    getEntityByRef: jest.fn(),
  };
  const httpAuth = {
    credentials: jest.fn(async () => ({ $$type: '@backstage/BackstageCredentials' })),
  };
  const permissions = {
    authorize: jest.fn(async () => [{ result: AuthorizeResult.ALLOW }] as { result: AuthorizeResult }[]),
  };
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

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
        },
      },
      spec: { type: 'data-product', owner: 'group:default/platform-team', lifecycle: 'experimental' },
    });
  });

  function app(
    consume: {
      baseUrls?: Record<string, string>;
      allowedOrigins?: string[];
    } = {},
  ) {
    const router = Router();
    mountConsumeRoutes(router, {
      logger: logger as any,
      catalog: catalog as any,
      httpAuth: httpAuth as any,
      permissions: permissions as any,
      baseUrls: consume.baseUrls ?? {},
      allowedOrigins: consume.allowedOrigins,
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

  describe('upstream resolution (NXD-091)', () => {
    const queryPath = `/consume/query?entityRef=${encodeURIComponent(
      'component:default/sample-oee-data-product',
    )}`;
    const upstreamCalls: string[] = [];
    let upstreamServer: Awaited<ReturnType<typeof listenOnFetchablePort>>;

    beforeAll(async () => {
      const upstream = express();
      upstream.get('/api/v1', (req, res) => {
        upstreamCalls.push(req.url);
        res.json([{ oee: 0.9 }]);
      });
      upstream.get('/redirect', (_req, res) => {
        upstreamCalls.push('/redirect');
        res.redirect('http://169.254.169.254/latest/meta-data/');
      });
      upstreamServer = await listenOnFetchablePort(upstream);
    });

    afterAll(async () => {
      await upstreamServer.close();
    });

    beforeEach(() => {
      upstreamCalls.length = 0;
      // clearAllMocks keeps implementations; the 403 test above leaves DENY.
      permissions.authorize.mockResolvedValue([
        { result: AuthorizeResult.ALLOW },
      ]);
    });

    function withAnnotations(annotations: Record<string, string>) {
      catalog.getEntityByRef.mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'sample-oee-data-product', annotations },
        spec: { type: 'data-product', owner: 'group:default/platform-team' },
      });
    }

    it('proxies to an operator-configured loopback upstream', async () => {
      const result = await get(
        app({ baseUrls: { 'sample-oee-data-product': upstreamServer.url } }),
        queryPath,
      );
      expect(result.body.source).toBe('upstream');
      expect(result.body.rows).toEqual([{ oee: 0.9 }]);
      expect(upstreamCalls).toEqual(['/api/v1']);
    });

    it('never contacts a loopback host named only by the annotation', async () => {
      // The finding: whoever controls catalog-info.yaml chose the host.
      withAnnotations({
        'dataprod.platform/consume-base-url': upstreamServer.url,
      });
      const result = await get(
        app({ allowedOrigins: [upstreamServer.url] }),
        queryPath,
      );
      expect(result.body).toMatchObject({
        source: 'unavailable',
        detail: 'UPSTREAM_ADDRESS_NOT_PUBLIC',
      });
      expect(upstreamCalls).toEqual([]);
    });

    it('does not fall back to fixtures when the annotation was refused', async () => {
      withAnnotations({
        'dataprod.platform/consume-base-url': 'http://169.254.169.254',
      });
      const result = await get(app(), queryPath);
      expect(result.body).toMatchObject({
        source: 'unavailable',
        detail: 'UPSTREAM_ORIGIN_NOT_ALLOWED',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('UPSTREAM_ORIGIN_NOT_ALLOWED'),
      );
    });

    it('refuses a rest path that would move a configured base to another host', async () => {
      withAnnotations({ 'dataprod.platform/consume-rest-path': '@evil.example/x' });
      const result = await get(
        app({ baseUrls: { 'sample-oee-data-product': upstreamServer.url } }),
        queryPath,
      );
      expect(result.body.detail).toBe('UPSTREAM_PATH_INVALID');
      expect(upstreamCalls).toEqual([]);
    });

    it('does not follow an upstream redirect', async () => {
      withAnnotations({ 'dataprod.platform/consume-rest-path': '/redirect' });
      const result = await get(
        app({ baseUrls: { 'sample-oee-data-product': upstreamServer.url } }),
        queryPath,
      );
      expect(upstreamCalls).toEqual(['/redirect']);
      expect(result.body).toMatchObject({
        source: 'unavailable',
        detail: 'UPSTREAM_UNAVAILABLE',
      });
    });
  });
});
