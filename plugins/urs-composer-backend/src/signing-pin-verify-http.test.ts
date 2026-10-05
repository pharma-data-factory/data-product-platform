/**
 * POST /signing-pin/verify, over HTTP (NXD-119).
 *
 * The Validation Expert's decision signatures verify the signer's PIN here,
 * so the platform keeps one signing credential and one lockout. Pinned: the
 * caller's own PIN only (the user comes from the token, never the body), a
 * wrong PIN is refused, and the lockout of an approval step applies.
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

function post(
  port: number,
  path: string,
  body: unknown,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
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

describe('POST /signing-pin/verify (NXD-119)', () => {
  let server: http.Server;
  let port: number;
  let actor = 'user:default/demo-validator';
  let decision: AuthorizeResult = AuthorizeResult.ALLOW;
  let service: URSService;

  beforeAll(async () => {
    service = new URSService({
      logger: mockLogger,
      repository: new URSRepository(),
    } as never);
    const permissions = {
      authorize: jest.fn(async () => [{ result: decision }]),
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
    await service.setSigningPin('user:default/demo-validator', 'right-pin-1');
    await service.setSigningPin('user:default/demo-quality', 'quality-pin-1');
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  beforeEach(() => {
    decision = AuthorizeResult.ALLOW;
    actor = 'user:default/demo-validator';
  });

  it('verifies the caller’s own PIN and names the method', async () => {
    const res = await post(port, '/signing-pin/verify', { pin: 'right-pin-1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verified: true, method: 'signature-pin' });
  });

  it('checks the PIN of the token’s user, whatever the body claims', async () => {
    const res = await post(port, '/signing-pin/verify', {
      pin: 'quality-pin-1',
      userEntityRef: 'user:default/demo-quality',
    });
    expect(res.status).toBe(403);
  });

  it('refuses without urs.sign', async () => {
    decision = AuthorizeResult.DENY;
    const res = await post(port, '/signing-pin/verify', { pin: 'right-pin-1' });
    expect(res.status).toBe(403);
  });

  it('applies the approval step lockout', async () => {
    actor = 'user:default/demo-quality';
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await post(port, '/signing-pin/verify', { pin: 'wrong-pin-0' });
    }
    const res = await post(port, '/signing-pin/verify', { pin: 'quality-pin-1' });
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toMatch(/Locked until/);
  });
});
