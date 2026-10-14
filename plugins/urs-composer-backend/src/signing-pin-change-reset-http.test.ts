/**
 * PUT /signing-pin, GET /signing-pin and POST /signing-pin/reset, over HTTP
 * (NXD-138).
 *
 * The rule NXD-136 asked for and the user decided:
 * - a first PIN is free; changing one needs the current PIN, which goes
 *   through the same verification and lockout as a signature;
 * - a platform administrator can clear a seat's PIN, with a reason, audited,
 *   lifting the lockout, and can never set one.
 *
 * Status codes, pinned here: a change without the current PIN is **400** (the
 * request lacks what the change requires, as a signature without a PIN is in
 * NXD-128); a wrong current PIN and a locked seat are **403**.
 */

import express from 'express';
import http from 'http';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';

import { createRouter } from './router';
import { URSRepository } from './repository';
import { URSService } from './service';
import { MAX_FAILED_ATTEMPTS } from './domain/reauth';

const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): LoggerService => mockLogger),
};

const ADMIN = 'user:default/demo-admin';
const OTHER_ADMIN = 'user:default/demo-admin-2';
const SIGNER = 'user:default/demo-reviewer';

function call(
  port: number,
  method: 'GET' | 'PUT' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode!,
            body: data ? JSON.parse(data) : null,
          }),
        );
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

