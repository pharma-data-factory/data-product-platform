/**
 * Slice 1a / 1b: Product Requirements — binding, snapshot, coverage.
 *
 * The joint between an approved URS baseline and a Product Version. Before
 * this slice the product held no requirements at all, so none of these
 * questions had an answer.
 *
 * Runs against in-memory SQLite, the same as the other composer suites. Where
 * a claim depends on the database rather than the service (the identity
 * constraint), the test drives the repository directly so the service's own
 * check cannot be what makes it pass.
 */

import knex, { Knex } from 'knex';
import { expectRefusedByDatabase } from './__testUtils__/databaseRefusal';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import type {
  ValidationCoverageSummary,
  ValidationDecisionResolver,
} from './service';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

function createDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

const BASELINE_ID = 'baseline-oee-2-0';

/** A resolver answering with a complete, approved two-requirement baseline. */
function resolverWith(
  requirements: Array<Record<string, unknown>>,
): UrsBaselineResolver {
  return {
    resolveApprovedBaseline: jest.fn(async (id: string) => ({
      id,
      status: 'APPROVED',
      baselineVersion: '2.0',
    })),
    resolveBaselineContext: jest.fn(async (id: string) => ({
      baselineId: id,
      baselineVersion: '2.0',
      requirementSetId: 'set-oee',
      solutionName: 'Basel Line OEE',
      businessCapabilities: [],
      requirements: requirements as any,
    })),
  };
}

const TWO_REQUIREMENTS = [
  {
    id: 'rv-014',
    requirementRef: 'URS-OEE-014',
    title: 'System shall calculate OEE Availability',
    statement: 'Availability excludes planned downtime.',
    category: 'Functional',
    priority: 'MUST',
    gxpRelevance: 'DIRECT',
    versionLabel: '2.0',
    contentHash: 'sha256:aaa',
  },
  {
    id: 'rv-015',
    requirementRef: 'URS-OEE-015',
    title: 'System shall calculate OEE Performance',
    statement: 'Performance uses the ideal cycle time.',
    category: 'Functional',
    priority: 'SHOULD',
    gxpRelevance: 'INDIRECT',
    versionLabel: '2.0',
    contentHash: 'sha256:bbb',
  },
];

