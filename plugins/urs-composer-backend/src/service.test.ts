/**
 * URS Service Tests
 * Business logic unit tests
 */

import { URSService } from './service';
import { URSRepository } from './repository';
import {
  SolutionType,
  GxPRelevance,
  RequirementPriority,
  URSStatus,
} from './types';

// Mock logger
const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

describe('URSService', () => {
  let service: URSService;
  let repository: URSRepository;

  beforeEach(() => {
    repository = new URSRepository();
    service = new URSService({
      logger: mockLogger as any,
      repository,
    });
  });

  describe('Business Capabilities', () => {
    test('getCapabilities returns all capabilities', async () => {
      const caps = await service.getCapabilities();
      expect(caps.length).toBeGreaterThan(0);
      expect(caps[0]).toHaveProperty('id');
      expect(caps[0]).toHaveProperty('name');
    });

    test('getCapability finds capability by id', async () => {
      const cap = await service.getCapability(
        'business-capability:make/equipment-performance-management',
      );
      expect(cap).toBeDefined();
      expect(cap?.name).toBe('Equipment Performance Management');
    });

    test('getCapability returns null for unknown id', async () => {
      const cap = await service.getCapability('unknown:id');
      expect(cap).toBeNull();
    });

    test('validateCapabilityRefs rejects unknown capability', async () => {
      const valid = await service.validateCapabilityRefs(['unknown:capability']);
      expect(valid).toBe(false);
    });

    test('validateCapabilityRefs accepts known capability', async () => {
      const valid = await service.validateCapabilityRefs([
        'business-capability:make/equipment-performance-management',
      ]);
      expect(valid).toBe(true);
    });
  });

  describe('Requirement Sets', () => {
    test('createRequirementSet creates and stores', async () => {
      const set = await service.createRequirementSet(
        {
          businessCapabilityRefs: ['business-capability:make/equipment-performance-management'],
          businessNeed: 'Operations need equipment visibility',
          solutionType: SolutionType.DATA_PRODUCT,
          solutionName: 'OEE Data Product',
        },
        'user:default/test-user',
      );

      expect(set).toBeDefined();
      expect(set.requirementSetId).toMatch(/^URS-DP-/);
      expect(set.status).toBe(URSStatus.DRAFT);
      expect(set.createdBy).toBe('user:default/test-user');
    });

    test('createRequirementSet rejects empty capability refs', async () => {
      await expect(
        service.createRequirementSet(
          {
            businessCapabilityRefs: [],
            businessNeed: 'Test',
            solutionType: SolutionType.COMPONENT,
            solutionName: 'Test Component',
          },
          'user:default/test',
        ),
      ).rejects.toThrow();
    });

    test('createRequirementSet rejects invalid capability', async () => {
      await expect(
        service.createRequirementSet(
          {
            businessCapabilityRefs: ['invalid:capability'],
            businessNeed: 'Test',
            solutionType: SolutionType.COMPONENT,
            solutionName: 'Test',
          },
          'user:default/test',
        ),
      ).rejects.toThrow('Invalid business capability reference');
    });

    test('getRequirementSet retrieves created set', async () => {
      const created = await service.createRequirementSet(
        {
          businessCapabilityRefs: ['business-capability:make/equipment-performance-management'],
          businessNeed: 'Test need',
          solutionType: SolutionType.COMPONENT,
          solutionName: 'Test',
        },
        'user:default/test',
      );

      const retrieved = await service.getRequirementSet(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    test('listRequirementSets returns paginated results', async () => {
      const result = await service.listRequirementSets(50, 0);
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('Requirements', () => {
    test('createRequirement creates and stores', async () => {
      const set = await service.createRequirementSet(
        {
          businessCapabilityRefs: ['business-capability:make/equipment-performance-management'],
          businessNeed: 'Test',
          solutionType: SolutionType.DATA_PRODUCT,
          solutionName: 'Test',
        },
        'user:default/test',
      );

      const req = await service.createRequirement(
        set.id,
        {
          title: 'Calculate OEE',
          statement: 'The solution shall calculate OEE for defined equipment.',
          priority: RequirementPriority.MUST,
          gxpRelevance: GxPRelevance.INDIRECT,
        },
        'user:default/test',
      );

      expect(req).toBeDefined();
      expect(req.requirementId).toMatch(/^URS-DP-/);
      expect(req.status).toBe(URSStatus.DRAFT);
    });

    test('getRequirements returns requirements for set', async () => {
      const set = await service.createRequirementSet(
        {
          businessCapabilityRefs: ['business-capability:make/equipment-performance-management'],
          businessNeed: 'Test',
          solutionType: SolutionType.DATA_PRODUCT,
          solutionName: 'Test',
        },
        'user:default/test',
      );

      await service.createRequirement(
        set.id,
        {
          title: 'Requirement 1',
          statement: 'The solution shall...',
          priority: RequirementPriority.MUST,
        },
        'user:default/test',
      );

      const reqs = await service.getRequirements(set.id);
      expect(reqs.length).toBe(1);
    });
  });

  describe('Draft updates', () => {
    test('updateRequirementSetDraft persists set fields and replaces requirements', async () => {
      const set = await service.createRequirementSet(
        {
          businessCapabilityRefs: ['business-capability:make/equipment-performance-management'],
          businessNeed: 'Initial need',
          solutionType: SolutionType.DATA_PRODUCT,
          solutionName: 'Initial Solution',
        },
        'user:default/test',
      );

      const updated = await service.updateRequirementSetDraft(
        set.id,
        {
          businessNeed: 'Updated need',
          solutionName: 'Updated Solution',
          scope: 'Production visibility',
        },
        [
          {
            title: 'Display OEE',
            statement: 'The system shall display OEE.',
            priority: RequirementPriority.MUST,
            acceptanceIntent: JSON.stringify([
              { tempId: 'ac-1', title: 'Given equipment, Then OEE is visible' },
            ]),
          },
        ],
        'user:default/test',
      );

      expect(updated.requirementSet.businessNeed).toBe('Updated need');
      expect(updated.requirementSet.scope).toBe('Production visibility');
      expect(updated.requirements).toHaveLength(1);
      expect(updated.requirements[0].title).toBe('Display OEE');
      expect(updated.requirements[0].acceptanceIntent).toContain('visible');
    });
  });

  describe('Quality Checks', () => {
    test('checkRequirementQuality detects missing title', async () => {
      const issues = await service.checkRequirementQuality({
        statement: 'The solution shall do something',
      });
      expect(issues.some(i => i.issue.includes('title'))).toBe(true);
    });

    test('checkRequirementQuality detects missing statement', async () => {
      const issues = await service.checkRequirementQuality({
        title: 'Some Title',
      });
      expect(issues.some(i => i.issue.includes('statement'))).toBe(true);
    });

    test('checkRequirementQuality detects implementation language', async () => {
      const issues = await service.checkRequirementQuality({
        title: 'Test',
        statement: 'The solution shall use PostgreSQL for storage',
        gxpRelevance: GxPRelevance.DIRECT,
      });
      expect(issues.some(i => i.issue.includes('PostgreSQL'))).toBe(true);
    });

    test('checkRequirementQuality accepts valid requirement', async () => {
      const issues = await service.checkRequirementQuality({
        title: 'Calculate OEE',
        statement: 'The solution shall calculate equipment effectiveness.',
      });
      expect(issues.filter(i => i.severity === 'ERROR').length).toBe(0);
    });
  });
});
