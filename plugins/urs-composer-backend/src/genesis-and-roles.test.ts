/**
 * Genesis version + URS domain role resolution.
 *
 * Proves the two go-live blockers for a DRAFT → APPROVED path:
 * 1. createRequirement opens version 0.1 (createRevision alone cannot).
 * 2. Catalog urs-* groups resolve to ApprovalRole values used by the chain.
 *
 * Platform RBAC grants for those groups live in platform-common / backend
 * policy tests; this suite covers the URS service side.
 */

import { URSService } from './service';
import { URSRepository } from './repository';
import {
  ApprovalRole,
  GxPRelevance,
  RequirementPriority,
  SolutionType,
  URSStatus,
} from './types';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

function catalogFor(userGroups: Record<string, string[]>): any {
  return {
    getEntityByRef: jest.fn(async (ref: string) => ({
      kind: 'User',
      metadata: { name: ref },
      spec: {
        memberOf: userGroups[ref] ?? [],
      },
    })),
  };
}

describe('Genesis version and urs-* role resolution', () => {
  test('createRequirement seeds genesis version 0.1', async () => {
    const repository = new URSRepository();
    const service = new URSService({ logger: mockLogger, repository });
    const set = await service.createRequirementSet(
      {
        businessCapabilityRefs: [
          'business-capability:make/equipment-performance-management',
        ],
        businessNeed: 'Genesis proof',
        solutionType: SolutionType.DATA_PRODUCT,
        solutionName: 'Genesis',
        gxpRelevance: GxPRelevance.NONE,
      },
      'user:default/urs-author',
    );

    const req = await service.createRequirement(
      set.id,
      {
        title: 'First requirement',
        statement: 'The solution shall open with a genesis version.',
        priority: RequirementPriority.MUST,
      },
      'user:default/urs-author',
    );

    const versions = await service.getVersionHistory(req.requirementId);
    expect(versions).toHaveLength(1);
    expect(versions[0].status).toBe(URSStatus.DRAFT);
    expect(versions[0].versionLabel ?? versions[0].version).toBe('0.1');
    expect(versions[0].major).toBe(0);
    expect(versions[0].minor).toBe(1);
  });

  test('seeded catalog groups map onto approval roles', async () => {
    const repository = new URSRepository();
    const service = new URSService({
      logger: mockLogger,
      repository,
      catalog: catalogFor({
        'user:default/urs-author': ['group:default/urs-authors'],
        'user:default/urs-business': [
          'group:default/urs-business-reviewers',
        ],
        'user:default/urs-pm': ['group:default/urs-product-managers'],
        'user:default/urs-qa': ['group:default/urs-quality-reviewers'],
      }),
    });

    await expect(
      service.getUserApprovalRoles('user:default/urs-author'),
    ).resolves.toEqual([ApprovalRole.AUTHOR]);
    await expect(
      service.getUserApprovalRoles('user:default/urs-business'),
    ).resolves.toEqual([ApprovalRole.BUSINESS_REVIEWER]);
    await expect(
      service.getUserApprovalRoles('user:default/urs-pm'),
    ).resolves.toEqual([ApprovalRole.PRODUCT_MANAGER]);
    await expect(
      service.getUserApprovalRoles('user:default/urs-qa'),
    ).resolves.toEqual([ApprovalRole.QUALITY_REVIEWER]);
  });
});
