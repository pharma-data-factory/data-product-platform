/**
 * Stable requirement set keys + seeded W&D requirement set.
 *
 * Covers the caller-supplied business key (URS-WD) that keeps requirement IDs
 * stable across environments, and the integrity of the seeded Weighing &
 * Dispensing requirement set derived from it.
 */

import {
  isComponentType,
  isCriticality,
  isRequirementNature,
} from '@internal/platform-common';
import { URSService } from './service';
import { URSRepository } from './repository';
import {
  GxPRelevance,
  RequirementPriority,
  SolutionType,
  URSStatus,
} from './types';
import { BUSINESS_CAPABILITIES } from './data/businessCapabilities';
import {
  SEED_REQUIREMENT_SETS,
  WD_REQUIREMENT_SET,
} from './data/seedRequirementSets';
import {
  SEED_BUSINESS_ROLE_NAMES,
  businessRoleIdFromName,
} from './db/seeds';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const CAPABILITY = 'business-capability:make/material-dispensing';

function baseSetData(overrides: Record<string, unknown> = {}) {
  return {
    businessCapabilityRefs: [CAPABILITY],
    businessNeed: 'Dispensing must be recorded attributable',
    solutionType: SolutionType.COMPONENT,
    solutionName: 'Weighing & Dispensing',
    ...overrides,
  };
}

describe('stable requirement set key', () => {
  let service: URSService;

  beforeEach(() => {
    service = new URSService({
      logger: mockLogger as any,
      repository: new URSRepository(),
    });
  });

  it('honors a caller-supplied stable key', async () => {
    const set = await service.createRequirementSet(
      baseSetData({ requirementSetId: 'URS-WD' }),
      'user:default/test',
    );

    expect(set.requirementSetId).toBe('URS-WD');
    expect(set.status).toBe(URSStatus.DRAFT);
  });

  it('derives requirement IDs from the stable key', async () => {
    const set = await service.createRequirementSet(
      baseSetData({ requirementSetId: 'URS-WD' }),
      'user:default/test',
    );

    const first = await service.createRequirement(
      set.id,
      {
        title: 'Weighing event ingestion',
        statement: 'The solution shall ingest weighing events.',
        priority: RequirementPriority.MUST,
      },
      'user:default/test',
    );
    const second = await service.createRequirement(
      set.id,
      {
        title: 'Material identification',
        statement: 'The solution shall associate material identity.',
        priority: RequirementPriority.MUST,
      },
      'user:default/test',
    );

    expect(first.requirementId).toBe('URS-WD-001');
    expect(second.requirementId).toBe('URS-WD-002');
  });

  it('trims surrounding whitespace before validating the key', async () => {
    const set = await service.createRequirementSet(
      baseSetData({ requirementSetId: '  URS-WD  ' }),
      'user:default/test',
    );

    expect(set.requirementSetId).toBe('URS-WD');
  });

  it.each(['urs-wd', 'URS_WD', 'WD', 'URS-', 'URS-TOOLONGCODEXX'])(
    'rejects malformed key %s',
    async key => {
      await expect(
        service.createRequirementSet(
          baseSetData({ requirementSetId: key }),
          'user:default/test',
        ),
      ).rejects.toThrow(/Invalid requirement set key/);
    },
  );

  it('rejects a duplicate key', async () => {
    await service.createRequirementSet(
      baseSetData({ requirementSetId: 'URS-WD' }),
      'user:default/test',
    );

    await expect(
      service.createRequirementSet(
        baseSetData({ requirementSetId: 'URS-WD' }),
        'user:default/test',
      ),
    ).rejects.toThrow(/already in use/);
  });

  it('still generates a timestamp key when none is supplied', async () => {
    const set = await service.createRequirementSet(
      baseSetData(),
      'user:default/test',
    );

    expect(set.requirementSetId).toMatch(/^URS-CMP-/);
    expect(set.requirementSetId).not.toBe('URS-CMP');
  });
});