describe('Slice 1a: binding a URS baseline to a Product Version', () => {
  let db: Knex;
  let repository: ComposerRepository;

  const actor = 'user:default/test-user';
  const approver = 'user:default/approver-user';

  beforeEach(async () => {
    db = createDb();
    await db.raw('select 1');
    repository = await ComposerRepository.create({ getClient: () => db });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  function serviceWith(
    ursBaselineResolver?: UrsBaselineResolver,
    validationDecisionResolver?: ValidationDecisionResolver,
  ): ComposerService {
    return new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver,
      validationDecisionResolver,
    });
  }

  async function draftVersion(service: ComposerService) {
    const product = await service.createProduct(
      {
        name: `Product ${Math.random()}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'DIRECT',
      },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    return { product, version };
  }

  it('snapshots every requirement of the baseline onto the version', async () => {
    const service = serviceWith(resolverWith(TWO_REQUIREMENTS));
    const { version } = await draftVersion(service);

    const result = await service.bindUrsBaseline(
      version.id,
      BASELINE_ID,
      actor,
    );

    expect(result.version.ursBaselineId).toBe(BASELINE_ID);
    expect(result.requirements).toHaveLength(2);

    const stored = await service.listProductRequirements(version.id);
    expect(stored.map(r => r.requirementRef)).toEqual([
      'URS-OEE-014',
      'URS-OEE-015',
    ]);
    // The content hash is the point of the snapshot: it is what makes "which
    // wording was tested?" answerable later.
    expect(stored[0].contentHash).toBe('sha256:aaa');
    expect(stored[0].ursRequirementVersionId).toBe('rv-014');
    expect(stored[0].origin).toBe('PRODUCT');
    expect(stored[0].position).toBe(0);
    // Carried through so validation can be demanded proportionally (GAMP 5 is
    // risk-based), not uniformly.
    expect(stored.map(r => r.gxpRelevance)).toEqual(['DIRECT', 'INDIRECT']);
  });

  it('records the binding on the version row, not only in memory', async () => {
    const service = serviceWith(resolverWith(TWO_REQUIREMENTS));
    const { version } = await draftVersion(service);
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);

    const reloaded = await service.getProductVersion(version.id);
    expect(reloaded?.ursBaselineId).toBe(BASELINE_ID);
  });

  it('writes an audit event naming the baseline and the requirement count', async () => {
    const service = serviceWith(resolverWith(TWO_REQUIREMENTS));
    const { version } = await draftVersion(service);
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);

    const trail = await service.getEntityAuditTrail(
      'PRODUCT_VERSION',
      version.id,
    );
    const bound = trail.find(e => e.eventType === 'URS_BASELINE_BOUND');
    expect(bound).toBeDefined();
    expect(JSON.parse(bound!.newValue!)).toMatchObject({
      ursBaselineId: BASELINE_ID,
      baselineVersion: '2.0',
      requirementCount: 2,
    });
  });

  it('refuses a version that is no longer DRAFT', async () => {
    const service = serviceWith(resolverWith(TWO_REQUIREMENTS));
    const { version } = await draftVersion(service);
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'APPROVED' },
      approver,
    );

    await expect(
      service.bindUrsBaseline(version.id, BASELINE_ID, actor),
    ).rejects.toThrow(/only be bound while the version is DRAFT/);
  });

  it('refuses to rebind a version that already carries a baseline', async () => {
    const service = serviceWith(resolverWith(TWO_REQUIREMENTS));
    const { version } = await draftVersion(service);
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);

    await expect(
      service.bindUrsBaseline(version.id, 'another-baseline', actor),
    ).rejects.toThrow(/already bound/);
  });

  it('refuses a baseline the resolver reports as unapproved', async () => {
    const resolver: UrsBaselineResolver = {
      resolveApprovedBaseline: jest.fn(),
      resolveBaselineContext: jest.fn(async () => {
        throw new Error('URS baseline b1 is DRAFT; expected APPROVED');
      }),
    };
    const service = serviceWith(resolver);
    const { version } = await draftVersion(service);

    await expect(
      service.bindUrsBaseline(version.id, 'b1', actor),
    ).rejects.toThrow(/expected APPROVED/);
    expect(await service.listProductRequirements(version.id)).toHaveLength(0);
  });

  it('refuses a requirement with no stable URS id, naming every bad row', async () => {
    const service = serviceWith(
      resolverWith([
        TWO_REQUIREMENTS[0],
        { id: 'rv-016', title: 'Nameless', statement: 'x' },
        { id: 'rv-017', requirementRef: '  ', title: 'Blank ref', statement: 'y' },
      ]),
    );
    const { version } = await draftVersion(service);

    await expect(
      service.bindUrsBaseline(version.id, BASELINE_ID, actor),
    ).rejects.toThrow(/2 of 3 requirements are unusable/);
  });

  it('writes nothing at all when the binding is refused', async () => {
    const service = serviceWith(
      resolverWith([{ id: 'rv-016', title: 'Nameless', statement: 'x' }]),
    );
    const { version } = await draftVersion(service);

    await expect(
      service.bindUrsBaseline(version.id, BASELINE_ID, actor),
    ).rejects.toThrow();

    expect(await service.listProductRequirements(version.id)).toHaveLength(0);
    const reloaded = await service.getProductVersion(version.id);
    expect(reloaded?.ursBaselineId).toBeUndefined();
  });

  it('refuses when no resolver is configured rather than recording an unverified binding', async () => {
    const service = serviceWith(undefined);
    const { version } = await draftVersion(service);

    await expect(
      service.bindUrsBaseline(version.id, BASELINE_ID, actor),
    ).rejects.toThrow(/cannot be verified as approved/);
  });

  it('enforces one row per pinned requirement version in the database', async () => {
    const service = serviceWith(resolverWith(TWO_REQUIREMENTS));
    const { version } = await draftVersion(service);
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);

    // Straight at the repository: the service refuses a rebind, so the unique
    // index is the only thing that can stop a concurrent second write. That is
    // the race the service check cannot close (NXD-009).
    //
    // Asserted through `expectRefusedByDatabase`, which matches the message
    // rather than the thrown value's Error-ness. This test shipped with a bare
    // `.rejects.toThrow()` and failed roughly two full runs in five for the
    // reason that helper documents — see NXD-016.
    await expectRefusedByDatabase(
      repository.bindUrsBaseline(version.id, BASELINE_ID, [
        {
          id: 'duplicate-row',
          productVersionId: version.id,
          ursBaselineId: BASELINE_ID,
          ursRequirementVersionId: 'rv-014',
          requirementRef: 'URS-OEE-014',
          title: 'System shall calculate OEE Availability',
          statement: '',
          origin: 'PRODUCT',
          position: 0,
          createdBy: actor,
          createdAt: new Date(),
        },
      ]),
      /UNIQUE constraint failed: product_requirements\.product_version_id, product_requirements\.urs_requirement_version_id/,
    );

    expect(await service.listProductRequirements(version.id)).toHaveLength(2);
  });
});

describe('Slice 1a: requirement coverage', () => {
  let db: Knex;
  let repository: ComposerRepository;
  const actor = 'user:default/test-user';

  beforeEach(async () => {
    db = createDb();
    await db.raw('select 1');
    repository = await ComposerRepository.create({ getClient: () => db });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function boundSetup(
    validationDecisionResolver?: ValidationDecisionResolver,
  ) {
    const service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolverWith(TWO_REQUIREMENTS),
      validationDecisionResolver,
    });
    const product = await service.createProduct(
      {
        name: `Product ${Math.random()}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
      },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    const component = await service.addProductComponent(
      version.id,
      { componentType: 'PROCESSING', name: 'availability-service' },
      actor,
    );
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);
    return { service, product, version, component };
  }

  it('reports every requirement as unmapped when no links exist', async () => {
    const { service, version } = await boundSetup();
    const coverage = await service.getRequirementCoverage(version.id);

    expect(coverage.total).toBe(2);
    expect(coverage.mapped).toBe(0);
    expect(coverage.unmapped).toBe(2);
    expect(coverage.byRequirement.every(r => r.mapping === 'UNMAPPED')).toBe(
      true,
    );
  });

  it('counts a requirement as mapped once an IMPLEMENTS link reaches a component', async () => {
    const { service, version, component } = await boundSetup();
    await service.createTraceabilityLink(
      {
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: 'URS-OEE-014',
        relationshipType: 'IMPLEMENTS',
        targetType: 'PRODUCT_COMPONENT',
        targetId: component.id,
      },
      actor,
    );

    const coverage = await service.getRequirementCoverage(version.id);
    expect(coverage.mapped).toBe(1);
    expect(coverage.unmapped).toBe(1);
    const row = coverage.byRequirement.find(
      r => r.requirementRef === 'URS-OEE-014',
    );
    expect(row?.mapping).toBe('MAPPED');
    expect(row?.componentIds).toEqual([component.id]);
  });

  it('also matches a link written against the requirement version UUID', async () => {
    // Links created before this slice used whichever id the author had to
    // hand. Both resolve, so existing data keeps counting.
    const { service, version, component } = await boundSetup();
    await service.createTraceabilityLink(
      {
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: 'rv-015',
        relationshipType: 'IMPLEMENTS',
        targetType: 'PRODUCT_COMPONENT',
        targetId: component.id,
      },
      actor,
    );

    const coverage = await service.getRequirementCoverage(version.id);
    expect(
      coverage.byRequirement.find(r => r.requirementRef === 'URS-OEE-015')
        ?.mapping,
    ).toBe('MAPPED');
  });

  it('ignores a link whose source matches no requirement in the baseline', async () => {
    const { service, version, component } = await boundSetup();
    await service.createTraceabilityLink(
      {
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: 'URS-NOT-IN-BASELINE',
        relationshipType: 'IMPLEMENTS',
        targetType: 'PRODUCT_COMPONENT',
        targetId: component.id,
      },
      actor,
    );

    const coverage = await service.getRequirementCoverage(version.id);
    expect(coverage.mapped).toBe(0);
    expect(coverage.unmapped).toBe(2);
  });

  it('reports validation as unknown, not zero, when no context resolves', async () => {
    const { service, version } = await boundSetup({
      hasApprovedDecision: jest.fn(async () => false),
      getValidationCoverage: jest.fn(async () => undefined),
    });

    const coverage = await service.getRequirementCoverage(version.id);
    expect(coverage.validationContextId).toBeUndefined();
    expect(
      coverage.byRequirement.every(r => r.validated === undefined),
    ).toBe(true);
  });

  it('reports validation as unknown when the validation-expert throws', async () => {
    const { service, version } = await boundSetup({
      hasApprovedDecision: jest.fn(async () => false),
      getValidationCoverage: jest.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    });

    const coverage = await service.getRequirementCoverage(version.id);
    expect(
      coverage.byRequirement.every(r => r.validated === undefined),
    ).toBe(true);
  });
});

