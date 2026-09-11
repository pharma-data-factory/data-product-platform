/**
 * Complete example URS coverage — one editable seed requirement set per
 * business capability, each carrying Business Need, URS Context, Requirements
 * and Acceptance Criteria.
 *
 * These tests verify the seed DATA and its round-trip through the in-memory
 * repository. They deliberately do NOT re-create the seeded sets via the
 * service: the stable keys (URS-WD, URS-EPM, …) are already taken once
 * `seedRequirementSets()` has run, so creation would collide by design.
 */

import {
  isComponentType,
  isCriticality,
  isRequirementNature,
} from '@internal/platform-common';
import { URSRepository } from './repository';
import { BUSINESS_CAPABILITIES } from './data/businessCapabilities';
import {
  SEED_REQUIREMENT_SETS,
  SeedRequirementSet,
  acceptanceIntentFromSeed,
} from './data/seedRequirementSets';
import {
  SEED_BUSINESS_ROLE_NAMES,
  businessRoleIdFromName,
} from './db/seeds';
import { RequirementPriority } from './types';

const STABLE_KEY = /^URS-[A-Z0-9]{2,12}$/;

function expectedPriority(criticality: string): RequirementPriority {
  return criticality === 'MEDIUM' || criticality === 'LOW'
    ? RequirementPriority.SHOULD
    : RequirementPriority.MUST;
}

describe('capability URS seed coverage', () => {
  it('provides at least one example URS for every seeded business capability', () => {
    const covered = new Set<string>();
    for (const set of SEED_REQUIREMENT_SETS) {
      for (const ref of set.businessCapabilityRefs) {
        covered.add(ref);
      }
    }

    const missing = BUSINESS_CAPABILITIES.filter(cap => !covered.has(cap.id)).map(
      cap => cap.id,
    );

    expect(missing).toEqual([]);
  });

  it('seeds one requirement set per capability with a unique stable key', () => {
    expect(SEED_REQUIREMENT_SETS).toHaveLength(BUSINESS_CAPABILITIES.length);

    const keys = SEED_REQUIREMENT_SETS.map(s => s.requirementSetId);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(STABLE_KEY);
    }
  });

  it('only references capabilities that are actually seeded', () => {
    const seeded = new Set(BUSINESS_CAPABILITIES.map(c => c.id));
    for (const set of SEED_REQUIREMENT_SETS) {
      expect(set.businessCapabilityRefs.length).toBeGreaterThan(0);
      for (const ref of set.businessCapabilityRefs) {
        expect({ key: set.requirementSetId, ref, ok: seeded.has(ref) }).toEqual({
          key: set.requirementSetId,
          ref,
          ok: true,
        });
      }
    }
  });
});

describe.each(SEED_REQUIREMENT_SETS.map(s => [s.requirementSetId, s] as const))(
  'seed URS %s is complete',
  (_key, set: SeedRequirementSet) => {
    it('carries a Business Need', () => {
      expect(set.businessNeed.trim().length).toBeGreaterThan(0);
    });

    it('carries URS Context (scope)', () => {
      expect(set.scope?.trim().length ?? 0).toBeGreaterThan(0);
    });

    it('references stakeholders that are seeded business roles', () => {
      const seeded = new Set(
        SEED_BUSINESS_ROLE_NAMES.map(name => businessRoleIdFromName(name)),
      );
      expect(set.stakeholders.length).toBeGreaterThan(0);
      for (const ref of set.stakeholders) {
        expect(seeded.has(ref)).toBe(true);
      }
    });

    it('has requirements, each a valid "shall" statement', () => {
      expect(set.requirements.length).toBeGreaterThan(0);
      for (const req of set.requirements) {
        expect(req.title.trim().length).toBeGreaterThan(0);
        expect(req.statement).toMatch(/^The solution shall /);
      }
    });

    it('classifies every requirement with valid vocabulary', () => {
      for (const req of set.requirements) {
        expect(isComponentType(req.classification.componentType)).toBe(true);
        expect(isRequirementNature(req.classification.requirementNature)).toBe(true);
        expect(isCriticality(req.classification.criticality)).toBe(true);
      }
    });

    it('derives priority from criticality', () => {
      for (const req of set.requirements) {
        expect({ id: req.requirementId, priority: req.priority }).toEqual({
          id: req.requirementId,
          priority: expectedPriority(req.classification.criticality),
        });
      }
    });

    it('gives every requirement at least one acceptance criterion', () => {
      for (const req of set.requirements) {
        expect(req.acceptanceCriteria?.length ?? 0).toBeGreaterThan(0);
        for (const ac of req.acceptanceCriteria ?? []) {
          expect(ac.title.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('numbers requirement IDs sequentially from the stable key', () => {
      const ids = set.requirements.map(r => r.requirementId);
      expect(ids).toEqual(
        Array.from(
          { length: ids.length },
          (_, i) => `${set.requirementSetId}-${String(i + 1).padStart(3, '0')}`,
        ),
      );
    });
  },
);

describe('in-memory seed round-trip', () => {
  let repository: URSRepository;

  beforeEach(() => {
    repository = new URSRepository();
    repository.seedRequirementSets();
  });

  it('does not seed requirement sets until seedRequirementSets is called', () => {
    const fresh = new URSRepository();
    return expect(fresh.listRequirementSets(100, 0)).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('is idempotent', async () => {
    repository.seedRequirementSets();
    const { total } = await repository.listRequirementSets(100, 0);
    expect(total).toBe(SEED_REQUIREMENT_SETS.length);
  });

  it.each(SEED_REQUIREMENT_SETS.map(s => [s.requirementSetId, s] as const))(
    'persists %s with Business Need, Context and acceptance criteria intact',
    async (key, seed) => {
      const stored = await repository.findRequirementSetByKey(key);
      expect(stored).not.toBeNull();
      expect(stored!.businessNeed).toBe(seed.businessNeed);
      expect(stored!.scope).toBe(seed.scope);

      const requirements = await repository.getRequirements(stored!.id);
      expect(requirements.map(r => r.requirementId)).toEqual(
        seed.requirements.map(r => r.requirementId),
      );

      for (let i = 0; i < seed.requirements.length; i += 1) {
        const storedReq = requirements[i];
        const seedReq = seed.requirements[i];
        expect(storedReq.rationale).toBe(seedReq.rationale);
        expect(JSON.parse(storedReq.acceptanceIntent!)).toEqual(
          seedReq.acceptanceCriteria,
        );
      }
    },
  );

  it('serializes acceptance criteria to the acceptanceIntent JSON the UI parses', () => {
    const criteria = [{ title: 'AC-1', verificationMethod: 'Test' }];
    expect(JSON.parse(acceptanceIntentFromSeed(criteria)!)).toEqual(criteria);
    expect(acceptanceIntentFromSeed(undefined)).toBeUndefined();
    expect(acceptanceIntentFromSeed([])).toBeUndefined();
  });
});
