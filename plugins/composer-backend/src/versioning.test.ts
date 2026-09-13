/**
 * Phase 1 versioning foundation tests.
 *
 * Covers status transitions, release gate checks, product baselines, URS pin,
 * Product Manifest v0.1, and revision-specific traceability links against an
 * in-memory SQLite database.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import { UrsBaselineResolutionError } from './urs-baseline-resolver';

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

function createApprovedResolver(
  overrides?: Partial<UrsBaselineResolver>,
): UrsBaselineResolver {
  return {
    resolveApprovedBaseline: jest.fn(async (id: string) => ({
      id,
      status: 'APPROVED',
      baselineVersion: '1.0',
      requirementSetId: 'set-1',
      contentHash: 'a'.repeat(64),
      requirementVersionIds: ['rv-1'],
    })),
    resolveBaselineContext: jest.fn(async (id: string) => ({
      baselineId: id,
      baselineVersion: '1.0',
      requirementSetId: 'set-1',
      businessCapabilities: [],
      requirements: [
        {
          id: 'URS-1',
          title: 'Req 1',
          statement: 'Must do X',
        },
      ],
    })),
    inspectBaseline: jest.fn(async (id: string) => ({
      id,
      status: 'APPROVED',
      baselineVersion: '1.0',
      requirementSetId: 'set-1',
      contentHash: 'a'.repeat(64),
    })),
    listApprovedBaselines: jest.fn(async () => [
      {
        id: 'urs-baseline-approved',
        status: 'APPROVED',
        baselineVersion: '1.0',
        requirementSetId: 'set-1',
        solutionName: 'Demo',
        contentHash: 'a'.repeat(64),
      },
    ]),
    listChangeRequests: jest.fn(async () => ({ items: [], total: 0 })),
    ...overrides,
  };
}

const URS_PIN = {
  requirementSetId: 'set-1',
  ursBaselineId: 'urs-baseline-approved',
  ursVersion: '1.0',
  ursContentHash: 'a'.repeat(64),
};
const RELEASE_COMMIT = 'abcdef1';
const approvedValidationDecisionResolver = {
  resolve: jest.fn(async () => ({
    status: 'APPROVED' as const,
    contextId: 'validation-context-approved',
  })),
};

describe('Phase 1: Versioning Foundation', () => {
  let db: Knex;
  let service: ComposerService;
  let mockResolver: UrsBaselineResolver;
  const credentials = { principal: { userEntityRef: 'user:default/test-user' } };

  beforeAll(async () => {
    db = createDb();
    await db.raw('select 1');
    mockResolver = createApprovedResolver();
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: mockResolver,
      validationDecisionResolver: approvedValidationDecisionResolver,
    });
  });

  beforeEach(() => {
    mockResolver = createApprovedResolver();
    (service as any).ursBaselineResolver = mockResolver;
  });

  afterAll(async () => {
    await db?.destroy();
  });

  const actor = 'user:default/test-user';
  const ursBaselineId = 'urs-baseline-approved';

  async function createFullSetup() {
    const product = await service.createProduct(
      { name: `Test Product ${Date.now()}`, productType: 'DATA_PRODUCT' },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0', ...URS_PIN },
      actor,
      credentials,
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
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'INVALID_STATUS')).toBe(true);
    });

    it('fails with NO_COMPONENTS when version has no components', async () => {
      const product = await service.createProduct(
        { name: `Empty Product ${Date.now()}`, productType: 'SERVICE' },
        actor,
      );
      const version = await service.createProductVersion(product.id, { ...URS_PIN }, actor, credentials);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_COMPONENTS')).toBe(true);
    });

    it('fails with INCOMPLETE_TRACEABILITY when component has no link', async () => {
      const { version } = await createFullSetup();
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
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
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_APPROVED_BASELINE')).toBe(true);
    });

    it('passes when all conditions are met including APPROVED URS', async () => {
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
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('fails with NO_MANIFEST when approved baseline has no persisted manifest', async () => {
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
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      await db('product_manifests')
        .where({ product_baseline_id: baseline.id })
        .del();
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_MANIFEST')).toBe(true);
    });

    it('fails with MANIFEST_HASH_MISMATCH when stored hash is tampered', async () => {
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
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      await db('product_manifests')
        .where({ product_baseline_id: baseline.id })
        .update({ content_hash: 'a'.repeat(64) });
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'MANIFEST_HASH_MISMATCH')).toBe(
        true,
      );
    });

    it('fails with MANIFEST_URS_MISMATCH when baseline URS pin drifts from manifest', async () => {
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
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      await db('product_baselines')
        .where({ id: baseline.id })
        .update({ urs_baseline_id: 'urs-drifted-other' });
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockImplementation(
        async (id: string) => ({
          id,
          status: 'APPROVED',
          baselineVersion: '1.0',
        }),
      );
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'MANIFEST_URS_MISMATCH')).toBe(
        true,
      );
    });
  });

  describe('Product Baselines + URS pin', () => {
    it('uses ProductVersion URS pin when request omits ursBaselineId', async () => {
      const { version } = await createFullSetup();
      const baseline = await service.createProductBaseline(
        version.id,
        {} as any,
        actor,
        credentials,
      );
      expect(baseline.ursBaselineId).toBe(version.ursBaselineId);
      expect(baseline.requirementSetId).toBe(version.requirementSetId);
      expect(baseline.ursContentHash).toBe(version.ursContentHash);
    });

    it('rejects baseline when URS is not APPROVED', async () => {
      const { version } = await createFullSetup();
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockRejectedValueOnce(
        new Error('URS baseline urs-baseline-approved is DRAFT; expected APPROVED'),
      );
      await expect(
        service.createProductBaseline(
          version.id,
          { ursBaselineId: version.ursBaselineId },
          actor,
          credentials,
        ),
      ).rejects.toThrow(/not valid for product baseline/i);
    });

    it('rejects baseline that does not match ProductVersion URS pin', async () => {
      const { version } = await createFullSetup();
      await expect(
        service.createProductBaseline(
          version.id,
          { ursBaselineId: 'other-baseline' },
          actor,
          credentials,
        ),
      ).rejects.toThrow(/must match ProductVersion pin/i);
    });

    it('creates a baseline with snapshot, URS pin, and persisted manifest', async () => {
      const { version, component } = await createFullSetup();
      await service.addDataContract(
        component.id,
        { schemaType: 'JSON_SCHEMA', version: '1.0' },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      expect(baseline.status).toBe('DRAFT');
      expect(baseline.ursBaselineId).toBe(ursBaselineId);
      expect(baseline.snapshot).toBeDefined();
      expect((baseline.snapshot as any).components).toHaveLength(1);
      expect((baseline.snapshot as any).contracts).toHaveLength(1);

      const manifest = await service.getProductManifestForBaseline(baseline.id);
      expect(manifest).not.toBeNull();
      expect(manifest!.manifestVersion).toBe('0.1');
      expect(manifest!.ursBaselineId).toBe(ursBaselineId);
      expect(manifest!.contentHash).toBe(manifest!.document.metadata.contentHash);
      expect(manifest!.document.spec.ursBaselineId).toBe(ursBaselineId);
    });

    it('supersedes previous APPROVED baseline when creating new one', async () => {
      const { version } = await createFullSetup();
      const b1 = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(b1.id, actor, credentials);
      const b2 = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      const baselines = await service.listProductBaselines(version.id);
      const superseded = baselines.find(b => b.id === b1.id);
      expect(superseded?.status).toBe('SUPERSEDED');
      expect(b2.status).toBe('DRAFT');
    });

    it('approves a DRAFT baseline', async () => {
      const { version } = await createFullSetup();
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      const approved = await service.approveProductBaseline(
        baseline.id,
        actor,
        credentials,
      );
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe(actor);
      expect(approved.approvedAt).toBeDefined();
    });

    it('sets version.baselineId on approve', async () => {
      const product = await service.createProduct(
        { name: `Baseline Link ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(product.id, { version: '1.0', ...URS_PIN }, actor, credentials);
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const versions = await service.listProductVersions(product.id);
      expect(versions[0].baselineId).toBe(baseline.id);
    });

    it('rejects approval of non-DRAFT baseline', async () => {
      const { version } = await createFullSetup();
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      await expect(
        service.approveProductBaseline(baseline.id, actor, credentials),
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
        { schemaType: 'JSON_SCHEMA', version: '1.0' },
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
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);

      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);

      const gate = await service.checkReleaseGate(version.id, credentials);
      expect(gate.passed).toBe(true);

      const released = await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED', releaseCommitSha: 'abc123', artifactDigest: 'sha256:def456' },
        actor,
        credentials,
      );
      expect(released.status).toBe('RELEASED');
      expect(released.releaseCommitSha).toBe('abc123');
      expect(released.artifactDigest).toBe('sha256:def456');
      expect(released.approvedBy).toBe(actor);
    });

    it('registers technical CI evidence on RELEASED when Catalog + CI PASSED', async () => {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `CI Evidence ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const manifest = await service.getProductManifestForBaseline(baseline.id);
      const slug = product.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const registerTechnicalCiEvidence = jest.fn().mockImplementation(
        async (req: { reference: string; evidenceType: string }) => ({
          created: true,
          item: {
            id: 'ev-ci-1',
            evidenceType: req.evidenceType,
            reference: req.reference,
            source: 'runtime',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        }),
      );
      const store: Array<{
        id: string;
        evidenceType: string;
        reference: string;
      }> = [];
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: {
          resolveByName: jest.fn().mockResolvedValue({
            entityRef: `component:default/${slug}`,
            name: slug,
            productManifestContentHash: manifest!.contentHash,
            ursBaselineId,
            productBaselineId: baseline.id,
            productVersionId: version.id,
            productId: product.id,
          }),
        },
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({
            status: 'PASSED',
            workflowName: 'CI',
            commitSha: 'abcdef1',
            htmlUrl: 'https://github.com/org/repo/actions/runs/1',
          }),
        },
        technicalEvidenceRegistrar: {
          registerTechnicalCiEvidence: jest.fn(async req => {
            const result = await registerTechnicalCiEvidence(req);
            store.push({
              id: result.item.id,
              evidenceType: result.item.evidenceType,
              reference: result.item.reference,
            });
            return result;
          }),
        },
        technicalEvidenceLookup: {
          listTechnicalCiEvidence: jest.fn(async () => store),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED', releaseCommitSha: RELEASE_COMMIT },
        actor,
        credentials,
      );

      expect(registerTechnicalCiEvidence).toHaveBeenCalledTimes(1);
      const payload = registerTechnicalCiEvidence.mock.calls[0][0];
      expect(payload.evidenceType).toBe('ci-quality-gate');
      expect(payload.idempotencyKey).toContain(version.id);
      expect(payload.idempotencyKey).toContain(manifest!.contentHash);
      const ref = JSON.parse(payload.reference);
      expect(ref.kind).toBe('ci-quality-gate');
      expect(ref.ursBaselineId).toBe(ursBaselineId);
      expect(ref.disclaimer).toBe('technical-control-not-gxp');
      expect(ref.commitSha).toBe('abcdef1');

      const trail = await gated.getEntityAuditTrail(
        'PRODUCT_VERSION',
        version.id,
      );
      expect(trail.some(e => e.eventType === 'CI_EVIDENCE_REGISTERED')).toBe(
        true,
      );
      expect(trail.some(e => e.eventType === 'CI_EVIDENCE_VERIFIED')).toBe(
        true,
      );
    });

    it('blocks RELEASED when evidence register succeeds but read-back is not PRESENT', async () => {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `CI Verify Fail ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const manifest = await service.getProductManifestForBaseline(baseline.id);
      const slug = product.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: {
          resolveByName: jest.fn().mockResolvedValue({
            entityRef: `component:default/${slug}`,
            name: slug,
            productManifestContentHash: manifest!.contentHash,
            ursBaselineId,
            productBaselineId: baseline.id,
            productVersionId: version.id,
            productId: product.id,
          }),
        },
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({
            status: 'PASSED',
            commitSha: 'abcdef1',
          }),
        },
        technicalEvidenceRegistrar: {
          registerTechnicalCiEvidence: jest.fn().mockResolvedValue({
            created: true,
            item: {
              id: 'ev-orphan',
              evidenceType: 'ci-quality-gate',
              reference: '{}',
              source: 'runtime',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          }),
        },
        technicalEvidenceLookup: {
          listTechnicalCiEvidence: jest.fn().mockResolvedValue([]),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      await expect(
        gated.transitionProductVersionStatus(
          version.id,
          { targetStatus: 'RELEASED', releaseCommitSha: RELEASE_COMMIT },
          actor,
          credentials,
        ),
      ).rejects.toThrow(/not PRESENT after register/i);

      const still = await repository.getProductVersion(version.id);
      expect(still?.status).toBe('RELEASE_CANDIDATE');
    });

    it('blocks RELEASED when technical evidence registration fails', async () => {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `CI Fail Closed ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const manifest = await service.getProductManifestForBaseline(baseline.id);
      const slug = product.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: {
          resolveByName: jest.fn().mockResolvedValue({
            entityRef: `component:default/${slug}`,
            name: slug,
            productManifestContentHash: manifest!.contentHash,
            ursBaselineId,
            productBaselineId: baseline.id,
            productVersionId: version.id,
            productId: product.id,
          }),
        },
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({
            status: 'PASSED',
            commitSha: 'abcdef1',
          }),
        },
        technicalEvidenceRegistrar: {
          registerTechnicalCiEvidence: jest
            .fn()
            .mockRejectedValue(new Error('VE down')),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      await expect(
        gated.transitionProductVersionStatus(
          version.id,
          { targetStatus: 'RELEASED', releaseCommitSha: RELEASE_COMMIT },
          actor,
          credentials,
        ),
      ).rejects.toThrow(/Technical CI evidence registration required/i);

      const still = await repository.getProductVersion(version.id);
      expect(still?.status).toBe('RELEASE_CANDIDATE');
    });

    it('reports QA readiness MISSING then PRESENT for technical evidence', async () => {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `QA Ready ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const manifest = await service.getProductManifestForBaseline(baseline.id);
      const slug = product.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const store: Array<{
        id: string;
        evidenceType: string;
        reference: string;
      }> = [];
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: {
          resolveByName: jest.fn().mockResolvedValue({
            entityRef: `component:default/${slug}`,
            name: slug,
            productManifestContentHash: manifest!.contentHash,
            ursBaselineId,
            productBaselineId: baseline.id,
            productVersionId: version.id,
            productId: product.id,
          }),
        },
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({
            status: 'PASSED',
            commitSha: 'abcdef1',
          }),
        },
        technicalEvidenceRegistrar: {
          registerTechnicalCiEvidence: jest.fn(async req => {
            const item = {
              id: 'ev-ready-1',
              evidenceType: req.evidenceType,
              reference: req.reference,
              source: 'runtime' as const,
              createdAt: '2026-01-01T00:00:00.000Z',
            };
            store.push(item);
            return { created: true, item };
          }),
        },
        technicalEvidenceLookup: {
          listTechnicalCiEvidence: jest.fn(async () => store),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );

      const before = await gated.checkQaReadiness(version.id, credentials);
      expect(before.evidenceCompleteness).toBe('MISSING');
      expect(before.releaseGatePassed).toBe(true);

      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED', releaseCommitSha: RELEASE_COMMIT },
        actor,
        credentials,
      );

      const after = await gated.checkQaReadiness(version.id, credentials);
      expect(after.evidenceCompleteness).toBe('PRESENT');
      expect(after.evidenceId).toBe('ev-ready-1');
      expect(after.disclaimer).toBe('technical-control-not-gxp');
      expect(after.ursPinStatus).toBe('APPROVED');
    });

    it('reports SUPERSEDED URS pin currency on QA readiness (advisory)', async () => {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `URS Currency ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);

      const resolver = createApprovedResolver({
        inspectBaseline: jest.fn(async (id: string) => ({
          id,
          status: 'SUPERSEDED',
          baselineVersion: '1.0',
          supersededBy: 'urs-baseline-next',
        })),
      });
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: resolver,
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );

      const readiness = await gated.checkQaReadiness(version.id, credentials);
      expect(readiness.ursPinStatus).toBe('SUPERSEDED');
      expect(readiness.ursSupersededBy).toBe('urs-baseline-next');
      expect(readiness.ursPinMessage).toMatch(/SUPERSEDED/i);
      expect(readiness.disclaimer).toBe('technical-control-not-gxp');
      // Soft advisory only — does not mutate version status
      const still = await repository.getProductVersion(version.id);
      expect(still?.status).toBe('RELEASE_CANDIDATE');
    });
  });

  describe('Scaffold binding from ProductManifest', () => {
    it('issues scaffold pins from approved baseline + verified manifest', async () => {
      const { product, version, component } = await createFullSetup();
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
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);

      const binding = await service.getScaffoldBinding(
        version.id,
        actor,
        credentials,
      );
      expect(binding.productId).toBe(product.id);
      expect(binding.productBaselineId).toBe(baseline.id);
      expect(binding.ursBaselineId).toBe(ursBaselineId);
      expect(binding.manifestContentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(binding.scaffolderPinValues.productManifestContentHash).toBe(
        binding.manifestContentHash,
      );
      expect(binding.supportedTemplateRefs).toContain(
        'template:default/oee-data-product',
      );

      const trail = await service.getEntityAuditTrail(
        'PRODUCT_VERSION',
        version.id,
      );
      expect(
        trail.some(e => e.eventType === 'SCAFFOLD_BINDING_ISSUED'),
      ).toBe(true);
    });

    it('rejects scaffold binding without approved baseline', async () => {
      const { version } = await createFullSetup();
      await expect(
        service.getScaffoldBinding(version.id, actor, credentials),
      ).rejects.toThrow(/APPROVED product baseline is required/i);
    });
  });

  describe('Catalog manifest pin gate', () => {
    it('fails when Catalog entity exists without pin annotations', async () => {
      const catalogResolver = {
        resolveByName: jest.fn().mockResolvedValue({
          entityRef: 'component:default/test-product',
          name: 'test-product',
        }),
      };
      const repository = await ComposerRepository.create({ getClient: () => db });
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: catalogResolver,
      });
      const product = await gated.createProduct(
        { name: `Catalog Pin ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await gated.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await gated.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await gated.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await gated.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await gated.approveProductBaseline(baseline.id, actor, credentials);
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await gated.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(
        result.blockers.some(b => b.code === 'CATALOG_MANIFEST_PIN_MISSING'),
      ).toBe(true);
    });

    it('passes when Catalog pins match the ProductManifest', async () => {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `Catalog Match ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const manifest = await service.getProductManifestForBaseline(baseline.id);
      const catalogResolver = {
        resolveByName: jest.fn().mockResolvedValue({
          entityRef: `component:default/${product.name}`,
          name: product.name,
          productManifestContentHash: manifest!.contentHash,
          ursBaselineId,
          productBaselineId: baseline.id,
          productVersionId: version.id,
          productId: product.id,
        }),
      };
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: catalogResolver,
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await gated.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(true);
    });
  });

  describe('CI Quality Gate in Release Gate', () => {
    async function prepareCatalogPinnedCandidate() {
      const repository = await ComposerRepository.create({ getClient: () => db });
      const product = await service.createProduct(
        { name: `CI Gate ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      const manifest = await service.getProductManifestForBaseline(baseline.id);
      const slug = product.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const catalogResolver = {
        resolveByName: jest.fn().mockResolvedValue({
          entityRef: `component:default/${slug}`,
          name: slug,
          productManifestContentHash: manifest!.contentHash,
          ursBaselineId,
          productBaselineId: baseline.id,
          productVersionId: version.id,
          productId: product.id,
        }),
      };
      return { repository, product, version, catalogResolver };
    }

    it('blocks when Catalog entity exists and CI is UNKNOWN', async () => {
      const { repository, version, catalogResolver } =
        await prepareCatalogPinnedCandidate();
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: catalogResolver,
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({
            status: 'UNKNOWN',
            message: 'Not available',
          }),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await gated.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(
        result.blockers.some(b => b.code === 'CI_STATUS_UNVERIFIED'),
      ).toBe(true);
    });

    it('blocks when CI failed', async () => {
      const { repository, version, catalogResolver } =
        await prepareCatalogPinnedCandidate();
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        catalogManifestPinResolver: catalogResolver,
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({ status: 'FAILED' }),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await gated.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'CI_STATUS_FAILED')).toBe(
        true,
      );
    });

    it('passes when Catalog pins match and CI is PASSED', async () => {
      const { repository, version, catalogResolver } =
        await prepareCatalogPinnedCandidate();
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: catalogResolver,
        ciStatusResolver: {
          resolveByEntityRef: jest.fn().mockResolvedValue({
            status: 'PASSED',
            commitSha: RELEASE_COMMIT,
          }),
        },
      });
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await gated.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(true);
    });

    it('skips CI check when Catalog entity is absent (pre-scaffold)', async () => {
      const catalogResolver = {
        resolveByName: jest.fn().mockResolvedValue(null),
      };
      const ciResolver = {
        resolveByEntityRef: jest.fn(),
      };
      const repository = await ComposerRepository.create({ getClient: () => db });
      const gated = new ComposerService({
        logger: mockLogger,
        repository,
        ursBaselineResolver: mockResolver,
        validationDecisionResolver: approvedValidationDecisionResolver,
        catalogManifestPinResolver: catalogResolver,
        ciStatusResolver: ciResolver,
      });
      const product = await gated.createProduct(
        { name: `Pre Scaffold ${Date.now()}`, productType: 'DATA_PRODUCT' },
        actor,
      );
      const version = await gated.createProductVersion(
        product.id,
        { version: '1.0', ...URS_PIN },
        actor,
        credentials,
      );
      const component = await gated.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Src' },
        actor,
      );
      await gated.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'u1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await gated.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await gated.approveProductBaseline(baseline.id, actor, credentials);
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await gated.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await gated.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(true);
      expect(ciResolver.resolveByEntityRef).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Plugin URS Baseline Check', () => {
    it('fails with URS_BASELINE_SUPERSEDED when pinned URS is SUPERSEDED', async () => {
      const { version, component } = await createFullSetup();
      await service.createTraceabilityLink(
        {
          sourceType: 'URS',
          sourceId: 'urs-1',
          relationshipType: 'IMPLEMENTS',
          targetType: 'COMPONENT',
          targetId: component.id,
        },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockRejectedValueOnce(
        new UrsBaselineResolutionError({
          kind: 'SUPERSEDED',
          baselineId: ursBaselineId,
          status: 'SUPERSEDED',
          supersededBy: 'urs-baseline-2',
          message: `URS baseline ${ursBaselineId} is SUPERSEDED; expected APPROVED`,
        }),
      );
      await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        actor,
      );
      await service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        actor,
      );
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(
        result.blockers.some(b => b.code === 'URS_BASELINE_SUPERSEDED'),
      ).toBe(true);
      expect(
        result.blockers.some(b => b.code === 'NO_APPROVED_URS_BASELINE'),
      ).toBe(false);
    });

    it('fails with NO_APPROVED_URS_BASELINE when resolver throws at gate', async () => {
      const { version, component } = await createFullSetup();
      await service.createTraceabilityLink(
        { sourceType: 'URS', sourceId: 'urs-1', relationshipType: 'IMPLEMENTS', targetType: 'COMPONENT', targetId: component.id },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      (mockResolver.resolveApprovedBaseline as jest.Mock).mockRejectedValueOnce(
        new Error(`URS baseline ${ursBaselineId} is DRAFT; expected APPROVED`),
      );
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(false);
      expect(result.blockers.some(b => b.code === 'NO_APPROVED_URS_BASELINE')).toBe(true);
    });

    it('passes when URS baseline remains APPROVED', async () => {
      const { version, component } = await createFullSetup();
      await service.createTraceabilityLink(
        { sourceType: 'URS', sourceId: 'urs-2', relationshipType: 'IMPLEMENTS', targetType: 'COMPONENT', targetId: component.id },
        actor,
      );
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'APPROVED' }, actor);
      await service.transitionProductVersionStatus(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, actor);
      const result = await service.checkReleaseGate(version.id, credentials);
      expect(result.passed).toBe(true);
    });
  });

  describe('Product Change Signals (advisory soft index)', () => {
    it('hydrates matching CRs into durable signals and returns views', async () => {
      const { product, version } = await createFullSetup();
      const baseline = await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );
      await service.approveProductBaseline(baseline.id, actor, credentials);

      (mockResolver.listChangeRequests as jest.Mock).mockResolvedValueOnce({
        total: 2,
        items: [
          {
            id: 'cr-match',
            title: `CR for product version ${version.id}`,
            description: `Product version soft-ref: ${version.id}. Product soft-ref: ${product.id}.`,
            status: 'DRAFT',
          },
          {
            id: 'cr-other',
            title: 'Unrelated',
            description: 'No soft refs here',
            status: 'DRAFT',
          },
        ],
      });

      const result = await service.listProductChangeSignals(
        version.id,
        actor,
        credentials,
      );
      expect(result.disclaimer).toBe('advisory-soft-index-not-gxp');
      expect(result.scanned).toBe(2);
      expect(result.ursTotal).toBe(2);
      expect(result.hydratedCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].changeRequestId).toBe('cr-match');
      expect(result.items[0].matchAxis).toBe('PRODUCT_VERSION');
      expect(result.items[0].title).toContain(version.id);

      // Empty URS scan still surfaces previously hydrated durable signals
      (mockResolver.listChangeRequests as jest.Mock).mockResolvedValueOnce({
        total: 0,
        items: [],
      });
      const stored = await service.listProductChangeSignals(
        version.id,
        actor,
        credentials,
      );
      expect(stored.hydratedCount).toBe(0);
      expect(stored.items.some(i => i.changeRequestId === 'cr-match')).toBe(
        true,
      );
    });

    it('matches URS baseline soft-ref axis', async () => {
      const { version } = await createFullSetup();
      await service.createProductBaseline(
        version.id,
        { ursBaselineId },
        actor,
        credentials,
      );

      (mockResolver.listChangeRequests as jest.Mock).mockResolvedValueOnce({
        total: 1,
        items: [
          {
            id: 'cr-urs',
            title: `Update for baseline ${ursBaselineId}`,
            description: `Raised from baseline ${ursBaselineId}.`,
            status: 'SUBMITTED',
          },
        ],
      });

      const result = await service.listProductChangeSignals(
        version.id,
        actor,
        credentials,
      );
      expect(result.hydratedCount).toBe(1);
      expect(result.items[0].matchAxis).toBe('URS_BASELINE');
      expect(result.items[0].ursBaselineId).toBe(ursBaselineId);
    });
  });
});
