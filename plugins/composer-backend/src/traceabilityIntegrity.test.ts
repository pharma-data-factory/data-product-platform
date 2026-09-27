/**
 * What a traceability link is allowed to claim.
 *
 * Audit completion item 4, "validated references on `traceability_links`".
 * The table has carried `source_type` and `target_type` since Phase 1 as
 * free strings that nothing checked, and they drifted — `URS`,
 * `URS_REQUIREMENT` and `URS_REQUIREMENT_VERSION` all meant a requirement.
 * A discriminator that takes any value discriminates nothing, and an
 * endpoint whose kind is unknown cannot be resolved to check it exists.
 *
 * The database carries part of this (a foreign key to `test_executions`, and
 * CHECK constraints on PostgreSQL — see `db/migrations.postgres.test.ts`).
 * What is asserted here is the half that runs on every write and on both
 * dialects: the service.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
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
const BASELINE_ID = 'urs-baseline-trace-1';

function resolver(): UrsBaselineResolver {
  const reference: UrsBaselineReference = {
    id: BASELINE_ID,
    status: 'APPROVED',
    baselineVersion: '1.0',
  };
  const context: UrsBaselineContext = {
    baselineId: BASELINE_ID,
    baselineVersion: '1.0',
    requirementSetId: 'urs-set-trace-1',
    solutionName: 'Traceability Probe',
    solutionType: 'data-product',
    businessNeed: 'Prove that a link points at something real',
    businessCapabilities: ['capability:default/manufacturing'],
    requirements: [
      {
        id: 'urs-version-trace-1',
        requirementRef: 'URS-TRACE-001',
        title: 'A link names something that exists',
        statement: 'The platform shall refuse a link to a phantom.',
        priority: 'MUST',
        gxpRelevance: 'DIRECT',
        contentHash: 'sha256:urs-version-trace-1',
      },
    ],
  };
  return {
    resolveApprovedBaseline: jest.fn(async () => reference),
    resolveBaselineContext: jest.fn(async () => context),
  };
}

describe('traceability link integrity', () => {
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

  /** A product version with one component, optionally bound to the baseline. */
  async function setup(bind: boolean) {
    seq += 1;
    const product = await service.createProduct(
      { name: `Trace Probe ${seq}`, productType: 'DATA_PRODUCT' },
      ACTOR,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      ACTOR,
    );
    const component = await service.addProductComponent(
      version.id,
      { componentType: 'API', name: `probe-api-${seq}` },
      ACTOR,
    );
    if (bind) {
      await service.bindUrsBaseline(version.id, BASELINE_ID, ACTOR);
    }
    return { version, component };
  }

  describe('vocabulary', () => {
    it('refuses a source type outside the vocabulary', async () => {
      const { component } = await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'URS',
            sourceId: 'URS-TRACE-001',
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          ACTOR,
        ),
      ).rejects.toThrow(/Unsupported sourceType: URS/);
    });

    it('refuses a target type outside the vocabulary', async () => {
      const { component } = await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT',
            sourceId: 'URS-TRACE-001',
            relationshipType: 'IMPLEMENTS',
            targetType: 'COMPONENT',
            targetId: component.id,
          },
          ACTOR,
        ),
      ).rejects.toThrow(/Unsupported targetType: COMPONENT/);
    });

    // relationshipType has had a constant since Phase 1 and the validator
    // never consulted it, so any string went in.
    it('refuses a relationship type outside the vocabulary', async () => {
      const { component } = await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT',
            sourceId: 'URS-TRACE-001',
            relationshipType: 'SUPERSEDES',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          ACTOR,
        ),
      ).rejects.toThrow(/Unsupported relationshipType: SUPERSEDES/);
    });
  });

  describe('existence', () => {
    it('refuses a link to a component that does not exist', async () => {
      await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT',
            sourceId: 'URS-TRACE-001',
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: 'component-that-is-not-there',
          },
          ACTOR,
        ),
      ).rejects.toThrow(/no such product component/);
    });

    it('refuses a link to a test execution that does not exist', async () => {
      await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT_VERSION',
            sourceId: 'urs-version-trace-1',
            relationshipType: 'VERIFIED_BY',
            targetType: 'TEST_EXECUTION',
            targetId: 'exec-that-is-not-there',
          },
          ACTOR,
        ),
      ).rejects.toThrow(/no such test execution/);
    });

    it('accepts a link to a requirement the bound baseline contains', async () => {
      const { component } = await setup(true);
      const link = await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'URS-TRACE-001',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );
      expect(link.id).toBeTruthy();
    });

    // Coverage joins on either key, so refusing one of them here would
    // refuse links the read path would have counted.
    it('accepts the version UUID as well as the stable ref', async () => {
      const { component } = await setup(true);
      const link = await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT_VERSION',
          sourceId: 'urs-version-trace-1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );
      expect(link.id).toBeTruthy();
    });

    it('refuses a requirement the bound baseline does not contain', async () => {
      const { component } = await setup(true);
      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT',
            sourceId: 'URS-NOT-IN-BASELINE',
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          ACTOR,
        ),
      ).rejects.toThrow(/contains no such requirement/);
    });

    // The scoping rule, and the reason it is scoped. An unbound version has
    // no snapshot to check against, and the Architecture tab lets an author
    // record a mapping before the binding exists. Refusing here would break
    // a workflow the platform offers, to enforce a rule whose answer is not
    // yet knowable.
    it('allows a provisional link on a version that has bound nothing', async () => {
      const { component } = await setup(false);
      const link = await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'URS-NOT-YET-BOUND',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      );
      expect(link.id).toBeTruthy();
    });
  });

  // Was a plain Error and reached the caller as 500 "Internal server error",
  // which reads as "the platform is broken" for what is a typo. Same family
  // as the three refusals B-1 retyped.
  it('answers a vocabulary mistake as InputError, not 500', async () => {
    const { component } = await setup(true);
    await expect(
      service.createTraceabilityLink(
        {
          sourceType: 'NONSENSE',
          sourceId: 'x',
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: component.id,
        },
        ACTOR,
      ),
    ).rejects.toMatchObject({ name: 'InputError' });
  });
});
