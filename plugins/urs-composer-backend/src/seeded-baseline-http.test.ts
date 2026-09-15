/**
 * The Create Baseline path a browser actually walks, over HTTP.
 *
 * The regression this pins: the Requirement Set page sent
 * `requirements.map(r => r.id)` as `requirementVersionIds`, so pressing Create
 * Baseline on the seeded URS-WD set answered
 *
 *   Requirement version(s) not found: seed:urs-wd-urs-wd-001, … -010
 *
 * Two independent causes: the page sent requirement ids where version ids
 * belong, and seeding never opened the genesis version those ids would have
 * pointed at.
 *
 * Service-level tests cover each half. This one goes over the wire against the
 * seeded repository — the same two requests the page issues — because that is
 * the combination that failed, and neither half alone reproduces it.
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
import { URSStatus } from './types';
import { WD_REQUIREMENT_SET } from './data/seedRequirementSets';

const ACTOR = 'user:default/manager';
const SET_ID = 'seed:urs-wd';

const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): LoggerService => mockLogger),
};

/** Real loopback request, matching the convention used across this plugin. */
function call(
  port: number,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' },
      },
      res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode!, body: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode!, body: data });
          }
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Create Baseline on a seeded set, over HTTP', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    // The production in-memory path: seeding runs exactly as it does at startup.
    const repository = new URSRepository();
    repository.seedRequirementSets();

    const service = new URSService({ logger: mockLogger, repository });

    const permissions = {
      authorize: jest
        .fn()
        .mockResolvedValue([{ result: AuthorizeResult.ALLOW }]),
    } as unknown as PermissionsService;

    const httpAuth = {
      credentials: jest.fn().mockResolvedValue({
        principal: { type: 'user', userEntityRef: ACTOR },
      }),
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

  test('GET current-versions returns one version id per requirement', async () => {
    const res = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(WD_REQUIREMENT_SET.requirements.length);
    for (const version of res.body) {
      expect(version.id).toMatch(/-v0\.1$/);
      expect(version.status).toBe(URSStatus.DRAFT);
    }
  });

  test('POST baselines succeeds with those version ids', async () => {
    const current = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );

    const res = await call(port, 'POST', `/requirement-sets/${SET_ID}/baselines`, {
      requirementSetId: SET_ID,
      baselineVersion: '1.0',
      requirementVersionIds: current.body.map((v: { id: string }) => v.id),
    });

    expect([200, 201]).toContain(res.status);
    expect(res.body.requirementVersionIds).toHaveLength(10);
    expect(res.body.status).toBe(URSStatus.DRAFT);
  });

  test('the proposed baseline version counts up from the history', async () => {
    // The previous baseline "1.0" was created by the test above, so the
    // proposal has to move on rather than collide with it.
    const res = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/next-baseline-version`,
    );

    expect(res.status).toBe(200);
    expect(res.body.baselineVersion).toBe('2.0');
  });

  test('a duplicate baseline version is refused with 409, not 500', async () => {
    // Postgres has a unique index for this; the in-memory repository has none,
    // so without the service check dev and production disagreed.
    const current = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );

    const res = await call(port, 'POST', `/requirement-sets/${SET_ID}/baselines`, {
      requirementSetId: SET_ID,
      baselineVersion: '1.0',
      requirementVersionIds: current.body.map((v: { id: string }) => v.id),
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test('a label the user chose is accepted, not just the proposal', async () => {
    // A baseline identifier often has to match a document number in an
    // external QMS, so overriding the suggestion must stay possible.
    const current = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );

    const res = await call(port, 'POST', `/requirement-sets/${SET_ID}/baselines`, {
      requirementSetId: SET_ID,
      baselineVersion: 'QMS-URS-WD-REV-C',
      requirementVersionIds: current.body.map((v: { id: string }) => v.id),
    });

    expect([200, 201]).toContain(res.status);
    expect(res.body.baselineVersion).toBe('QMS-URS-WD-REV-C');
  });

  test('a version can be driven DRAFT -> IN_APPROVAL, one step at a time', async () => {
    const current = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );
    const versionId = current.body[0].id;

    for (const status of [
      URSStatus.IN_REVIEW,
      URSStatus.REVIEWED,
      URSStatus.IN_APPROVAL,
    ]) {
      const res = await call(
        port,
        'POST',
        `/requirement-versions/${versionId}/transition`,
        { status },
      );
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  test('skipping a step is refused by the transition map', async () => {
    const current = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );
    // The second version is still DRAFT; REVIEWED is two steps away.
    const versionId = current.body[1].id;

    const res = await call(
      port,
      'POST',
      `/requirement-versions/${versionId}/transition`,
      { status: URSStatus.REVIEWED },
    );

    expect(res.status).toBe(409);
  });

  test('APPROVED cannot be set directly — it needs a signature', async () => {
    // Spec invariant 6. Without this guard the released state would be
    // settable without a signatory, which is what the signature is for.
    const current = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/current-versions`,
    );

    const res = await call(
      port,
      'POST',
      `/requirement-versions/${current.body[1].id}/transition`,
      { status: URSStatus.APPROVED },
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });

  test('a whole set advances together, reporting what could not move', async () => {
    const res = await call(
      port,
      'POST',
      `/requirement-sets/${SET_ID}/versions/transition`,
      { status: URSStatus.IN_REVIEW },
    );

    expect(res.status).toBe(200);
    // Nine were DRAFT and moved; the first is already IN_APPROVAL from the
    // test above and cannot go back to IN_REVIEW.
    expect(res.body.advanced.length).toBe(9);
    expect(res.body.skipped).toHaveLength(1);
    expect(res.body.skipped[0].requirementId).toBe('URS-WD-001');
  });

  test('POST baselines with requirement ids is what used to fail', async () => {
    const requirements = await call(
      port,
      'GET',
      `/requirement-sets/${SET_ID}/requirements`,
    );

    const res = await call(port, 'POST', `/requirement-sets/${SET_ID}/baselines`, {
      requirementSetId: SET_ID,
      baselineVersion: '9.9',
      requirementVersionIds: requirements.body.map((r: { id: string }) => r.id),
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Requirement version\(s\) not found/);
  });
});
