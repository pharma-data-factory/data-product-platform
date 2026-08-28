import express from 'express';
import { AddressInfo } from 'net';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import Router from 'express-promise-router';
import { mountConsumeRoutes } from './router';

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
    credentials: jest.fn(async () => ({ $$type: '@backstage/BackstageCredentials' })),
  };
  const permissions = {
    authorize: jest.fn(async () => [{ result: AuthorizeResult.ALLOW }]),
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

  function app() {
    const router = Router();
    mountConsumeRoutes(router, {
      logger: logger as any,
      catalog: catalog as any,
      httpAuth: httpAuth as any,
      permissions: permissions as any,
      baseUrls: {},
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
});
