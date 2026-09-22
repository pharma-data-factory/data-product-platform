/**
 * users-backend router tests.
 *
 * This router is the platform's user and role administration surface. It used
 * to rewrite catalog/users.seed.yaml and append JSONL audit files, resolving
 * both relative to process.cwd() — which is `packages/backend` for the dev
 * server but `/app` in a container, so the file it wrote was not the file the
 * catalog read, and neither survived a container replacement.
 *
 * Records now live in the database, so these tests run against an in-memory
 * SQLite instance through the real repository and migrations rather than
 * against a throwaway directory.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';

import { createRouter } from './router';
import { UsersRepository } from './repository';

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
  let db: Knex;
  let repository: UsersRepository;
  let decision: AuthorizeResult;

  const refresh = jest.fn();
  const projection = { publish: refresh } as never;
  const httpAuth = {
    credentials: jest.fn(async () => ({
      $$type: '@backstage/BackstageCredentials',
      principal: { type: 'user', userEntityRef: ADMIN },
    })),
  };
  const permissions = {
    authorize: jest.fn(async () => [{ result: decision }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    decision = AuthorizeResult.ALLOW;
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    repository = await UsersRepository.create({ getClient: () => db });
  });

  afterEach(async () => {
    await db?.destroy();
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
      repository,
      projection,
    });
    return express().use(router);
  }

  async function auditRecords() {
    return repository.listAudit();
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

      expect(await repository.listUsers()).toHaveLength(0);
      expect(await auditRecords()).toHaveLength(0);
      expect(refresh).not.toHaveBeenCalled();
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

      const audit: any[] = await auditRecords();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actor: ADMIN, action: 'CREATED', entity: 'ada' });

      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('normalises the login to lower case', async () => {
      const res = await call(await app(), 'POST', '/', { login: '  AdA  ' });
      expect(res.status).toBe(201);
      expect(res.body.metadata.name).toBe('ada');
    });

    it.each([
      ['empty', ''],
      ['leading dash', '-ada'],
      ['slash', 'ada/lovelace'],
      ['space', 'ada lovelace'],
    ])('rejects an invalid login (%s)', async (_label, login) => {
      const res = await call(await app(), 'POST', '/', { login });
      expect(res.status).toBe(400);
      expect(await repository.listUsers()).toHaveLength(0);
    });

    it('accepts an Enterprise Managed User login', async () => {
      // Underscores used to be rejected here. GitHub EMU accounts carry the
      // organisation shortcode as `name_org`, and the entity name must equal
      // the login for usernameMatchingUserEntityName to resolve it — so the
      // old rule made it impossible to give an EMU account any role at all.
      const res = await call(await app(), 'POST', '/', {
        login: 'schmeckm_roche',
      });
      expect(res.status).toBe(201);
      expect(res.body.metadata.name).toBe('schmeckm_roche');
    });

    it('rejects a duplicate login', async () => {
      await call(await app(), 'POST', '/', { login: 'ada' });
      const res = await call(await app(), 'POST', '/', { login: 'ada' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
      expect(await auditRecords()).toHaveLength(1);
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

      const audit: any[] = await auditRecords();
      expect(audit).toHaveLength(2);
      // Found by action, not by position: two records written in the same
      // millisecond order by id, which is deterministic but not chronological.
      const updated = audit.find(a => a.action === 'UPDATED');
      expect(updated).toMatchObject({ actor: ADMIN, entity: 'ada' });
      // The trail records what changed, not a copy of the whole entity:
      // the name is already in `entity`, and memberOf is the thing a GMP
      // reviewer asks about.
      expect(updated.oldValue.memberOf).toEqual(['group:default/viewers']);
      expect(updated.newValue.memberOf).toEqual([
        'group:default/platform-admins',
      ]);
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

      const audit: any[] = await auditRecords();
      const removed = audit.find(a => a.action === 'REMOVED');
      expect(removed).toMatchObject({ actor: ADMIN, entity: 'ada' });
      // The audit record outlives the account on purpose.
      expect(removed.oldValue.memberOf).toBeDefined();
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

      const recorded = await repository.listSignIns();
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
