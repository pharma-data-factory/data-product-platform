/**
 * Stage 3 — the left arm of the V-model.
 *
 * Audit completion item 11, "a minimal Stage 3 — FS derived from UAS, linked
 * to components". Traceability ran UAS → Baseline → ProductRequirement →
 * Component with nothing between requirement and design (G-7 in
 * `docs/compliance/traceability-and-gmp.md`). `TARGET_OPERATING_MODEL.md`
 * §Stage 3 states the acceptance criterion this suite asserts: "an approved UAS
 * produces a Functional Specification whose items each trace to at least one
 * requirement; the FS informs the component architecture".
 *
 * The chain is asserted end to end — a requirement, an item derived from it, a
 * component the requirement implements, and the trace that resolves all three —
 * because each of those joints already existed in isolation and the point of
 * the item is that they now form one chain.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService, functionalSpecCode } from './service';
import type {
  UrsBaselineContext,
  UrsBaselineReference,
  UrsBaselineResolver,
} from './urs-baseline-resolver';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const ACTOR = 'user:default/architect';
const BASELINE_ID = 'urs-baseline-fs-1';

function resolver(): UrsBaselineResolver {
  const reference: UrsBaselineReference = {
    id: BASELINE_ID,
    status: 'APPROVED',
    baselineVersion: '1.0',
  };
  const context: UrsBaselineContext = {
    baselineId: BASELINE_ID,
    baselineVersion: '1.0',
    requirementSetId: 'urs-set-fs-1',
    solutionName: 'Stage 3 Probe',
    solutionType: 'data-product',
    businessNeed: 'Prove the left arm of the V-model exists',
    businessCapabilities: ['capability:default/manufacturing'],
    requirements: [
      {
        id: 'urs-version-fs-1',
        requirementRef: 'URS-FS-001',
        title: 'Weighing events are captured',
        statement: 'The system shall capture every weighing event.',
        priority: 'MUST',
        gxpRelevance: 'DIRECT',
        contentHash: 'sha256:urs-version-fs-1',
      },
      {
        id: 'urs-version-fs-2',
        requirementRef: 'URS-FS-002',
        title: 'Events are retained for seven years',
        statement: 'The system shall retain events for seven years.',
        priority: 'MUST',
        gxpRelevance: 'INDIRECT',
        contentHash: 'sha256:urs-version-fs-2',
      },
    ],
  };
  return {
    resolveApprovedBaseline: jest.fn(async () => reference),
    resolveBaselineContext: jest.fn(async () => context),
  };
}

describe('Stage 3: functional specifications', () => {
  let db: Knex;
  let service: ComposerService;
  let seq = 0;

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolver(),
    });
  });

  afterAll(async () => {
    await db?.destroy();
  });

  async function setup(bind: boolean) {
    seq += 1;
    const product = await service.createProduct(
      { name: `FS Probe ${seq}`, productType: 'DATA_PRODUCT' },
      ACTOR,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      ACTOR,
    );
    const component = await service.addProductComponent(
      version.id,
      { componentType: 'API', name: `fs-probe-api-${seq}` },
      ACTOR,
    );
    if (bind) {
      await service.bindUrsBaseline(version.id, BASELINE_ID, ACTOR);
    }
    return { version, component };
  }

  describe('derivation', () => {
    it('derives one item per bound requirement, carrying its code and title', async () => {
      const { version } = await setup(true);

      const created = await service.deriveFunctionalSpecifications(
        version.id,
        ACTOR,
      );

      expect(created).toHaveLength(2);
      expect(created.map(spec => spec.fsCode).sort()).toEqual([
        'FS-FS-001',
        'FS-FS-002',
      ]);
      // Each item traces to exactly one requirement — the acceptance criterion
      // TARGET_OPERATING_MODEL states for Stage 3.
      expect(created.map(spec => spec.ursRequirementVersionId).sort()).toEqual([
        'urs-version-fs-1',
        'urs-version-fs-2',
      ]);
      const first = created.find(spec => spec.fsCode === 'FS-FS-001');
      expect(first?.title).toBe('Weighing events are captured');
      expect(first?.description).toContain('URS-FS-001');
      expect(first?.description).toContain(
        'The system shall capture every weighing event.',
      );
      expect(first?.createdBy).toBe(ACTOR);
    });

    it('is idempotent, and does not overwrite an item that already exists', async () => {
      const { version } = await setup(true);
      await service.deriveFunctionalSpecifications(version.id, ACTOR);

      const second = await service.deriveFunctionalSpecifications(
        version.id,
        ACTOR,
      );

      // Nothing written the second time. An item may have been edited by a
      // human since; silently regenerating it is the opposite of what a
      // reviewed specification is for.
      expect(second).toHaveLength(0);
      expect(
        await service.listFunctionalSpecifications(version.id),
      ).toHaveLength(2);
    });

    it('refuses a version that has bound no baseline', async () => {
      const { version } = await setup(false);

      // Not an empty FS: "specified, nothing required" and "not specified yet"
      // are different claims and only one of them is true here.
      await expect(
        service.deriveFunctionalSpecifications(version.id, ACTOR),
      ).rejects.toThrow(/has no URS baseline bound/);
    });

    it('refuses a version that does not exist', async () => {
      await expect(
        service.deriveFunctionalSpecifications('no-such-version', ACTOR),
      ).rejects.toThrow(/not found/);
    });
  });

  describe('the URS <-> FS <-> Component chain', () => {
    it('resolves a component through the requirement its item specifies', async () => {
      const { version, component } = await setup(true);
      await service.deriveFunctionalSpecifications(version.id, ACTOR);
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT_VERSION',
          sourceId: 'urs-version-fs-1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );

      const trace = await service.getFunctionalSpecTrace(version.id);

      const mapped = trace.find(row => row.fsCode === 'FS-FS-001');
      expect(mapped).toMatchObject({
        requirementRef: 'URS-FS-001',
        ursRequirementVersionId: 'urs-version-fs-1',
        componentIds: [component.id],
      });
      // The second requirement has no component, and the trace says so rather
      // than omitting the row — an unimplemented specification is the finding.
      expect(
        trace.find(row => row.fsCode === 'FS-FS-002')?.componentIds,
      ).toEqual([]);
    });

    it('honours a link written directly from the specification', async () => {
      const { version, component } = await setup(true);
      const [spec] = await service.deriveFunctionalSpecifications(
        version.id,
        ACTOR,
      );

      await service.createTraceabilityLink(
        {
          sourceType: 'FUNCTIONAL_SPEC',
          sourceId: spec.id,
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );

      const trace = await service.getFunctionalSpecTrace(version.id);
      expect(
        trace.find(row => row.functionalSpecId === spec.id)?.componentIds,
      ).toEqual([component.id]);
    });

    it('does not double-count a component reachable both ways', async () => {
      const { version, component } = await setup(true);
      const specs = await service.deriveFunctionalSpecifications(
        version.id,
        ACTOR,
      );
      const spec = specs.find(s => s.fsCode === 'FS-FS-001')!;

      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT_VERSION',
          sourceId: 'urs-version-fs-1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'FUNCTIONAL_SPEC',
          sourceId: spec.id,
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );

      const trace = await service.getFunctionalSpecTrace(version.id);
      expect(
        trace.find(row => row.functionalSpecId === spec.id)?.componentIds,
      ).toEqual([component.id]);
    });

    it('refuses a link from a specification that does not exist', async () => {
      const { component } = await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'FUNCTIONAL_SPEC',
            sourceId: 'no-such-spec',
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          ACTOR,
        ),
      ).rejects.toThrow(/no such functional specification/);
    });

    it('refuses a specification mapped to another version\'s component', async () => {
      const here = await setup(true);
      const elsewhere = await setup(true);
      const [spec] = await service.deriveFunctionalSpecifications(
        here.version.id,
        ACTOR,
      );

      // Otherwise the trace resolves to a component a reviewer of this version
      // never saw.
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'FUNCTIONAL_SPEC',
            sourceId: spec.id,
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: elsewhere.component.id,
          },
          ACTOR,
        ),
      ).rejects.toThrow(/belong to the same product version/);
    });
  });

  describe('coverage is left alone', () => {
    it('keeps the requirement mapped after Stage 3 derivation', async () => {
      const { version, component } = await setup(true);
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT_VERSION',
          sourceId: 'urs-version-fs-1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );

      const before = await service.getRequirementCoverage(version.id);
      await service.deriveFunctionalSpecifications(version.id, ACTOR);
      const after = await service.getRequirementCoverage(version.id);

      // Stage 3 is additive in this slice. Making FS a mandatory hop would
      // flip every row to UNMAPPED, because getRequirementCoverage joins the
      // requirement straight to the component — and the release gate reads it.
      expect(after.mapped).toBe(before.mapped);
      expect(after.unmapped).toBe(before.unmapped);
      expect(after.mapped).toBe(1);
    });
  });

  describe('fs codes', () => {
    it('pairs the code with the requirement it specifies', () => {
      expect(functionalSpecCode('URS-WD-001')).toBe('FS-WD-001');
      expect(functionalSpecCode('URS-OEE-014')).toBe('FS-OEE-014');
    });

    it('prefixes rather than rewrites a ref that is not URS-shaped', () => {
      // The URS side generates set keys from a timestamp when no stable key is
      // configured. Mangling one produces a code that traces to nothing.
      expect(functionalSpecCode('K7X2P-001')).toBe('FS-K7X2P-001');
    });
  });
});
