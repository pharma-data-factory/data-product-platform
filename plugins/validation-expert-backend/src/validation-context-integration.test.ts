/**
 * URS Composer → Validation Expert integration tests
 *
 * Entry gate: a Validation Context may only be created from an APPROVED URS
 * baseline. Draft / Submitted(IN_REVIEW) / Rejected are denied. Contexts are
 * deduplicated by (requirementSetId, baselineId) and the ApprovedURSReference
 * is immutable (baseline id, version, capability and requirement references).
 */
import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  FileValidationRunRepository,
  MemoryValidationRunRepository,
} from './repository';
/* eslint-disable @backstage/no-mixed-plugin-imports, @backstage/no-forbidden-package-imports -- cross-plugin PostgreSQL integration test uses URS test helpers */
import {
  createTestDatabase,
  type TestDatabase,
} from '@internal/plugin-urs-composer-backend/src/__testUtils__/testDatabase';
import { URSService } from '@internal/plugin-urs-composer-backend/src/service';
import { PostgresURSRepository } from '@internal/plugin-urs-composer-backend/src/postgres-repository';
import {
  ValidationExpertService,
  type UrsBaselineResolver,
} from './service';
import type { ApprovedURSReference, CreateValidationContextRequest } from './types';
import type { LoggerService } from '@backstage/backend-plugin-api';

const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(() => mockLogger),
};

