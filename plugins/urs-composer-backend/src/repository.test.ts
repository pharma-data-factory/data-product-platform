/**
 * URS Repository Contract Tests
 *
 * Tests both InMemoryURSRepository and PostgresURSRepository
 * with identical behavioral contracts.
 *
 * This proves that replacing the in-memory repository does not
 * change domain semantics.
 */

import { URSRepository } from './repository';
import { PostgresURSRepository } from './postgres-repository';
import { IURSRepository } from './repository-interface';
import { createTestDatabase, TestDatabase } from './__testUtils__/testDatabase';
import { describeWhenPg } from './__testUtils__/describeWhenAvailable';
import {
  RequirementSet,
  RequirementVersion,
  Baseline,
  ApprovalWorkflow,
  ApprovalInstance,
  ApprovalRole,
  AuditEvent,
  BusinessCapabilityPersisted,
  SolutionType,
  URSStatus,
  RequirementPriority,
  ApprovalInstanceStatus,
  ApprovalStepStatus,
} from './types';

function registerRepositoryContractTests(
  createRepo: () => IURSRepository,
  options: {
    givenRequirementSet?: (repo: IURSRepository, id: string) => Promise<void>;
  } = {},
) {
  let repo: IURSRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('Business Capability CRUD', () => {
      test('create and retrieve capability', async () => {
        const cap: BusinessCapabilityPersisted = {
          id: 'test-cap-001',
          name: 'Test Capability',
          description: 'Testing',
          domain: 'make',
          status: 'ACTIVE',
          source: 'DOCUMENTATION',
          version: 1,
          createdAt: new Date(),
          createdBy: 'system',
        };

        const result = await repo.createBusinessCapability(cap);
        expect(result.id).toBe(cap.id);
      });

      test('retrieve existing capability', async () => {
        const cap: BusinessCapabilityPersisted = {
          id: 'test-cap-002',
          name: 'Retrieve Test',
          description: 'Test',
          domain: 'make',
          status: 'ACTIVE',
          source: 'DOCUMENTATION',
          version: 1,
          createdAt: new Date(),
          createdBy: 'system',
        };

        await repo.createBusinessCapability(cap);
        const retrieved = await repo.getBusinessCapability(cap.id);
        expect(retrieved?.id).toBe(cap.id);
      });
    });

    describe('Requirement Set CRUD', () => {
      test('create requirement set', async () => {
        const set: RequirementSet = {
          id: 'urs-001',
          requirementSetId: 'URS-DP-001',
          versionNumber: 1,
          businessCapabilityRefs: [],
          businessNeed: 'Test need',
          solutionType: SolutionType.DATA_PRODUCT,
          solutionName: 'Test',
          status: URSStatus.DRAFT,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        const result = await repo.createRequirementSet(set);
        expect(result.requirementSetId).toBe('URS-DP-001');
      });

      test('retrieve requirement set', async () => {
        const set: RequirementSet = {
          id: 'urs-002',
          requirementSetId: 'URS-DP-002',
          versionNumber: 1,
          businessCapabilityRefs: [],
          businessNeed: 'Retrieve test',
          solutionType: SolutionType.PROJECT,
          solutionName: 'Retrieve test',
          status: URSStatus.DRAFT,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        await repo.createRequirementSet(set);
        const retrieved = await repo.getRequirementSet(set.id);
        expect(retrieved?.requirementSetId).toBe('URS-DP-002');
      });

      test('update requirement set status', async () => {
        const set: RequirementSet = {
          id: 'urs-003',
          requirementSetId: 'URS-DP-003',
          versionNumber: 1,
          businessCapabilityRefs: [],
          businessNeed: 'Update test',
          solutionType: SolutionType.COMPONENT,
          solutionName: 'Update test',
          status: URSStatus.DRAFT,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        await repo.createRequirementSet(set);
        const updated = { ...set, status: URSStatus.IN_REVIEW, revision: 2 };
        await repo.updateRequirementSet(updated);

        const retrieved = await repo.getRequirementSet(set.id);
        expect(retrieved?.status).toBe(URSStatus.IN_REVIEW);
      });
    });

    describe('Requirement Version', () => {
      test('create and retrieve version', async () => {
        const version: RequirementVersion = {
          id: 'req-v-001',
          requirementId: 'URS-REQ-001',
          version: '1.0',
          versionNumber: 100,
          title: 'Test Requirement',
          statement: 'The solution shall...',
          priority: RequirementPriority.MUST,
          status: URSStatus.DRAFT,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        const result = await repo.createRequirementVersion(version);
        expect(result.version).toBe('1.0');

        const retrieved = await repo.getRequirementVersion(version.id);
        expect(retrieved?.version).toBe('1.0');
      });

      test('retrieve version history ordered by version number', async () => {
        const v1: RequirementVersion = {
          id: 'req-v-h1',
          requirementId: 'URS-HIST-001',
          version: '1.0',
          versionNumber: 100,
          title: 'V1',
          statement: 'V1 statement',
          priority: RequirementPriority.MUST,
          status: URSStatus.APPROVED,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        const v11: RequirementVersion = {
          id: 'req-v-h2',
          requirementId: 'URS-HIST-001',
          version: '1.1',
          versionNumber: 101,
          title: 'V1.1',
          statement: 'V1.1 statement',
          priority: RequirementPriority.MUST,
          status: URSStatus.DRAFT,
          createdBy: 'test-user',
          createdAt: new Date(Date.now() + 1000),
          revision: 1,
        };

        await repo.createRequirementVersion(v1);
        await repo.createRequirementVersion(v11);

        const history = await repo.getRequirementVersions('URS-HIST-001', 'asc');
        expect(history.length).toBe(2);
        expect(history[0].versionNumber).toBe(100);
        expect(history[1].versionNumber).toBe(101);
      });

      test('get current approved version', async () => {
        const v1: RequirementVersion = {
          id: 'req-v-app1',
          requirementId: 'URS-APP-001',
          version: '1.0',
          versionNumber: 100,
          title: 'V1',
          statement: 'V1',
          priority: RequirementPriority.MUST,
          status: URSStatus.APPROVED,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        await repo.createRequirementVersion(v1);
        const current = await repo.getCurrentApprovedVersion('URS-APP-001');
        expect(current?.version).toBe('1.0');
        expect(current?.status).toBe(URSStatus.APPROVED);
      });
    });

    describe('Baseline', () => {
      async function givenRequirementSet(id: string) {
        if (options.givenRequirementSet) {
          await options.givenRequirementSet(repo, id);
          return;
        }
        const set: RequirementSet = {
          id,
          requirementSetId: id.toUpperCase(),
          versionNumber: 1,
          businessCapabilityRefs: [],
          businessNeed: 'Baseline parent',
          solutionType: SolutionType.PROJECT,
          solutionName: 'Baseline parent',
          status: URSStatus.DRAFT,
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };
        if (!(await repo.getRequirementSet(id))) {
          await repo.createRequirementSet(set);
        }
      }

      test('create and retrieve baseline', async () => {
        await givenRequirementSet('urs-001');
        const baseline: Baseline = {
          id: 'baseline-001',
          requirementSetId: 'urs-001',
          baselineVersion: '1.0',
          status: URSStatus.DRAFT,
          requirementVersionIds: ['uuid-a', 'uuid-b'],
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };

        const result = await repo.createBaseline(baseline);
        expect(result.baselineVersion).toBe('1.0');

        const retrieved = await repo.getBaseline(baseline.id);
        expect(retrieved?.requirementVersionIds.length).toBe(2);
      });

      test('get current approved baseline', async () => {
        await givenRequirementSet('urs-app-001');
        const baseline: Baseline = {
          id: 'baseline-app1',
          requirementSetId: 'urs-app-001',
          baselineVersion: '1.0',
          status: URSStatus.DRAFT,
          requirementVersionIds: ['uuid-a'],
          createdBy: 'test-user',
          createdAt: new Date(),
          revision: 1,
        };
        const chain = [
          URSStatus.IN_REVIEW,
          URSStatus.IN_APPROVAL,
          URSStatus.APPROVED,
        ].map(status => ({ ...baseline, status }));

        await repo.createBaseline(baseline);
        for (const step of chain) {
          await repo.updateBaseline(step);
        }
        const current = await repo.getCurrentApprovedBaseline('urs-app-001');
        expect(current?.baselineVersion).toBe('1.0');
      });
    });

    describe('Approval Workflow', () => {
      test('create and retrieve workflow', async () => {
        const workflow: ApprovalWorkflow = {
          id: 'workflow-001',
          name: 'Test Workflow',
          steps: [
            { sequence: 1, role: ApprovalRole.BUSINESS_REVIEWER, required: true },
            { sequence: 2, role: ApprovalRole.PRODUCT_MANAGER, required: true },
          ],
          createdAt: new Date(),
        };

        const result = await repo.createApprovalWorkflow(workflow);
        expect(result.name).toBe('Test Workflow');

        const retrieved = await repo.getApprovalWorkflow(workflow.id);
        expect(retrieved?.steps.length).toBe(2);
      });
    });

    describe('Approval Instance & Steps', () => {
      test('create approval instance with steps', async () => {
        const instance: ApprovalInstance = {
          id: 'instance-001',
          workflowId: 'workflow-001',
          baselineId: 'baseline-001',
          status: ApprovalInstanceStatus.NOT_STARTED,
          currentStepSequence: 0,
          startedBy: 'test-user',
          startedAt: new Date(),
          steps: [
            {
              id: 'step-001',
              approvalInstanceId: 'instance-001',
              sequence: 1,
              role: ApprovalRole.BUSINESS_REVIEWER,
              status: 'PENDING' as ApprovalStepStatus,
            },
          ],
          revision: 1,
        };

        const result = await repo.createApprovalInstance(instance);
        expect(result.id).toBe('instance-001');

        const retrieved = await repo.getApprovalInstance(instance.id);
        expect(retrieved?.steps.length).toBe(1);
      });
    });

    describe('Audit Trail', () => {
      test('create and retrieve audit events', async () => {
        const event: AuditEvent = {
          id: 'audit-001',
          entityType: 'REQUIREMENT_SET',
          entityId: 'urs-001',
          eventType: 'CREATED',
          actor: 'test-user',
          timestamp: new Date(),
        };

        await repo.createAuditEvent(event);
        const trail = await repo.getAuditTrail('urs-001');
        expect(trail.length).toBeGreaterThan(0);
      });

      test('get entity audit trail', async () => {
        const event: AuditEvent = {
          id: 'audit-entity-001',
          entityType: 'REQUIREMENT_VERSION',
          entityId: 'req-v-audit-001',
          eventType: 'APPROVED',
          actor: 'test-user',
          timestamp: new Date(),
        };

        await repo.createAuditEvent(event);
        const trail = await repo.getEntityAuditTrail(
          'req-v-audit-001',
          'REQUIREMENT_VERSION',
        );
        expect(trail.length).toBeGreaterThan(0);
      });
    });

  describe('Transaction', () => {
    test('support transaction interface', async () => {
      const tx = await repo.beginTransaction();
      expect(tx).toBeDefined();
      expect(tx.commit).toBeDefined();
      expect(tx.rollback).toBeDefined();
      expect(tx.execute).toBeDefined();

      await tx.rollback();
    });
  });
}

describe('URS Repository Contract (InMemory)', () => {
  registerRepositoryContractTests(() => new URSRepository());
});

describeWhenPg('URS Repository Contract (Postgres)', () => {
  let testDb: TestDatabase;
  let postgresRepo: IURSRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase('repository-contract-pg');
    postgresRepo = new PostgresURSRepository(testDb.db);
  }, 60000);

  afterAll(async () => {
    await testDb.dispose();
  }, 60000);

  registerRepositoryContractTests(() => postgresRepo, {
    givenRequirementSet: async (repo, id) => {
      const set: RequirementSet = {
        id,
        requirementSetId: id.toUpperCase(),
        versionNumber: 1,
        businessCapabilityRefs: [],
        businessNeed: 'Baseline parent',
        solutionType: SolutionType.PROJECT,
        solutionName: 'Baseline parent',
        status: URSStatus.DRAFT,
        createdBy: 'test-user',
        createdAt: new Date(),
        revision: 1,
      };
      if (!(await repo.getRequirementSet(id))) {
        await repo.createRequirementSet(set);
      }
    },
  });
});