describe('W&D seed requirement set', () => {
  it('is registered for seeding', () => {
    expect(SEED_REQUIREMENT_SETS).toContain(WD_REQUIREMENT_SET);
  });

  it('carries URS-WD-001 through URS-WD-010 in order', () => {
    const ids = WD_REQUIREMENT_SET.requirements.map(r => r.requirementId);

    expect(ids).toHaveLength(10);
    expect(ids).toEqual(
      Array.from({ length: 10 }, (_, i) => `URS-WD-${String(i + 1).padStart(3, '0')}`),
    );
    expect(new Set(ids).size).toBe(10);
  });

  it('uses a stable key the service accepts', () => {
    expect(WD_REQUIREMENT_SET.requirementSetId).toMatch(/^URS-[A-Z0-9]{2,12}$/);
  });

  it('classifies every requirement with valid vocabulary', () => {
    for (const req of WD_REQUIREMENT_SET.requirements) {
      expect(isComponentType(req.classification.componentType)).toBe(true);
      expect(isRequirementNature(req.classification.requirementNature)).toBe(true);
      expect(isCriticality(req.classification.criticality)).toBe(true);
    }
  });

  it('derives priority from criticality', () => {
    for (const req of WD_REQUIREMENT_SET.requirements) {
      const expected =
        req.classification.criticality === 'MEDIUM' ||
        req.classification.criticality === 'LOW'
          ? RequirementPriority.SHOULD
          : RequirementPriority.MUST;

      expect({ id: req.requirementId, priority: req.priority }).toEqual({
        id: req.requirementId,
        priority: expected,
      });
    }
  });

  it('writes every statement as a "shall" statement', () => {
    for (const req of WD_REQUIREMENT_SET.requirements) {
      expect(req.title.trim().length).toBeGreaterThan(0);
      expect(req.statement).toMatch(/^The solution shall /);
    }
  });

  it('references capabilities that are seeded', () => {
    const seeded = new Set(BUSINESS_CAPABILITIES.map(c => c.id));

    for (const ref of WD_REQUIREMENT_SET.businessCapabilityRefs) {
      expect(seeded.has(ref)).toBe(true);
    }
  });

  it('references stakeholders that are seeded as business roles', () => {
    const seeded = new Set(
      SEED_BUSINESS_ROLE_NAMES.map(name => businessRoleIdFromName(name)),
    );

    expect(WD_REQUIREMENT_SET.stakeholders.length).toBeGreaterThan(0);
    for (const ref of WD_REQUIREMENT_SET.stakeholders) {
      expect(seeded.has(ref)).toBe(true);
    }
  });

  it('is GxP direct with electronic records, matching the Part 11 requirements', () => {
    expect(WD_REQUIREMENT_SET.gxpRelevance).toBe(GxPRelevance.DIRECT);
    expect(WD_REQUIREMENT_SET.electronicRecords).toBe(true);
    expect(WD_REQUIREMENT_SET.dataIntegrityImpact).toBe(true);

    const part11 = WD_REQUIREMENT_SET.requirements.filter(r =>
      /21 CFR Part 11|electronic signature/i.test(r.statement),
    );
    expect(part11.map(r => r.requirementId)).toEqual([
      'URS-WD-005',
      'URS-WD-008',
    ]);
    for (const req of part11) {
      expect(req.classification.requirementNature).toBe('COMPLIANCE');
      expect(req.classification.criticality).toBe('CRITICAL');
    }
  });

  it('is accepted end to end by the service', async () => {
    const service = new URSService({
      logger: mockLogger as any,
      repository: new URSRepository(),
    });

    const set = await service.createRequirementSet(
      {
        requirementSetId: WD_REQUIREMENT_SET.requirementSetId,
        businessCapabilityRefs: WD_REQUIREMENT_SET.businessCapabilityRefs,
        businessNeed: WD_REQUIREMENT_SET.businessNeed,
        stakeholders: WD_REQUIREMENT_SET.stakeholders,
        solutionType: WD_REQUIREMENT_SET.solutionType,
        solutionName: WD_REQUIREMENT_SET.solutionName,
        gxpRelevance: WD_REQUIREMENT_SET.gxpRelevance,
      },
      'user:default/system',
    );

    for (const req of WD_REQUIREMENT_SET.requirements) {
      await service.createRequirement(
        set.id,
        {
          title: req.title,
          statement: req.statement,
          priority: req.priority,
          classification: req.classification,
          gxpRelevance: req.gxpRelevance,
        },
        'user:default/system',
      );
    }

    const created = await service.getRequirements(set.id);
    expect(created.map(r => r.requirementId)).toEqual(
      WD_REQUIREMENT_SET.requirements.map(r => r.requirementId),
    );
    expect(created[6].classification?.interfaceType).toBe('REST');
  });
});
