/**
 * NXD-160. Who may start a product evidence review: whoever holds
 * validation.run.start, and whoever may sign the decision it informs
 * (validation-experts, urs-quality-reviewers). Nobody else.
 */

import express from 'express';
import http from 'http';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { createRouter } from './router';

const logger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(() => logger),
};

async function post(options: { allowed: boolean; groups: string[] }) {
  const service = {
    runProductEvidenceReview: jest.fn(async () => ({ id: 'EVIDENCE-RUN-0001' })),
  };
  const router = await createRouter({
    logger,
    httpAuth: {
      credentials: jest.fn(async () => ({
        principal: { type: 'user', userEntityRef: 'user:default/vera' },
      })),
    },
    userInfo: {
      getUserInfo: jest.fn(async () => ({
        userEntityRef: 'user:default/vera',
        ownershipEntityRefs: ['user:default/vera', ...options.groups],
      })),
    },
    permissions: {
      authorize: jest.fn(async () => [
        { result: options.allowed ? AuthorizeResult.ALLOW : AuthorizeResult.DENY },
      ]),
    },
    service,
  } as never);
  const app = express();
  app.use(express.json());
  app.use('/', router);
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/contexts/CTX-1/evidence-review',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        res => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', reject);
      req.end(JSON.stringify({ productVersionId: 'v1' }));
    });
    return { status, calls: service.runProductEvidenceReview.mock.calls.length };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe('starting a product evidence review (NXD-160)', () => {
  it('lets a validation expert or QA reviewer start it without validation.run.start', async () => {
    expect(await post({ allowed: false, groups: ['group:default/validation-experts'] })).toEqual({
      status: 201,
      calls: 1,
    });
    expect(
      await post({ allowed: false, groups: ['group:default/urs-quality-reviewers'] }),
    ).toEqual({ status: 201, calls: 1 });
  });

  it('still lets a holder of validation.run.start start it', async () => {
    expect(await post({ allowed: true, groups: [] })).toEqual({ status: 201, calls: 1 });
  });

  it('refuses anyone else, and starts nothing', async () => {
    expect(await post({ allowed: false, groups: ['group:default/platform-viewers'] })).toEqual({
      status: 403,
      calls: 0,
    });
  });
});