describe('Signing PIN change and administrator reset (NXD-138)', () => {
  let server: http.Server;
  let port: number;
  let actor = SIGNER;
  let repository: URSRepository;
  let service: URSService;
  const authorizedNames: string[] = [];

  /** Who holds what: admins hold platform.user.manage, everyone urs.sign. */
  function allows(principal: string, permission: string): boolean {
    if (permission === 'platform.user.manage') {
      return principal === ADMIN || principal === OTHER_ADMIN;
    }
    return permission === 'urs.sign';
  }

  beforeEach(async () => {
    repository = new URSRepository();
    service = new URSService({
      logger: mockLogger,
      repository,
    } as never);
    authorizedNames.length = 0;
    const permissions = {
      authorize: jest.fn(async (requests: Array<{ permission: { name: string } }>) =>
        requests.map(r => {
          authorizedNames.push(r.permission.name);
          return {
            result: allows(actor, r.permission.name)
              ? AuthorizeResult.ALLOW
              : AuthorizeResult.DENY,
          };
        }),
      ),
    } as unknown as PermissionsService;
    const httpAuth = {
      credentials: jest.fn(async () => ({
        principal: { type: 'user', userEntityRef: actor },
      })),
    } as unknown as HttpAuthService;
    const router = await createRouter({
      logger: mockLogger,
      httpAuth,
      permissions,
      service,
    } as never);
    server = http.createServer(express().use(express.json()).use(router));
    await new Promise<void>(resolve =>
      server.listen(0, '127.0.0.1', () => resolve()),
    );
    port = (server.address() as { port: number }).port;
    actor = SIGNER;
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  async function verify(pin: string) {
    return call(port, 'POST', '/signing-pin/verify', { pin });
  }

  async function lockSigner() {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await verify('wrong-pin-0');
    }
  }

  async function auditFor(userRef: string) {
    return (await repository.getEntityAuditTrail(userRef, 'SIGNATURE_CREDENTIAL')).map(
      e => e.eventType,
    );
  }

  describe('the seat itself', () => {
    it('enrols a first PIN without a current PIN, and the status says so', async () => {
      expect((await call(port, 'GET', '/signing-pin')).body).toEqual({
        enrolled: false,
      });

      const res = await call(port, 'PUT', '/signing-pin', { pin: 'first-pin-1' });
      expect(res.status).toBe(204);
      expect((await verify('first-pin-1')).status).toBe(200);
      expect((await call(port, 'GET', '/signing-pin')).body).toEqual({
        enrolled: true,
      });
      expect(await auditFor(SIGNER)).toEqual(['PIN_SET']);
    });

    it('refuses a change without the current PIN with 400, and keeps the PIN', async () => {
      await call(port, 'PUT', '/signing-pin', { pin: 'first-pin-1' });

      const res = await call(port, 'PUT', '/signing-pin', { pin: 'second-pin-2' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/requires the current PIN/);
      expect((await verify('first-pin-1')).status).toBe(200);
      expect((await verify('second-pin-2')).status).toBe(403);
    });

    it('refuses a change with a wrong current PIN with 403, and counts it', async () => {
      await call(port, 'PUT', '/signing-pin', { pin: 'first-pin-1' });

      const res = await call(port, 'PUT', '/signing-pin', {
        pin: 'second-pin-2',
        currentPin: 'wrong-pin-0',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/current signing PIN is wrong/);
      expect((await repository.getSignatureCredential(SIGNER))!.failedAttempts).toBe(1);
    });

    it('changes the PIN with the right current PIN, audited as PIN_CHANGED', async () => {
      await call(port, 'PUT', '/signing-pin', { pin: 'first-pin-1' });

      const res = await call(port, 'PUT', '/signing-pin', {
        pin: 'second-pin-2',
        currentPin: 'first-pin-1',
      });
      expect(res.status).toBe(204);
      expect((await verify('second-pin-2')).status).toBe(200);
      expect(await auditFor(SIGNER)).toEqual(['PIN_SET', 'PIN_CHANGED']);
    });

    it('refuses a locked seat with 403, even with the right current PIN', async () => {
      await call(port, 'PUT', '/signing-pin', { pin: 'first-pin-1' });
      await lockSigner();

      const status = await call(port, 'GET', '/signing-pin');
      expect(status.body.enrolled).toBe(true);
      expect(typeof status.body.lockedUntil).toBe('string');

      const res = await call(port, 'PUT', '/signing-pin', {
        pin: 'second-pin-2',
        currentPin: 'first-pin-1',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Locked until .*cannot be changed/);
    });

    it('sets only the token’s own PIN, whatever the body names', async () => {
      actor = ADMIN;
      const res = await call(port, 'PUT', '/signing-pin', {
        pin: 'admin-pin-1',
        userEntityRef: SIGNER,
      });
      expect(res.status).toBe(204);
      expect(await repository.getSignatureCredential(SIGNER)).toBeNull();
      expect(await repository.getSignatureCredential(ADMIN)).not.toBeNull();
    });
  });

  describe('the administrator reset', () => {
    beforeEach(async () => {
      await call(port, 'PUT', '/signing-pin', { pin: 'first-pin-1' });
      await lockSigner();
    });

    it('is authorized by platform.user.manage, not urs.sign', async () => {
      actor = ADMIN;
      await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: SIGNER,
        reason: 'Forgotten PIN, ticket 4711',
      });
      expect(authorizedNames).toContain('platform.user.manage');
    });

    it('refuses a non-administrator with 403 and changes nothing', async () => {
      actor = 'user:default/demo-quality';
      const res = await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: SIGNER,
        reason: 'I would like to sign as them',
      });
      expect(res.status).toBe(403);
      expect(await repository.getSignatureCredential(SIGNER)).not.toBeNull();
      expect(await auditFor(SIGNER)).toEqual(['PIN_SET']);
    });

    it('needs a reason: 400 without one, and nothing is cleared', async () => {
      actor = ADMIN;
      for (const reason of [undefined, '', '   ']) {
        const res = await call(port, 'POST', '/signing-pin/reset', {
          userEntityRef: SIGNER,
          reason,
        });
        expect(res.status).toBe(400);
      }
      expect(await repository.getSignatureCredential(SIGNER)).not.toBeNull();
    });

    it('cannot set a PIN: a body carrying one is refused with 400', async () => {
      actor = ADMIN;
      for (const extra of [
        { pin: 'admin-chosen-1' },
        { newPin: 'admin-chosen-1' },
        { currentPin: 'first-pin-1' },
      ]) {
        const res = await call(port, 'POST', '/signing-pin/reset', {
          userEntityRef: SIGNER,
          reason: 'Forgotten PIN',
          ...extra,
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/never set one/);
      }
      expect(await repository.getSignatureCredential(SIGNER)).not.toBeNull();
    });

    it('clears the PIN and lifts the lockout, audited with who, whom, when and why', async () => {
      actor = ADMIN;
      const res = await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: SIGNER,
        reason: '  Forgotten PIN, ticket 4711  ',
      });
      expect(res.status).toBe(204);
      expect(await repository.getSignatureCredential(SIGNER)).toBeNull();

      const events = await repository.getEntityAuditTrail(SIGNER, 'SIGNATURE_CREDENTIAL');
      const reset = events.find(e => e.eventType === 'PIN_RESET')!;
      expect(reset).toMatchObject({
        actor: ADMIN,
        entityId: SIGNER,
        newValue: { reason: 'Forgotten PIN, ticket 4711', resetBy: ADMIN },
        oldValue: { failedAttempts: MAX_FAILED_ATTEMPTS },
      });
      expect(typeof (reset.oldValue as { lockedUntil: unknown }).lockedUntil).toBe(
        'string',
      );
      expect(reset.timestamp).toBeInstanceOf(Date);
      expect(reset.correlationId).toBeTruthy();
    });

    it('leaves the seat to enrol again without a current PIN, and to sign with it', async () => {
      actor = ADMIN;
      await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: SIGNER,
        reason: 'Locked out',
      });

      actor = SIGNER;
      expect((await call(port, 'GET', '/signing-pin')).body).toEqual({
        enrolled: false,
      });
      const before = await verify('first-pin-1');
      expect(before.status).toBe(403);
      expect(before.body.error).toMatch(/No signing PIN/);

      expect(
        (await call(port, 'PUT', '/signing-pin', { pin: 'fresh-pin-3' })).status,
      ).toBe(204);
      expect((await verify('fresh-pin-3')).status).toBe(200);
      expect(await auditFor(SIGNER)).toEqual(['PIN_SET', 'PIN_RESET', 'PIN_SET']);
    });

    it('refuses an administrator’s own seat with 403', async () => {
      actor = ADMIN;
      await call(port, 'PUT', '/signing-pin', { pin: 'admin-pin-1' });

      const res = await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: ADMIN,
        reason: 'Forgot mine',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/own signing PIN/);
      expect(await repository.getSignatureCredential(ADMIN)).not.toBeNull();

      actor = OTHER_ADMIN;
      expect(
        (
          await call(port, 'POST', '/signing-pin/reset', {
            userEntityRef: ADMIN,
            reason: 'Forgot theirs',
          })
        ).status,
      ).toBe(204);
    });

    it('answers 404 for a seat without a PIN, and 400 for a malformed reference', async () => {
      actor = ADMIN;
      const none = await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: 'user:default/nobody',
        reason: 'Tidy up',
      });
      expect(none.status).toBe(404);
      expect(await auditFor('user:default/nobody')).toEqual([]);

      const bad = await call(port, 'POST', '/signing-pin/reset', {
        userEntityRef: 'demo-reviewer',
        reason: 'Tidy up',
      });
      expect(bad.status).toBe(400);
    });
  });
});
