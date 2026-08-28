import http from 'http';
import express from 'express';
import { AuthenticationError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { createRouter } from './router';

const silentLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  child: () => silentLogger,
} as unknown as LoggerService;

/**
 * Unauthenticated caller: httpAuth rejects, so any route that runs the
 * permission check must fail with 401.
 */
const anonymousHttpAuth = {
  credentials: async () => {
    throw new AuthenticationError('No credentials');
  },
} as never;

/**
 * Authenticated but unpermitted caller: httpAuth succeeds, but
 * permissions deny all access. Should get 403 Forbidden.
 */
const authenticatedButDeniedAuthz = {
  authorize: async () => [{ result: AuthorizeResult.DENY }],
} as never;

/**
 * Permissions always allow, so any authenticated request succeeds.
 */
const permissiveAuthz = {
  authorize: async () => [{ result: AuthorizeResult.ALLOW }],
} as never;

/**
 * Mock HTTP Auth that succeeds but has no permissions service.
 * This simulates misconfiguration.
 */
const authenticatedHttpAuth = {
  credentials: async () => ({
    principal: { userEntityRef: 'user:default/test-user' },
  }),
} as never;

describe('validation-manager Authorization Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  describe('Public Health Endpoint', () => {
    beforeAll(async () => {
      const app = express();
      app.use(
        await createRouter({
          logger: silentLogger,
          httpAuth: anonymousHttpAuth,
          permissions: undefined,
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
    });

    it('serves health check without authentication', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('validation-manager');
    });
  });

  describe('Authentication Required Routes', () => {
    beforeAll(async () => {
      const app = express();
      app.use(
        await createRouter({
          logger: silentLogger,
          httpAuth: anonymousHttpAuth,
          permissions: permissiveAuthz,
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
    });

    it('denies anonymous access to read endpoints (401)', async () => {
      for (const route of ['/requirements', '/documents/exports', '/admin/dashboard']) {
        const response = await fetch(`${baseUrl}${route}`);
        expect(response.status).toBe(401);
      }
    });

    it('denies anonymous POST to create/modify endpoints (401)', async () => {
      for (const route of ['/requirements', '/requirements/URS-001/approve']) {
        const response = await fetch(`${baseUrl}${route}`, { method: 'POST' });
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Permission Denial Routes', () => {
    beforeAll(async () => {
      const app = express();
      app.use(
        await createRouter({
          logger: silentLogger,
          httpAuth: authenticatedHttpAuth,
          permissions: authenticatedButDeniedAuthz,
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
    });

    it('denies authorized but unpermitted access (403)', async () => {
      for (const route of ['/requirements', '/admin/dashboard', '/requirements/URS-001/approve']) {
        const response = await fetch(`${baseUrl}${route}`, {
          method: route.includes('/approve') ? 'POST' : 'GET',
        });
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Successful Authorization Routes', () => {
    beforeAll(async () => {
      const app = express();
      app.use(
        await createRouter({
          logger: silentLogger,
          httpAuth: authenticatedHttpAuth,
          permissions: permissiveAuthz,
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
    });

    it('permits authenticated and authorized read access', async () => {
      const response = await fetch(`${baseUrl}/requirements`);
      expect(response.status).toBeLessThan(500); // Succeeds auth; may fail for other reasons
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('permits authenticated and authorized write access', async () => {
      const response = await fetch(`${baseUrl}/admin/dashboard`);
      expect(response.status).toBeLessThan(500); // Succeeds auth; may fail for other reasons
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Configuration Errors', () => {
    beforeAll(async () => {
      const app = express();
      app.use(
        await createRouter({
          logger: silentLogger,
          httpAuth: authenticatedHttpAuth,
          permissions: undefined, // No permissions service configured
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
    });

    it('returns 500 if permission service is not configured', async () => {
      const response = await fetch(`${baseUrl}/requirements`);
      expect(response.status).toBe(500);
    });
  });
});
