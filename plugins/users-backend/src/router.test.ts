/**
 * users-backend router tests.
 *
 * This router is the platform's user and role administration surface: it
 * writes the catalog user seed, appends the audit trail and triggers a catalog
 * refresh. It had no tests at all, which is why the authorization behaviour
 * below was never pinned down.
 *
 * The router resolves both the seed file and the audit files relative to
 * process.cwd(), and the audit paths are not configurable. The tests therefore
 * point cwd at a throwaway directory that mirrors the repository layout, so a
 * run never touches the real catalog/.
 */

import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';

import { createRouter } from './router';

const ADMIN = 'user:default/platform-admin';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function call(
  app: express.Express,
  method: Method,
  urlPath: string,
  body?: unknown,
) {
  const server = await listenOnFetchablePort(app);
  try {
    // fetch refuses a body on GET, so the callers below may pass one
    // unconditionally.
    const sendBody = body !== undefined && method !== 'GET';
    const response = await fetch(`${server.url}${urlPath}`, {
      method,
      headers: sendBody ? { 'Content-Type': 'application/json' } : undefined,
      body: sendBody ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: (await response.json()) as any,
    };
  } finally {
    await server.close();
  }
}

describe('users-backend router', () => {
  let tmpRoot: string;
  let seedFile: string;
  let auditFile: string;
  let signinFile: string;
  let decision: AuthorizeResult;

  const catalog = { refreshEntity: jest.fn() };
  const httpAuth = {
    credentials: jest.fn(async () => ({
      $$type: '@backstage/BackstageCredentials',
      principal: { type: 'user', userEntityRef: ADMIN },
    })),
  };
  const permissions = {
    authorize: jest.fn(async () => [{ result: decision }]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    decision = AuthorizeResult.ALLOW;

    // Mirror the repo layout so the router's "../../catalog/..." paths stay
    // inside the throwaway directory.
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'users-backend-'));
    const cwd = path.join(tmpRoot, 'packages', 'backend');
    fs.mkdirSync(cwd, { recursive: true });
    jest.spyOn(process, 'cwd').mockReturnValue(cwd);

    seedFile = path.join(tmpRoot, 'catalog', 'users.seed.yaml');
    auditFile = path.join(tmpRoot, 'catalog', 'runtime', 'users-audit.jsonl');
    signinFile = path.join(tmpRoot, 'catalog', 'runtime', 'signin-audit.jsonl');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  async function app() {
    const router = await createRouter({
      logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      } as never,
      httpAuth: httpAuth as never,
      permissions: permissions as never,
      catalog: catalog as never,
      config: { getOptionalString: () => undefined } as never,
    });
    return express().use(router);
  }

  function auditRecords() {
    if (!fs.existsSync(auditFile)) {
      return [];
    }
    return fs
      .readFileSync(auditFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }

  describe('health', () => {
    it('answers without authentication', async () => {
      const res = await call(await app(), 'GET', '/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(httpAuth.credentials).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    // Every route below administers users; a DENY must stop all of them.
    it.each([
      ['GET', '/'],
      ['POST', '/'],
      ['PUT', '/someone'],
      ['DELETE', '/someone'],
      ['GET', '/audit'],
      ['GET', '/signins'],
    ] as [Method, string][])('rejects %s %s when denied', async (method, urlPath) => {
      decision = AuthorizeResult.DENY;

      const res = await call(await app(), method, urlPath, { login: 'x' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    it('writes nothing when denied', async () => {
      decision = AuthorizeResult.DENY;

      await call(await app(), 'POST', '/', { login: 'mallory' });

      expect(fs.existsSync(seedFile)).toBe(false);
      expect(auditRecords()).toHaveLength(0);
      expect(catalog.refreshEntity).not.toHaveBeenCalled();
    });
  });

  describe('listing', () => {
    it('returns an empty list when the seed file is absent', async () => {
      const res = await call(await app(), 'GET', '/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('creating a user', () => {
    it('persists the entity, audits it and refreshes the catalog', async () => {
      const res = await call(await app(), 'POST', '/', {
        login: 'ada',
        displayName: 'Ada Lovelace',
        memberOf: ['group:default/platform-admins'],
      });

      expect(res.status).toBe(201);
      expect(res.body.kind).toBe('User');
      expect(res.body.metadata.name).toBe('ada');
      expect(res.body.spec.memberOf).toEqual(['group:default/platform-admins']);

      const listed = await call(await app(), 'GET', '/');
      expect(listed.body).toHaveLength(1);
      expect(listed.body[0].metadata.name).toBe('ada');

      const audit = auditRecords();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actor: ADMIN, action: 'CREATED', entity: 'ada' });

      expect(catalog.refreshEntity).toHaveBeenCalledTimes(1);
    });

    it('normalises the login to lower case', async () => {
      const res = await call(await app(), 'POST', '/', { login: '  AdA  ' });
      expect(res.status).toBe(201);
      expect(res.body.metadata.name).toBe('ada');
    });

    it.each([
      ['empty', ''],
      ['leading dash', '-ada'],
      ['underscore', 'ada_lovelace'],
      ['slash', 'ada/lovelace'],
    ])('rejects an invalid login (%s)', async (_label, login) => {
      const res = await call(await app(), 'POST', '/', { login });
      expect(res.status).toBe(400);
      expect(fs.existsSync(seedFile)).toBe(false);
    });

    it('rejects a duplicate login', async () => {
      await call(await app(), 'POST', '/', { login: 'ada' });
      const res = await call(await app(), 'POST', '/', { login: 'ada' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
      expect(auditRecords()).toHaveLength(1);
    });

    it('defaults memberOf to empty when it is not an array', async () => {
      const res = await call(await app(), 'POST', '/', {
        login: 'ada',
        memberOf: 'group:default/platform-admins',
      });
      expect(res.status).toBe(201);
      expect(res.body.spec.memberOf).toEqual([]);
    });
  });

  describe('updating a user', () => {
    it('replaces memberOf and records the previous value', async () => {
      await call(await app(), 'POST', '/', {
        login: 'ada',
        memberOf: ['group:default/viewers'],
      });

      const res = await call(await app(), 'PUT', '/ada', {
        memberOf: ['group:default/platform-admins'],
      });

      expect(res.status).toBe(200);
      expect(res.body.spec.memberOf).toEqual(['group:default/platform-admins']);

      const audit = auditRecords();
      expect(audit).toHaveLength(2);
      expect(audit[1]).toMatchObject({ actor: ADMIN, action: 'UPDATED', entity: 'ada' });
      expect(audit[1].oldValue.spec.memberOf).toEqual(['group:default/viewers']);
    });

    it('rejects an unknown user', async () => {
      const res = await call(await app(), 'PUT', '/nobody', { memberOf: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('removing a user', () => {
    it('removes the entity and keeps the previous value in the audit trail', async () => {
      await call(await app(), 'POST', '/', { login: 'ada' });

      const res = await call(await app(), 'DELETE', '/ada');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ removed: 'ada' });

      const listed = await call(await app(), 'GET', '/');
      expect(listed.body).toEqual([]);

      const audit = auditRecords();
      expect(audit[1]).toMatchObject({ actor: ADMIN, action: 'REMOVED', entity: 'ada' });
      expect(audit[1].oldValue.metadata.name).toBe('ada');
    });

    it('rejects an unknown user', async () => {
      const res = await call(await app(), 'DELETE', '/nobody');
      expect(res.status).toBe(400);
    });
  });

  describe('audit endpoint', () => {
    it('returns an empty list before anything is recorded', async () => {
      const res = await call(await app(), 'GET', '/audit');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns the recorded entries', async () => {
      await call(await app(), 'POST', '/', { login: 'ada' });

      const res = await call(await app(), 'GET', '/audit');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ action: 'CREATED', entity: 'ada' });
    });
  });

  describe('sign-in audit', () => {
    // Recording your own sign-in only needs authentication, not the
    // user-management permission — every user hits this on login.
    it('records a sign-in without the admin permission', async () => {
      decision = AuthorizeResult.DENY;

      const res = await call(await app(), 'POST', '/signins', {
        provider: 'github',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ recorded: true });

      const recorded = fs
        .readFileSync(signinFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject({ actor: ADMIN, provider: 'github' });
    });

    it('reading the sign-in log stays admin-only', async () => {
      decision = AuthorizeResult.DENY;
      const res = await call(await app(), 'GET', '/signins', undefined);
      expect(res.status).toBe(403);
    });
  });
});