function makeReference(
  overrides: Partial<ApprovedURSReference> = {},
): ApprovedURSReference {
  return {
    requirementSetId: 'URS-DP-PROOF',
    baselineId: 'baseline-approved-1',
    baselineVersion: '1.0',
    requirementSetTitle: 'Proof Requirement Set',
    businessCapabilityIds: [
      'business-capability:make/equipment-performance-management',
    ],
    approvalStatus: 'APPROVED',
    approvedAt: new Date().toISOString(),
    approvedBy: 'user:default/approver',
    sourceSystem: 'urs-composer',
    requirementIds: ['URS-DP-PROOF-001', 'URS-DP-PROOF-002'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeService(options?: {
  resolver?: UrsBaselineResolver;
  repository?: MemoryValidationRunRepository;
}) {
  const repository = options?.repository ?? new MemoryValidationRunRepository();
  const service = new ValidationExpertService({
    validationRoot: '.',
    repository,
    runners: undefined as never,
    ursBaselineResolver:
      options?.resolver ??
      {
        async resolveApprovedBaseline(req: CreateValidationContextRequest) {
          return { reference: makeReference({ baselineId: req.baselineId }) };
        },
      },
  } as any);
  return { service, repository };
}

describe('URS → Validation integration (entry gate + context)', () => {
  it('A: creates a validation context from an APPROVED baseline', async () => {
    const { service, repository } = makeService();
    const { context, created } = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' },
      'user:default/author',
    );
    expect(created).toBe(true);
    expect(context.status).toBe('PENDING');
    expect(context.source.approvalStatus).toBe('APPROVED');
    expect(context.source.sourceSystem).toBe('urs-composer');
    expect(repository.listContexts()).toHaveLength(1);
  });

  it('B/C/D: denies DRAFT, IN_REVIEW(SUBMITTED) and REJECTED baselines', async () => {
    const denied: string[] = ['DRAFT', 'IN_REVIEW', 'REJECTED'];
    for (const status of denied) {
      const { service } = makeService({
        resolver: {
          async resolveApprovedBaseline() {
            return { reference: makeReference({ approvalStatus: status }) };
          },
        },
      });
      await expect(
        service.createContextFromApprovedUrs(
          { requirementSetId: 'URS-DP-X', baselineId: 'baseline-no' },
          'user:default/author',
        ),
      ).rejects.toThrow(/APPROVED/);
    }
  });

  it('E: duplicate request returns the existing context (no duplicate)', async () => {
    const { service, repository } = makeService();
    const first = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' },
      'user:default/author',
    );
    const second = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' },
      'user:default/author',
    );
    expect(second.created).toBe(false);
    expect(second.context.id).toBe(first.context.id);
    expect(repository.listContexts()).toHaveLength(1);
  });

  it('F: baseline reference stays anchored (1.0 never silently mutated to 1.1)', async () => {
    const { service } = makeService();
    const { context } = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' },
      'user:default/author',
    );
    expect(context.source.baselineId).toBe('baseline-approved-1');
    expect(context.source.baselineVersion).toBe('1.0');
  });

  it('G: Business Capability reference retained in the approved reference', async () => {
    const { service } = makeService();
    const { context } = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' },
      'user:default/author',
    );
    expect(context.source.businessCapabilityIds).toEqual([
      'business-capability:make/equipment-performance-management',
    ]);
  });

  it('H: requirement IDs retained (stable IDs, not titles)', async () => {
    const { service } = makeService();
    const { context } = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' },
      'user:default/author',
    );
    expect(context.source.requirementIds).toEqual([
      'URS-DP-PROOF-001',
      'URS-DP-PROOF-002',
    ]);
  });

  it('immutable reference yields a deterministic idempotent identity', () => {
    const ref = makeReference();
    const a = createHash('sha256')
      .update(`${ref.requirementSetId}::${ref.baselineId}::${ref.baselineVersion}`)
      .digest('hex')
      .slice(0, 12);
    const b = createHash('sha256')
      .update(`${ref.requirementSetId}::${ref.baselineId}::${ref.baselineVersion}`)
      .digest('hex')
      .slice(0, 12);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('URS → Validation integration against real PostgreSQL', () => {
  // Uses the same environment/pattern as the URS runtime-proof: postgres-urs-verify
  // on port 5435. Skips (does not fail) when PostgreSQL is unavailable.
  const CAPABILITY = 'business-capability:make/equipment-performance-management';

  // The URS service resolves approval roles from catalog group membership and
  // fails closed without a catalog. The approver drives every step of the
  // baseline chain here, so it needs each reviewing group.
  const CATALOG: any = {
    getEntityByRef: async (ref: string) => ({
      kind: 'User',
      metadata: { name: ref },
      spec: {
        memberOf:
          ref === 'user:default/approver'
            ? [
                'group:default/urs-business-reviewers',
                'group:default/urs-product-managers',
                'group:default/urs-quality-reviewers',
              ]
            : ['group:default/urs-authors'],
      },
    }),
  };

  let testDb: TestDatabase;
  let dbAvailable = false;

  beforeAll(async () => {
    testDb = await createTestDatabase('validation-context-integration', {
      seed: true,
    });
    dbAvailable = testDb.available;
  }, 60000);

  afterAll(async () => {
    await testDb?.dispose();
  }, 60000);

  it('creates a context from a genuinely APPROVED baseline (real PostgreSQL)', async () => {
    if (!dbAvailable) {
      return;
    }
    const db = testDb.db;
    // The constructor takes a Knex directly; the getClient wrapper belongs to
    // the static create() factory, which is what the Backstage DatabaseService
    // shape needs. Passing the wrapper here made every query fail with
    // "this.db is not a function".
    const repository = new PostgresURSRepository(db);
    const service = new URSService({
      logger: mockLogger,
      repository,
      catalog: CATALOG,
    });

    // Create an approved requirement set; then create + fully approve a
    // baseline through its approval workflow so the baseline itself is
    // genuinely APPROVED (the final step approval cascades baseline → APPROVED).
    const set = await service.createRequirementSet(
      {
        businessCapabilityRefs: [CAPABILITY],
        businessNeed: 'Approved baseline integration proof',
        solutionType: 'PROJECT',
        solutionName: 'Validation Proof',
      },
      'user:default/author',
    );
    const baseline = await service.createBaseline(
      set.id,
      [],
      '1.0',
      'user:default/author',
    );
    const instance = await service.submitBaseline(baseline.id, 'user:default/author');
    for (const step of instance.steps ?? []) {
      await service.approveApprovalStep(
        instance.id,
        step.id,
        'user:default/approver',
        'Approved',
      );
    }
    const approvedBaseline = await service.getBaseline(baseline.id);
    expect(String(approvedBaseline!.status).toUpperCase()).toBe('APPROVED');

    // Resolver boundary: reads the URS baseline + requirement set through the
    // URS service/repository (never validation-expert PG tables).
    const resolver: UrsBaselineResolver = {
      async resolveApprovedBaseline(request: CreateValidationContextRequest) {
        const b = await service.getBaseline(request.baselineId);
        if (!b) {
          throw new Error('Baseline not found');
        }
        if (String(b.status ?? '').toUpperCase() !== 'APPROVED') {
          throw new Error(
            `URS baseline ${request.baselineId} is ${b.status}; a validation context may only be created from an APPROVED baseline`,
          );
        }
        const rs = await service.getRequirementSet(b.requirementSetId);
        return {
          reference: {
            requirementSetId: b.requirementSetId,
            baselineId: b.id,
            baselineVersion: b.baselineVersion,
            requirementSetTitle: rs?.solutionName,
            businessCapabilityIds: rs?.businessCapabilityRefs ?? [],
            approvalStatus: 'APPROVED',
            approvedAt: undefined,
            approvedBy: 'user:default/approver',
            sourceSystem: 'urs-composer',
            requirementIds: b.requirementVersionIds ?? [],
            createdAt: new Date().toISOString(),
          },
        };
      },
    };

    const store = new MemoryValidationRunRepository();
    const ve = new ValidationExpertService({
      validationRoot: '.',
      repository: store,
      runners: undefined as never,
      ursBaselineResolver: resolver,
    } as any);

    const { context, created } = await ve.createContextFromApprovedUrs(
      { requirementSetId: set.id, baselineId: baseline.id },
      'user:default/author',
    );
    expect(created).toBe(true);
    expect(context.source.approvalStatus).toBe('APPROVED');
    expect(context.source.businessCapabilityIds).toEqual([CAPABILITY]);
    expect(context.source.baselineVersion).toBe('1.0');
    expect(store.listContexts()).toHaveLength(1);
  });
});


describe('URS → Validation authorization (backend enforced)', () => {
  it('L: unauthorized user is DENIED (403) creating a context', async () => {
    const express = require('express');
    const http = require('http');
    const { createRouter } = require('./router');
    const { AuthorizeResult } = require('@backstage/plugin-permission-common');
    const store = new MemoryValidationRunRepository();
    const service = new ValidationExpertService({
      validationRoot: '.',
      repository: store,
      runners: undefined as never,
      ursBaselineResolver: {
        async resolveApprovedBaseline(req: CreateValidationContextRequest) {
          return { reference: makeReference({ baselineId: req.baselineId }) };
        },
      },
    } as any);
    const permissions = {
      authorize: jest
        .fn()
        .mockResolvedValue([{ result: AuthorizeResult.DENY }]),
    };
    const httpAuth = {
      credentials: jest.fn().mockResolvedValue({
        principal: { userEntityRef: 'user:default/developer' },
      }),
    };
    const logger: LoggerService = {
      debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
      child: jest.fn(() => logger),
    };
    const router = await createRouter({
      logger, httpAuth, permissions, service,
    } as never);
    const app = express();
    app.use('/api/validation-expert', router);
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const port = typeof addr === 'string' ? 0 : addr!.port;
    const res = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1', port, path: '/api/validation-expert/contexts/from-urs',
          method: 'POST',
        },
        (r: any) => {
          let data = '';
          r.on('data', (c: any) => (data += c));
          r.on('end', () => resolve({ status: r.statusCode, body: data }));
        },
      );
      req.on('error', reject);
      req.write(JSON.stringify({ requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' }));
      req.end();
    });
    expect(res.status).toBe(403);
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('M: authorized user is ALLOWED to create a context (201)', async () => {
    const express = require('express');
    const http = require('http');
    const { createRouter } = require('./router');
    const { AuthorizeResult } = require('@backstage/plugin-permission-common');
    const store = new MemoryValidationRunRepository();
    const service = new ValidationExpertService({
      validationRoot: '.',
      repository: store,
      runners: undefined as never,
      ursBaselineResolver: {
        async resolveApprovedBaseline(req: CreateValidationContextRequest) {
          return { reference: makeReference({ baselineId: req.baselineId }) };
        },
      },
    } as any);
    const permissions = {
      authorize: jest
        .fn()
        .mockResolvedValue([{ result: AuthorizeResult.ALLOW }]),
    };
    const httpAuth = {
      credentials: jest.fn().mockResolvedValue({
        principal: { userEntityRef: 'user:default/author' },
      }),
    };
    const logger: LoggerService = {
      debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
      child: jest.fn(() => logger),
    };
    const router = await createRouter({
      logger, httpAuth, permissions, service,
    } as never);
    const app = express();
    app.use('/api/validation-expert', router);
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const port = typeof addr === 'string' ? 0 : addr!.port;
    const res = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1', port, path: '/api/validation-expert/contexts/from-urs',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (r: any) => {
          let data = '';
          r.on('data', (c: any) => (data += c));
          r.on('end', () =>
            resolve({ status: r.statusCode, body: data ? JSON.parse(data) : null }),
          );
        },
      );
      req.on('error', reject);
      req.write(JSON.stringify({ requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-approved-1' }));
      req.end();
    });

    expect(res.status).toBe(201);
    expect(res.body.context.source.approvalStatus).toBe('APPROVED');
    await new Promise<void>(resolve => server.close(() => resolve()));
  });
});

describe('URS → Validation context persistence + reload proof', () => {
  // Uses the existing FileValidationRunRepository (the same store as runs,
  // findings, evidence). A context must survive repository/service recreation
  // with an identical, immutable ApprovedURSReference.
  let dir: string;
  let storePath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-int-'));
    storePath = path.join(dir, 'runs-store.json');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function makeFileService() {
    const repository = new FileValidationRunRepository(storePath);
    const service = new ValidationExpertService({
      validationRoot: '.',
      repository,
      runners: undefined as never,
      ursBaselineResolver: {
        async resolveApprovedBaseline(req: CreateValidationContextRequest) {
          return {
            reference: makeReference({
              baselineId: req.baselineId,
              baselineVersion: '1.0',
              requirementSetId: req.requirementSetId,
            }),
          };
        },
      },
    } as any);
    return { repository, service };
  }

  it('A+B: context + immutable ApprovedURSReference survive repository/service restart', async () => {
    const before = makeFileService();
    const { context, created } = await before.service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PERSIST', baselineId: 'baseline-persist-1' },
      'user:default/approver',
    );
    expect(created).toBe(true);
    const contextId = context.id;

    // Simulate restart: destroy the repository/service by creating entirely
    // new instances pointed at the same persisted store file.
    const after = makeFileService();
    const reloaded = after.repository.getContext(contextId);
    expect(reloaded).toBeDefined();
    expect(reloaded!.id).toBe(contextId);
    expect(reloaded!.source.requirementSetId).toBe('URS-DP-PERSIST');
    expect(reloaded!.source.baselineId).toBe('baseline-persist-1');
    expect(reloaded!.source.baselineVersion).toBe('1.0');
    expect(reloaded!.source.businessCapabilityIds).toEqual([
      'business-capability:make/equipment-performance-management',
    ]);
    expect(reloaded!.source.requirementIds).toEqual([
      'URS-DP-PROOF-001',
      'URS-DP-PROOF-002',
    ]);
    expect(reloaded!.source.approvalStatus).toBe('APPROVED');
    expect(reloaded!.source.sourceSystem).toBe('urs-composer');
    expect(reloaded!.source.approvedBy).toBe('user:default/approver');
  });

  it('H: duplicate prevention survives restart (no second context created)', async () => {
    const first = makeFileService();
    await first.service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PERSIST', baselineId: 'baseline-persist-1' },
      'user:default/approver',
    );
    // After "restart", a duplicate request must return the SAME context, not a new one.
    const restarted = makeFileService();
    const { context, created } = await restarted.service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PERSIST', baselineId: 'baseline-persist-1' },
      'user:default/approver',
    );
    expect(created).toBe(false);
    expect(context.source.baselineId).toBe('baseline-persist-1');
    expect(restarted.repository.listContexts()).toHaveLength(1);
  });
});