describe('Slice 1b: validation coverage joins on the stable requirement id', () => {
  let db: Knex;
  let repository: ComposerRepository;
  const actor = 'user:default/test-user';

  beforeEach(async () => {
    db = createDb();
    await db.raw('select 1');
    repository = await ComposerRepository.create({ getClient: () => db });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  function summary(decisionApproved: boolean): ValidationCoverageSummary {
    return {
      contextId: 'ctx-1',
      decisionApproved,
      byRequirement: new Map([
        [
          'URS-OEE-014',
          { testIds: ['OQ-12'], runIds: ['run-3'], findingIds: [] },
        ],
      ]),
    };
  }

  async function setup(decisionApproved: boolean) {
    const service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolverWith(TWO_REQUIREMENTS),
      validationDecisionResolver: {
        hasApprovedDecision: jest.fn(async () => decisionApproved),
        getValidationCoverage: jest.fn(async () => summary(decisionApproved)),
      },
    });
    const product = await service.createProduct(
      {
        name: `Product ${Math.random()}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
      },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);
    return { service, version };
  }

  it('marks a requirement verified when a protocol test has executed against it', async () => {
    const { service, version } = await setup(false);
    const coverage = await service.getRequirementCoverage(version.id);

    const row = coverage.byRequirement.find(
      r => r.requirementRef === 'URS-OEE-014',
    );
    expect(row?.verified).toBe(true);
    expect(row?.testIds).toEqual(['OQ-12']);
    expect(row?.runIds).toEqual(['run-3']);
    expect(coverage.verified).toBe(1);
  });

  it('withholds "validated" until the context carries an APPROVED decision', async () => {
    // Verification and validation are separate axes. A test that ran is not a
    // validation verdict — that is the whole distinction the strategy draws.
    const { service, version } = await setup(false);
    const coverage = await service.getRequirementCoverage(version.id);

    expect(coverage.validated).toBe(0);
    expect(
      coverage.byRequirement.find(r => r.requirementRef === 'URS-OEE-014')
        ?.validated,
    ).toBe(false);
  });

  it('marks it validated once the decision is APPROVED and a test has run', async () => {
    const { service, version } = await setup(true);
    const coverage = await service.getRequirementCoverage(version.id);

    expect(coverage.validationContextId).toBe('ctx-1');
    expect(coverage.validated).toBe(1);
    // The second requirement has no executed test, so an approved decision
    // alone does not make it validated.
    expect(
      coverage.byRequirement.find(r => r.requirementRef === 'URS-OEE-015')
        ?.validated,
    ).toBe(false);
  });
});

describe('Slice 1a: the release gate becomes reachable from the normal path', () => {
  let db: Knex;
  const actor = 'user:default/test-user';
  const approver = 'user:default/approver-user';

  beforeEach(async () => {
    db = createDb();
    await db.raw('select 1');
  });

  afterEach(async () => {
    await db?.destroy();
  });

  it('inherits the version binding into a ProductBaseline created with an empty body', async () => {
    // The whole point: `NO_URS_BASELINE` and the `urs-baseline-bound`
    // obligation were written and tested but could only ever fire on the AI
    // path, because nothing else set `ursBaselineIds`.
    const repository = await ComposerRepository.create({ getClient: () => db });
    const service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolverWith(TWO_REQUIREMENTS),
    });

    const product = await service.createProduct(
      {
        name: `Product ${Math.random()}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
      },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    await service.bindUrsBaseline(version.id, BASELINE_ID, actor);

    const baseline = await service.createProductBaseline(version.id, {}, actor);
    expect(baseline.ursBaselineIds).toEqual([BASELINE_ID]);

    await service.approveProductBaseline(baseline.id, approver);
    const gate = await service.checkReleaseGate(version.id);
    expect(gate.blockers.map(b => b.code)).not.toContain('NO_URS_BASELINE');
  });

  it('still raises NO_URS_BASELINE for an approved baseline on an unbound version', async () => {
    const repository = await ComposerRepository.create({ getClient: () => db });
    const service = new ComposerService({ logger: mockLogger, repository });

    const product = await service.createProduct(
      {
        name: `Product ${Math.random()}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
      },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    const baseline = await service.createProductBaseline(version.id, {}, actor);
    await service.approveProductBaseline(baseline.id, approver);

    const gate = await service.checkReleaseGate(version.id);
    expect(gate.blockers.map(b => b.code)).toContain('NO_URS_BASELINE');
  });
});
