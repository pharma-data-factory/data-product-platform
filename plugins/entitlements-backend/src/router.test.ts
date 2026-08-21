import express from 'express';
import { AddressInfo } from 'net';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { ConfigReader } from '@backstage/config';
import { createRouter } from './router';
import { createEntitlementRuntime } from './runtime';

async function request(
  app: express.Express,
  urlPath: string,
  init?: RequestInit,
) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${urlPath}`, init);
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe('entitlements router', () => {
  const httpAuth = {
    credentials: jest.fn(async () => ({
      $$type: '@backstage/BackstageCredentials',
      principal: { type: 'user', userEntityRef: 'user:default/developer' },
    })),
  };
  const userInfo = {
    getUserInfo: jest.fn(async () => ({
      userEntityRef: 'user:default/developer',
      ownershipEntityRefs: [
        'user:default/developer',
        'group:default/data-product-developers',
      ],
    })),
  };
  const allow = {
    authorize: jest.fn(async () => [{ result: AuthorizeResult.ALLOW }]),
  };
  const deny = {
    authorize: jest.fn(async () => [{ result: AuthorizeResult.DENY }]),
  };

  async function app(permissions: { authorize: jest.Mock } = allow) {
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({}),
    });
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      httpAuth: httpAuth as never,
      userInfo: userInfo as never,
      permissions: permissions as never,
      runtime,
    });
    const server = express();
    server.use(router);
    server.use(
      (
        error: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        const status = error.name === 'NotAllowedError' ? 403 : 400;
        res.status(status).json({ error: error.message });
      },
    );
    return server;
  }

  it('serves health without AWS credentials', async () => {
    const response = await request(await app(), '/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns local entitlements for the internal organization', async () => {
    const response = await request(await app(), '/entitlements');
    expect(response.status).toBe(200);
    expect(response.body.organizationId).toBe('internal');
    expect(response.body.provider).toBe('local');
    expect(response.body.capabilities).toEqual(
      expect.arrayContaining([
        'golden-path.mqtt-temperature',
        'golden-path.rest-equipment',
        'platform.core',
      ]),
    );
  });

  it('enforces create with RBAC and entitlement together', async () => {
    const allowed = await request(await app(), '/authorize-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'mqtt-temperature-data-product' }),
    });
    expect(allowed.status).toBe(200);
    expect(allowed.body.allowed).toBe(true);

    userInfo.getUserInfo.mockResolvedValueOnce({
      userEntityRef: 'user:default/viewer',
      ownershipEntityRefs: [
        'user:default/viewer',
        'group:default/platform-viewers',
      ],
    });
    const rbacDenied = await request(await app(), '/authorize-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'mqtt-temperature-data-product' }),
    });
    expect(rbacDenied.status).toBe(403);
    expect(rbacDenied.body.reason).toBe('RBAC');
  });

  it('denies admin views to non-admins', async () => {
    const response = await request(await app(deny), '/admin/entitlements');
    expect(response.status).toBe(403);
  });

  it('does not enable SaaS registration or log the Marketplace token', async () => {
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(),
    };
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({}),
    });
    const router = await createRouter({
      logger: logger as never,
      httpAuth: httpAuth as never,
      userInfo: userInfo as never,
      permissions: allow as never,
      runtime,
    });
    const server = express();
    server.use(router);
    const response = await request(server, '/marketplace/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'x-amzn-marketplace-token': 'super-secret-registration-token',
      }),
    });
    expect(response.status).toBe(503);
    expect(response.body.tenantCreated).toBe(false);
    expect(response.body.accessGranted).toBe(false);
    expect(response.body.status).toBe('NOT_CONFIGURED');
    expect(JSON.stringify(response.body)).not.toContain(
      'super-secret-registration-token',
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
      'super-secret-registration-token',
    );
    expect(JSON.stringify(runtime.service.auditTrail())).not.toContain(
      'super-secret-registration-token',
    );
  });

  it('never exposes AWS credentials on the integration status page', async () => {
    httpAuth.credentials.mockResolvedValueOnce({
      $$type: '@backstage/BackstageCredentials',
      principal: { type: 'user', userEntityRef: 'user:default/admin' },
    } as never);
    const response = await request(await app(), '/integration');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('NOT_CONFIGURED');
    expect(response.body.failClosed).toBe(false);
    expect(response.body.environment).toBe('local');
    expect(JSON.stringify(response.body)).not.toMatch(
      /AWS_ACCESS_KEY|AWS_SECRET|session|registration.?token/i,
    );
    expect(response.body.legalDistributionStatus).toBe('BLOCKED');
  });

  it('allows Platform Admin to approve a link and denies other roles', async () => {
    const storeRuntime = createEntitlementRuntime({
      config: new ConfigReader({}),
    });
    const pending = storeRuntime.linkStore.recordPending({
      awsAccountId: '123456789012',
      licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
    });
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      httpAuth: httpAuth as never,
      userInfo: userInfo as never,
      permissions: allow as never,
      runtime: storeRuntime,
    });
    const server = express();
    server.use(router);
    server.use(
      (
        error: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        const status = error.name === 'NotAllowedError' ? 403 : 400;
        res.status(status).json({ error: error.message });
      },
    );
    const developerDenied = await request(
      server,
      `/admin/marketplace-links/${pending.id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: 'internal' }),
      },
    );
    expect(developerDenied.status).toBe(403);

    userInfo.getUserInfo.mockResolvedValueOnce({
      userEntityRef: 'user:default/admin',
      ownershipEntityRefs: [
        'user:default/admin',
        'group:default/platform-admins',
      ],
    });
    const adminAllowed = await request(
      server,
      `/admin/marketplace-links/${pending.id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: 'internal' }),
      },
    );
    expect(adminAllowed.status).toBe(200);
    expect(adminAllowed.body.link.status).toBe('APPROVED');
    expect(JSON.stringify(adminAllowed.body)).not.toMatch(/AWS_SECRET/);
  });
});
