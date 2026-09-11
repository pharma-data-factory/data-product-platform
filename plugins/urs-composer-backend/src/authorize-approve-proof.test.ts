/**
 * Focused authorization proof: unauthorized APPROVE is denied by backend.
 * Does not add product functionality — evidence only.
 */

import express from 'express';
import http from 'http';
import { URSService } from './service';
import { createRouter } from './router';
import { URSRepository } from './repository';
import { SignaturePinReAuth } from './domain/reauth';
import { LoggerService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  ApprovalRole,
  SolutionType,
  GxPRelevance,
  RequirementPriority,
  URSStatus,
} from './types';

const TEST_PIN = 'signing-pin-1';

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
      // Approval runs through the approval chain now; the legacy
      // requirement-sets/:id/approve route is gone, and asking for it only
      // proved that a missing route answers 404. The gate is checked before
      // the service is reached, so a denial does not depend on the ids
      // resolving.
      const result = await request(
        server.port,
        'POST',
        `/api/urs-composer/approvals/any-instance/steps/any-step/approve`,
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
    await repository.createApprovalWorkflow({
      id: 'non-gxp-urs',
      name: 'Non-GxP URS Approval',
      steps: [
        { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
        { sequence: 2, role: ApprovalRole.PRODUCT_MANAGER, required: true },
      ],
      createdAt: new Date(),
    } as any);

    const service = new URSService({
      logger: mockLogger,
      repository,
      // Past the permission gate, the step still checks the actor's approval
      // role, which comes from catalog group membership.
      catalog: {
        getEntityByRef: async (ref: string) => ({
          kind: 'User',
          metadata: { name: ref },
          spec: {
            memberOf: [
              'group:default/urs-business-reviewers',
              'group:default/urs-product-managers',
              'group:default/urs-quality-reviewers',
            ],
          },
        }),
      } as any,
    });

    await new SignaturePinReAuth(repository).enroll(
      'user:default/approver',
      TEST_PIN,
    );

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

    const baseline = await service.createBaseline(
      created.id,
      [],
      '1.0',
      'user:default/author',
    );
    const instance = await service.submitBaseline(
      baseline.id,
      'user:default/author',
    );
    const firstStep = instance.steps[0];

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
        `/api/urs-composer/approvals/${instance.id}/steps/${firstStep.id}/approve`,
        { comment: 'Approved', pin: TEST_PIN },
      );
      expect(result.status).toBe(200);

      const persisted = await service.getApprovalInstance(instance.id);
      const decided = persisted!.steps.find(s => s.id === firstStep.id);
      expect(decided!.status).toBe('APPROVED');
      expect(decided!.actedBy).toBe('user:default/approver');
      expect(allowPermissions.authorize).toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});
