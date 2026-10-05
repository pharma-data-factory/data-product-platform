/**
 * GET /approval-roles/me, over HTTP (NXD-104).
 *
 * The Requirement Set page offered Approve on every due step to anyone with
 * urs.approve. A manual walk of the OEE chain signed in as demo-author filled
 * in the signing dialog for a BUSINESS_REVIEWER step and was refused only
 * afterwards. The page now asks for the caller's roles first.
 *
 * What is pinned here is that the answer is resolved the way a step approval
 * resolves it — same group mapping, same aliases, ADMIN not standing in for
 * anything — so the page cannot promise a signature the server will refuse.
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

const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): LoggerService => mockLogger),
};

const MEMBERSHIPS: Record<string, string[]> = {
  'user:default/demo-author': [
    'group:default/data-product-owners',
    'group:default/urs-authors',
  ],
  'user:default/demo-reviewer': [
    'group:default/data-product-owners',
    'group:default/urs-business-reviewers',
  ],
  'user:default/admin': ['group:default/platform-admins'],
};

function get(
  port: number,
  path: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET' },
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
    req.end();
  });
}

describe('GET /approval-roles/me (NXD-104)', () => {
  let server: http.Server;
  let port: number;
  let actor = 'user:default/demo-author';
  let decision: AuthorizeResult = AuthorizeResult.ALLOW;

  beforeAll(async () => {
    const catalog = {
      getEntityByRef: jest.fn(async (ref: string) => ({
        kind: 'User',
        metadata: { name: ref },
        spec: { memberOf: MEMBERSHIPS[ref] ?? [] },
      })),
    };
    const service = new URSService({
      logger: mockLogger,
      repository: new URSRepository(),
      catalog,
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
    server = http.createServer(express().use(router));
    await new Promise<void>(resolve =>
      server.listen(0, '127.0.0.1', () => resolve()),
    );
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  beforeEach(() => {
    decision = AuthorizeResult.ALLOW;
  });

  it('answers the author with AUTHOR and the data-product-owners alias, not BUSINESS_REVIEWER', async () => {
    actor = 'user:default/demo-author';
    const res = await get(port, '/approval-roles/me');

    expect(res.status).toBe(200);
    expect(res.body.userEntityRef).toBe('user:default/demo-author');
    expect(res.body.roles.sort()).toEqual(['AUTHOR', 'PRODUCT_MANAGER']);
  });

  it('answers the reviewer with BUSINESS_REVIEWER', async () => {
    actor = 'user:default/demo-reviewer';
    const res = await get(port, '/approval-roles/me');

    expect(res.status).toBe(200);
    expect(res.body.roles).toContain('BUSINESS_REVIEWER');
  });

  it('reports ADMIN as ADMIN only — it stands in for no step role', async () => {
    actor = 'user:default/admin';
    const res = await get(port, '/approval-roles/me');

    expect(res.body.roles).toEqual(['ADMIN']);
  });

  it('is refused without read permission', async () => {
    decision = AuthorizeResult.DENY;
    const res = await get(port, '/approval-roles/me');

    expect(res.status).toBe(403);
  });
});
