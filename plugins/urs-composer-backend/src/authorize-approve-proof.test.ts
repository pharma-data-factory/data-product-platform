/**
 * Focused authorization proof: unauthorized APPROVE is denied by backend.
 * Does not add product functionality — evidence only.
 */

import express from 'express';
import http from 'http';
import { URSService } from './service';
import { createRouter } from './router';
import { URSRepository } from './repository';
import { LoggerService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  SolutionType,
  GxPRelevance,
  RequirementPriority,
  URSStatus,
} from './types';

const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(() => mockLogger),
};

async function listen(app: express.Express): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  const addr = server.address();
  const port = typeof addr === 'string' ? 0 : addr!.port;
  return {
    port,
    close: () =>
      new Promise(resolve => {
        server.close(() => resolve());
      }),
  };
}

function request(
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
          let parsed: any = data;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            // keep raw
          }
          resolve({ status: res.statusCode || 0, body: parsed });
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

describe('Unauthorized approve denied by backend', () => {
  test('Developer without urs.approve receives 403 on APPROVE', async () => {
    const repository = new URSRepository();
    const service = new URSService({
      logger: mockLogger,
      repository,
    });

    const created = await service.createRequirementSet(
      {
        businessCapabilityRefs: [
          'business-capability:make/equipment-performance-management',
        ],
        businessNeed: 'Authorization deny proof',
        solutionType: SolutionType.PROJECT,
        solutionName: 'Auth Deny Proof',
        gxpRelevance: GxPRelevance.NONE,
      },
      'user:default/author',
    );
    await service.updateRequirementSetDraft(
      created.id,
      {},
      [
        {
          title: 'Req',
          statement: 'The solution shall demonstrate authorization denial.',
          priority: RequirementPriority.MUST,
        },
      ],
      'user:default/author',
    );
    // Set status to IN_REVIEW directly (legacy submitForReview removed)
    const rs = await service.getRequirementSet(created.id);
    await (service as any).repository.updateRequirementSet({ ...rs!, status: URSStatus.IN_REVIEW });
    expect((await service.getRequirementSet(created.id))!.status).toBe(
      URSStatus.IN_REVIEW,
    );

    const denyPermissions = {
      authorize: jest
        .fn()
        .mockResolvedValue([{ result: AuthorizeResult.DENY }]),
    } as any;

    const allowHttpAuth = {
      credentials: jest.fn().mockResolvedValue({
        principal: { userEntityRef: 'user:default/developer' },
      }),
    } as any;

    const router = await createRouter({
      logger: mockLogger,
      httpAuth: allowHttpAuth,
      permissions: denyPermissions,
      service,
    });

    const app = express();
    app.use('/api/urs-composer', router);
    const server = await listen(app);

    try {
      const result = await request(
        server.port,
        'POST',
        `/api/urs-composer/requirement-sets/${created.id}/approve`,
        {},
      );
      expect(result.status).toBe(403);

      // Backend authoritative: status remains IN_REVIEW
      const still = await service.getRequirementSet(created.id);
      expect(still!.status).toBe(URSStatus.IN_REVIEW);
      expect(denyPermissions.authorize).toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  test('Authorized approver may approve after permission ALLOW', async () => {
    const repository = new URSRepository();
    const service = new URSService({
      logger: mockLogger,
      repository,
    });

    const created = await service.createRequirementSet(
      {
        businessCapabilityRefs: [
          'business-capability:make/equipment-performance-management',
        ],
        businessNeed: 'Authorization allow proof',
        solutionType: SolutionType.PROJECT,
        solutionName: 'Auth Allow Proof',
      },
      'user:default/author',
    );
    // Set status to IN_REVIEW directly (legacy submitForReview removed)
    const rs2 = await service.getRequirementSet(created.id);
    await (service as any).repository.updateRequirementSet({ ...rs2!, status: URSStatus.IN_REVIEW });

    const allowPermissions = {
      authorize: jest
        .fn()
        .mockResolvedValue([{ result: AuthorizeResult.ALLOW }]),
    } as any;

    const allowHttpAuth = {
      credentials: jest.fn().mockResolvedValue({
        principal: { userEntityRef: 'user:default/approver' },
      }),
    } as any;

    const router = await createRouter({
      logger: mockLogger,
      httpAuth: allowHttpAuth,
      permissions: allowPermissions,
      service,
    });

    const app = express();
    app.use('/api/urs-composer', router);
    const server = await listen(app);

    try {
      const result = await request(
        server.port,
        'POST',
        `/api/urs-composer/requirement-sets/${created.id}/approve`,
        {},
      );
      expect(result.status).toBe(200);
      expect(result.body.status).toBe(URSStatus.APPROVED);
      expect(
        (await service.getRequirementSet(created.id))!.status,
      ).toBe(URSStatus.APPROVED);
    } finally {
      await server.close();
    }
  });
});
