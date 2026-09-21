/**
 * Phase 1 versioning foundation tests.
 *
 * Covers status transitions, release gate checks, product baselines, and
 * revision-specific traceability links against an in-memory SQLite database.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import type { ValidationDecisionResolver } from './service';

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

describe('Phase 1: Versioning Foundation', () => {
  let db: Knex;
  let service: ComposerService;

  beforeAll(async () => {
    db = createDb();
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });
  });

  afterAll(async () => {
    await db?.destroy();
  });

  const actor = 'user:default/test-user';

  async function createFullSetup() {
    const product = await service.createProduct(
      {
        name: `Test Product ${Date.now()}`,
        productType: 'DATA_PRODUCT',
        // The platform policy requires these before release; a fixture without
        // them would describe a product that could never ship.
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'NONE',
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
      { componentType: 'SOURCE', name: 'Test Source' },
      actor,
    );
    return { product, version, component };
  }

  describe('Status Transitions', () => {
    it('allows valid transition DRAFT → APPROVED', async () => {
      const { version } = await createFullSetup();
      const result = await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe(actor);
      expect(result.approvedAt).toBeDefined();
    });

    it('allows valid transition APPROVED → RELEASE_CANDIDATE', async () => {
      const { version } = await createFullSetup();
      await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      const result = await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      expect(result.status).toBe('RELEASE_CANDIDATE');
    });

    it('rejects invalid transition DRAFT → RELEASED', async () => {
      const { version } = await createFullSetup();
      await expect(
        service.transitionProductVersionStatus(
          version.id,
          { targetStatus: 'RELEASED' },
          actor,
        ),
      ).rejects.toThrow('Invalid transition');
    });

    it('rejects invalid transition APPROVED → SUPERSEDED', async () => {
      const { version } = await createFullSetup();
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await expect(
        service.transitionProductVersionStatus(
          version.id,
          { targetStatus: 'SUPERSEDED' },
          actor,
        ),
      ).rejects.toThrow('Invalid transition');
    });

    it('records audit event with oldValue/newValue on transition', async () => {
      const { version } = await createFullSetup();
      await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      const trail = await service.getEntityAuditTrail('PRODUCT_VERSION', version.id);
      const transitionEvent = trail.find(e => e.eventType === 'STATUS_TRANSITION');
      expect(transitionEvent).toBeDefined();
      expect(transitionEvent!.oldValue).toBe('DRAFT');
      expect(transitionEvent!.newValue).toBe('APPROVED');
    });
  });

  describe('Release Gate', () => {
    it('fails with INVALID_STATUS when not RELEASE_CANDIDATE', async () => {
      const { version } = await createFullSetup();
      const result = await service.checkReleaseGate(version.id);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'INVALID_STATUS')).toBe(true);
    });

    it('fails with NO_COMPONENTS when version has no components', async () => {
      const product = await service.createProduct(
        { name: `Empty Product ${Date.now()}`, productType: 'SERVICE' },
        actor,
      );
      const version = await service.createProductVersion(product.id, {}, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_COMPONENTS')).toBe(true);
    });

    it('fails with INCOMPLETE_TRACEABILITY when component has no link', async () => {
      const { version } = await createFullSetup();
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'INCOMPLETE_TRACEABILITY')).toBe(true);
    });

    it('fails with NO_APPROVED_BASELINE when no approved baseline exists', async () => {
      const { version, component } = await createFullSetup();
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-001',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_APPROVED_BASELINE')).toBe(true);
    });

    it('passes when all conditions are met', async () => {
      const { version, component } = await createFullSetup();
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-001',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      // A URS baseline is part of "all conditions" now: a release has to say
      // which requirements it implements.
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineIds: ['urs-baseline-1'] },
        actor,
      );
      await service.approveProductBaseline(baseline.id, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id);
      expect(result.passed).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('blocks a product that meets no platform policy obligation', async () => {
      // The policy says under which conditions a product may be released at
      // all, independent of its requirements. Every unmet obligation is
      // reported at once so they can be fixed in one pass.
      const product = await service.createProduct(
        { name: `Bare Product ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0' },
        actor,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Source' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-001',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineIds: ['urs-baseline-1'] },
        actor,
      );
      await service.approveProductBaseline(baseline.id, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);

      const result = await service.checkReleaseGate(version.id);

      expect(result.passed).toBe(false);
      expect(
        result.blockers.filter(b => b.code === 'POLICY_OBLIGATION_UNMET'),
      ).toHaveLength(3);
    });

    it('blocks a product that references no URS baseline', async () => {
      // The agreed rule: free to create, bound to release. Without this the
      // platform can ship a product nobody can trace to a requirement.
      const { version, component } = await createFullSetup();
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-001',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(version.id, {}, actor);
      await service.approveProductBaseline(baseline.id, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);

      const result = await service.checkReleaseGate(version.id);

      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_URS_BASELINE')).toBe(true);
    });
  });

  describe('Product Baselines', () => {
    it('creates a baseline with snapshot of components and contracts', async () => {
      const { version, component } = await createFullSetup();
      await service.addDataContract(
        component.id,
        { name: 'output-contract', schemaType: 'JSON_SCHEMA', version: '1.0' },
        actor,
      );
      const baseline = await service.createProductBaseline(version.id, {}, actor);
      expect(baseline.status).toBe('DRAFT');
      expect(baseline.snapshot).toBeDefined();
      expect((baseline.snapshot as any).components).toHaveLength(1);
      expect((baseline.snapshot as any).contracts).toHaveLength(1);
    });

    it('supersedes previous APPROVED baseline when creating new one', async () => {
      const { version } = await createFullSetup();
      const b1 = await service.createProductBaseline(version.id, {}, actor);
      await service.approveProductBaseline(b1.id, actor);
      const b2 = await service.createProductBaseline(version.id, {}, actor);
      const baselines = await service.listProductBaselines(version.id);
      const superseded = baselines.find(b => b.id === b1.id);
      expect(superseded?.status).toBe('SUPERSEDED');
      expect(b2.status).toBe('DRAFT');
    });

    it('approves a DRAFT baseline', async () => {
      const { version } = await createFullSetup();
      const baseline = await service.createProductBaseline(version.id, {}, actor);
      const approved = await service.approveProductBaseline(baseline.id, actor);
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe(actor);
      expect(approved.approvedAt).toBeDefined();
    });

    it('rejects approval of non-DRAFT baseline', async () => {
      const { version } = await createFullSetup();
      const baseline = await service.createProductBaseline(version.id, {}, actor);
      await service.approveProductBaseline(baseline.id, actor);
      await expect(
        service.approveProductBaseline(baseline.id, actor),
      ).rejects.toThrow('Cannot approve baseline');
    });
  });

  describe('Traceability Links with Revisions', () => {
    it('persists sourceRevision and targetRevision', async () => {
      const { component } = await createFullSetup();
      const link = await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-001',
          sourceRevision: 2,
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
          targetRevision: 1,
        },
        actor,
      );
      expect(link.sourceRevision).toBe(2);
      expect(link.targetRevision).toBe(1);
    });

    it('works without revisions (backward compatibility)', async () => {
      const { component } = await createFullSetup();
      const link = await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-002',
          relationshipType: 'VERIFIED_BY',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      expect(link.sourceRevision).toBeUndefined();
      expect(link.targetRevision).toBeUndefined();
    });
  });

  describe('Full Lifecycle Integration', () => {
    it('completes Product → Version → Components → Baseline → Approve → Transition → RELEASED', async () => {
      const { version, component } = await createFullSetup();

      await service.addDataContract(
        component.id,
        { name: 'output-contract', schemaType: 'JSON_SCHEMA', version: '1.0' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT',
          sourceId: 'urs-wd-001',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );

      // A released product states which requirements it implements; the gate
      // refuses one that does not.
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineIds: ['urs-baseline-1'] },
        actor,
      );
      await service.approveProductBaseline(baseline.id, actor);

      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);

      const gate = await service.checkReleaseGate(version.id);
      expect(gate.passed).toBe(true);

      const released = await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED', releaseCommitSha: 'abc123', artifactDigest: 'sha256:def456' },
        actor,
      );
      expect(released.status).toBe('RELEASED');
      expect(released.releaseCommitSha).toBe('abc123');
      expect(released.artifactDigest).toBe('sha256:def456');
      expect(released.approvedBy).toBe(actor);
    });
  });

  describe('Cross-Plugin URS Baseline Check', () => {
    let serviceWithResolver: ComposerService;
    let mockResolver: UrsBaselineResolver;

    beforeAll(async () => {
      mockResolver = {
        resolveApprovedBaseline: jest.fn(),
        resolveBaselineContext: jest.fn(),
      };
      const repository = await ComposerRepository.create({ getClient: () => db });
      serviceWithResolver = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
      });
    });

    async function createFullSetupWithResolver() {
      const product = await serviceWithResolver.createProduct(
        {
          name: `XPlugin Product ${Date.now()}`,
          productType: 'DATA_PRODUCT',
          owner: 'group:default/platform-team',
          dataClassification: 'INTERNAL',
          gxpRelevance: 'NONE',
        },
        actor,
      );
      const version = await serviceWithResolver.createProductVersion(
        product.id,
        { version: '1.0' },
        actor,
      );
      const component = await serviceWithResolver.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Test Source' },
        actor,
      );
      return { product, version, component };
    }

    it('fails with NO_APPROVED_URS_BASELINE when resolver throws', async () => {
      const { version, component } = await createFullSetupWithResolver();
      await serviceWithResolver.createTraceabilityLink(
        { sourceType: 'URS', sourceId: 'urs-1', relationshipType: 'IMPLEMENTS', targetType: 'COMPONENT', targetId: component.id },
        actor,
      );
      const baseline = await serviceWithResolver.createProductBaseline(
        version.id,
        { ursBaselineIds: ['urs-baseline-1'] },
        actor,
      );
      await serviceWithResolver.approveProductBaseline(baseline.id, actor);
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockRejectedValueOnce(
        new Error('URS baseline urs-baseline-1 is DRAFT; expected APPROVED'),
      );
      await serviceWithResolver.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await serviceWithResolver.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await serviceWithResolver.checkReleaseGate(version.id);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_APPROVED_URS_BASELINE')).toBe(true);
    });

    it('passes when URS baselines are all APPROVED', async () => {
      const { version, component } = await createFullSetupWithResolver();
      await serviceWithResolver.createTraceabilityLink(
        { sourceType: 'URS', sourceId: 'urs-2', relationshipType: 'IMPLEMENTS', targetType: 'COMPONENT', targetId: component.id },
        actor,
      );
      const baseline = await serviceWithResolver.createProductBaseline(
        version.id,
        { ursBaselineIds: ['urs-baseline-2'] },
        actor,
      );
      await serviceWithResolver.approveProductBaseline(baseline.id, actor);
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockResolvedValueOnce({
        id: 'urs-baseline-2',
        status: 'APPROVED',
        baselineVersion: '1.0',
      });
      await serviceWithResolver.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await serviceWithResolver.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await serviceWithResolver.checkReleaseGate(version.id);
      expect(result.passed).toBe(true);
    });

    it('blocks, without consulting the resolver, when no URS is referenced', async () => {
      // There is nothing to resolve, so the resolver must stay untouched — but
      // the release is refused all the same, by NO_URS_BASELINE rather than by
      // a failed lookup. The two blockers answer different questions: "you
      // named no requirements" versus "the ones you named are not approved".
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockClear();
      const { version, component } = await createFullSetupWithResolver();
      await serviceWithResolver.createTraceabilityLink(
        { sourceType: 'URS', sourceId: 'urs-3', relationshipType: 'IMPLEMENTS', targetType: 'COMPONENT', targetId: component.id },
        actor,
      );
      const baseline = await serviceWithResolver.createProductBaseline(version.id, {}, actor);
      await serviceWithResolver.approveProductBaseline(baseline.id, actor);
      await serviceWithResolver.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await serviceWithResolver.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);

      const result = await serviceWithResolver.checkReleaseGate(version.id);

      expect(result.passed).toBe(false);
      expect(result.blockers.map(b => b.code)).toContain('NO_URS_BASELINE');
      expect(result.blockers.map(b => b.code)).not.toContain(
        'NO_APPROVED_URS_BASELINE',
      );
      expect(mockResolver.resolveApprovedBaseline).not.toHaveBeenCalled();
    });
  });

  // ── Phase 5 (P5-S1): Validation Decision in the Release Gate ──────────────

  describe('Validation Decision gate', () => {
    let serviceWithDecisionResolver: ComposerService;
    let mockUrsResolver: UrsBaselineResolver;
    let mockDecisionResolver: ValidationDecisionResolver;
    const repository2 = (() => {
      let r: any;
      return { get: async () => r, set: (v: any) => { r = v; } };
    })();

    beforeAll(async () => {
      const repo = await ComposerRepository.create({ getClient: () => db });
      mockUrsResolver = {
        resolveApprovedBaseline: jest.fn(async () => ({
          id: 'urs-vd-001', status: 'APPROVED', baselineVersion: '1.0',
        })),
        resolveBaselineContext: jest.fn(),
      };
      mockDecisionResolver = {
        hasApprovedDecision: jest.fn(async () => false),
      };
      serviceWithDecisionResolver = new ComposerService({
        logger: mockLogger,
        repository: repo,
        ursBaselineResolver: mockUrsResolver,
        validationDecisionResolver: mockDecisionResolver,
      });
    });

    async function createSetup() {
      const product = await serviceWithDecisionResolver.createProduct(
        {
          name: `VD Product ${Date.now()}`,
          productType: 'DATA_PRODUCT',
          owner: 'group:default/platform-team',
          dataClassification: 'INTERNAL',
          gxpRelevance: 'NONE',
        },
        actor,
      );
      const version = await serviceWithDecisionResolver.createProductVersion(product.id, {}, actor);
      const component = await serviceWithDecisionResolver.addProductComponent(
        version.id, { componentType: 'SOURCE', name: 'S' }, actor,
      );
      await serviceWithDecisionResolver.createTraceabilityLink(
        { sourceType: 'URS', sourceId: 'urs-x', relationshipType: 'IMPLEMENTS', targetType: 'COMPONENT', targetId: component.id },
        actor,
      );
      const baseline = await serviceWithDecisionResolver.createProductBaseline(
        version.id, { ursBaselineIds: ['urs-vd-001'] }, actor,
      );
      await serviceWithDecisionResolver.approveProductBaseline(baseline.id, actor);
      await serviceWithDecisionResolver.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await serviceWithDecisionResolver.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      return { version };
    }

    it('blocks release when no APPROVED ValidationDecision exists', async () => {
      (mockDecisionResolver.hasApprovedDecision as jest.Mock).mockResolvedValueOnce(false);
      (mockUrsResolver.resolveApprovedBaseline as jest.Mock).mockResolvedValueOnce({ id: 'urs-vd-001', status: 'APPROVED', baselineVersion: '1.0' });
      const { version } = await createSetup();
      const result = await serviceWithDecisionResolver.checkReleaseGate(version.id);
      expect(result.passed).toBe(false);
      expect(result.blockers.map(b => b.code)).toContain('NO_APPROVED_VALIDATION_DECISION');
    });

    it('passes release when an APPROVED ValidationDecision exists', async () => {
      (mockDecisionResolver.hasApprovedDecision as jest.Mock).mockResolvedValueOnce(true);
      (mockUrsResolver.resolveApprovedBaseline as jest.Mock).mockResolvedValueOnce({ id: 'urs-vd-001', status: 'APPROVED', baselineVersion: '1.0' });
      const { version } = await createSetup();
      const result = await serviceWithDecisionResolver.checkReleaseGate(version.id);
      expect(result.blockers.map(b => b.code)).not.toContain('NO_APPROVED_VALIDATION_DECISION');
    });
  });
});
