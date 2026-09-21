/**
 * Consistency of the seeded URS library.
 *
 * Every environment starts from this data and validation documents cite its
 * requirement IDs, so a defect here reaches every installation and cannot be
 * corrected by an operator afterwards without breaking those references.
 *
 * The checks are deliberately about the things that only show up across sets —
 * collisions, drift between a set's key and its requirement IDs, capability
 * refs pointing at nothing. Single-set content is the author's business; these
 * are the invariants the library as a whole has to hold.
 *
 * The genesis-version check belongs to the pair of defects that made every
 * seeded set unbaselinable: requirement versions are keyed by the LOGICAL
 * requirement id, not by the row id, so two sets sharing a requirement id
 * would silently share version history.
 */

import { BUSINESS_CAPABILITIES } from './businessCapabilities';
import {
  SEED_REQUIREMENT_SETS,
  acceptanceIntentFromSeed,
  genesisVersionOf,
} from './seedRequirementSets';
import { URSRequirement, URSStatus } from '../types';

const CAPABILITY_IDS = new Set(BUSINESS_CAPABILITIES.map(c => c.id));

/** Mirrors the id both seeders build for a seeded requirement row. */
function rowIdOf(setKey: string, requirementId: string): string {
  return `seed:${setKey.toLowerCase()}-${requirementId.toLowerCase()}`;
}

describe('seeded URS library', () => {
  test('there is at least one set, so these checks cannot pass vacuously', () => {
    expect(SEED_REQUIREMENT_SETS.length).toBeGreaterThan(0);
  });

  test('requirement set keys are unique', () => {
    const keys = SEED_REQUIREMENT_SETS.map(s => s.requirementSetId);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('requirement set keys are stable, not generated', () => {
    // A timestamp or random suffix would make requirement IDs differ per
    // environment, which is exactly what validation references cannot tolerate.
    for (const set of SEED_REQUIREMENT_SETS) {
      expect(set.requirementSetId).toMatch(/^URS-[A-Z]+$/);
    }
  });

  test('requirement IDs are unique across the whole library', () => {
    // Versions are looked up by logical requirement id alone
    // (getRequirementVersions(requirementId)), so a collision between two sets
    // would merge their version histories.
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const set of SEED_REQUIREMENT_SETS) {
      for (const req of set.requirements) {
        const previous = seen.get(req.requirementId);
        if (previous) {
          collisions.push(
            `${req.requirementId} in both ${previous} and ${set.requirementSetId}`,
          );
        }
        seen.set(req.requirementId, set.requirementSetId);
      }
    }

    expect(collisions).toEqual([]);
  });

  test('requirement IDs carry their own set key as prefix', () => {
    const mismatched: string[] = [];

    for (const set of SEED_REQUIREMENT_SETS) {
      for (const req of set.requirements) {
        if (!req.requirementId.startsWith(`${set.requirementSetId}-`)) {
          mismatched.push(`${req.requirementId} in ${set.requirementSetId}`);
        }
      }
    }

    expect(mismatched).toEqual([]);
  });

  test('derived row IDs are unique across the library', () => {
    const ids = SEED_REQUIREMENT_SETS.flatMap(set =>
      set.requirements.map(req =>
        rowIdOf(set.requirementSetId, req.requirementId),
      ),
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every set references capabilities that exist', () => {
    const dangling: string[] = [];

    for (const set of SEED_REQUIREMENT_SETS) {
      expect(set.businessCapabilityRefs.length).toBeGreaterThan(0);
      for (const ref of set.businessCapabilityRefs) {
        if (!CAPABILITY_IDS.has(ref)) {
          dangling.push(`${set.requirementSetId} -> ${ref}`);
        }
      }
    }

    expect(dangling).toEqual([]);
  });

  test('every set carries the fields the wizard and the GxP flags require', () => {
    for (const set of SEED_REQUIREMENT_SETS) {
      expect(set.businessNeed.trim()).not.toBe('');
      expect(set.solutionName.trim()).not.toBe('');
      expect(set.solutionType).toBeTruthy();
      expect(set.gxpRelevance).toBeTruthy();
      expect(set.stakeholders.length).toBeGreaterThan(0);
      expect(typeof set.patientImpact).toBe('boolean');
      expect(typeof set.dataIntegrityImpact).toBe('boolean');
      expect(typeof set.electronicRecords).toBe('boolean');
      expect(set.requirements.length).toBeGreaterThan(0);
    }
  });

  test('every requirement is classified and states something', () => {
    for (const set of SEED_REQUIREMENT_SETS) {
      for (const req of set.requirements) {
        const where = `${set.requirementSetId}/${req.requirementId}`;

        expect(`${where}: ${req.title.trim()}`).not.toBe(`${where}: `);
        expect(`${where}: ${req.statement.trim()}`).not.toBe(`${where}: `);
        expect(req.priority).toBeTruthy();
        expect(req.gxpRelevance).toBeTruthy();
        expect(req.classification.componentType).toBeTruthy();
        expect(req.classification.requirementNature).toBeTruthy();
        expect(req.classification.criticality).toBeTruthy();
      }
    }
  });

  test('acceptance criteria round-trip through the serialized form', () => {
    for (const set of SEED_REQUIREMENT_SETS) {
      for (const req of set.requirements) {
        const serialized = acceptanceIntentFromSeed(req.acceptanceCriteria);
        const parsed =
          serialized === undefined ? undefined : JSON.parse(serialized);
        // Criteria round-trip; a requirement without any serializes to
        // undefined so the column stays null.
        const expected = req.acceptanceCriteria?.length
          ? req.acceptanceCriteria
          : undefined;

        expect(parsed).toEqual(expected);
      }
    }
  });

  test('every requirement yields a distinct, hashed genesis version', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const versionIds = new Set<string>();

    for (const set of SEED_REQUIREMENT_SETS) {
      const setId = `seed:${set.requirementSetId.toLowerCase()}`;

      for (const req of set.requirements) {
        const requirement = {
          id: `${setId}-${req.requirementId.toLowerCase()}`,
          requirementSetId: setId,
          requirementId: req.requirementId,
          title: req.title,
          statement: req.statement,
          rationale: req.rationale,
          category: req.category,
          priority: req.priority,
          acceptanceIntent: acceptanceIntentFromSeed(req.acceptanceCriteria),
          classification: req.classification,
          gxpRelevance: req.gxpRelevance,
          status: URSStatus.DRAFT,
          createdAt: now,
          createdBy: 'system',
        } as URSRequirement;

        const version = genesisVersionOf(requirement, now);

        expect(version.requirementId).toBe(req.requirementId);
        expect(version.versionLabel).toBe('0.1');
        expect(version.status).toBe(URSStatus.DRAFT);
        expect(version.contentHash).toBeTruthy();

        versionIds.add(version.id);
      }
    }

    const total = SEED_REQUIREMENT_SETS.reduce(
      (sum, set) => sum + set.requirements.length,
      0,
    );
    expect(versionIds.size).toBe(total);
  });
});
