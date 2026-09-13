/**
 * Digital thread unit tests: URS binding, scaffold artifacts, change impact.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import { buildDigitalThreadScaffoldArtifacts } from './digital-thread-artifacts';
import {
  buildChangeImpactAssessment,
  computeRequirementDeltas,
  hasOpenRetestRequired,
} from './change-impact';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const URS_PIN = {
  requirementSetId: 'set-1',
  ursBaselineId: 'urs-baseline-approved',
  ursVersion: '1.0',
  ursContentHash: 'a'.repeat(64),
};

function createDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

function createResolver(
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
      requirements:
        id === 'urs-baseline-v2'
          ? [
              {
                id: 'URS-1',
                versionId: 'rv-1-v2',
                title: 'Req 1',
                statement: 'changed',
              },
              {
                id: 'URS-2',
                versionId: 'rv-2',
                title: 'Req 2',
                statement: 'new',
              },
            ]
          : [
              {
                id: 'URS-1',
                versionId: 'rv-1-v1',
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
    listApprovedBaselines: jest.fn(async () => []),
    listChangeRequests: jest.fn(async () => ({ items: [], total: 0 })),
    ...overrides,
  };
}

describe('Digital thread', () => {
  let db: Knex;
  let service: ComposerService;
  let mockResolver: UrsBaselineResolver;
  const actor = 'user:default/tester';
  const credentials = { principal: { userEntityRef: actor } };

  beforeAll(async () => {
    db = createDb();
    mockResolver = createResolver();
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: mockResolver,
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('1: rejects controlled ProductVersion without approved URS Baseline', async () => {
    const product = await service.createProduct(
      { name: `DT Reject ${Date.now()}`, productType: 'DATA_PRODUCT' },
      actor,
    );
    await expect(
      service.createProductVersion(product.id, { version: '1.0' } as any, actor),
    ).rejects.toThrow(/ursBaselineId/i);

    (mockResolver.resolveApprovedBaseline as jest.Mock).mockRejectedValueOnce(
      new Error('not approved'),
    );
    await expect(
      service.createProductVersion(
        product.id,
        { ...URS_PIN, ursBaselineId: 'bad' },
        actor,
        credentials,
      ),
    ).rejects.toThrow(/Controlled Product without approved URS Baseline/i);
  });

  it('2: scaffold binding emits URS snapshot, manifest and traceability template', async () => {
    const product = await service.createProduct(
      { name: `DT Scaffold ${Date.now()}`, productType: 'DATA_PRODUCT' },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0', ...URS_PIN },
      actor,
      credentials,
    );
    await service.addProductComponent(
      version.id,
      { componentType: 'SOURCE', name: 'Src' },
      actor,
    );
    const baseline = await service.createProductBaseline(
      version.id,
      { ursBaselineId: URS_PIN.ursBaselineId },
      actor,
      credentials,
    );
    await service.approveProductBaseline(baseline.id, actor, credentials);
    const binding = await service.getScaffoldBinding(
      version.id,
      actor,
      credentials,
    );

    expect(binding.scaffolderPinValues.productManifestYaml).toContain(
      'productId:',
    );
    expect(binding.scaffolderPinValues.ursBaselineJson).toContain(
      URS_PIN.ursBaselineId,
    );
    expect(binding.scaffolderPinValues.ursBaselineMd).toContain(
      'URS Baseline Snapshot',
    );
    expect(binding.scaffolderPinValues.traceabilityMatrixYaml).toContain(
      'ursRequirementId',
    );
    expect(binding.scaffolderPinValues.agentsMd).toContain(
      '/docs/urs/URS-baseline.md',
    );

    const manifest = await service.getProductManifestForBaseline(baseline.id);
    const artifacts = buildDigitalThreadScaffoldArtifacts({
      version,
      baseline: { ...baseline, status: 'APPROVED' },
      manifest: manifest!,
      ursContext: await mockResolver.resolveBaselineContext(
        URS_PIN.ursBaselineId,
        credentials,
      ),
    });
    expect(artifacts.paths.productManifest).toBe('product-manifest.yaml');
    expect(artifacts.manifestFileHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('4: draft-only URS change produces no retest assessment', () => {
    const assessment = buildChangeImpactAssessment({
      productId: 'p1',
      productVersionId: 'v1',
      productBaselineId: 'b1',
      ursBaselineId: 'urs-new',
      requirementSetId: 'set-1',
      deltas: [
        { requirementId: 'URS-1', changeType: 'MODIFIED' },
      ],
      actor,
      triggerRetest: false,
    });
    expect(assessment).toBeNull();
  });

  it('5/6: approved assigned URS baseline marks impacted tests RETEST_REQUIRED and carries forward unchanged', () => {
    const deltas = computeRequirementDeltas(
      [{ requirementId: 'URS-1', versionId: 'v1' }],
      [
        { requirementId: 'URS-1', versionId: 'v1b' },
        { requirementId: 'URS-2', versionId: 'v2' },
      ],
    );
    expect(deltas.find(d => d.requirementId === 'URS-1')?.changeType).toBe(
      'MODIFIED',
    );
    expect(deltas.find(d => d.requirementId === 'URS-2')?.changeType).toBe(
      'ADDED',
    );

    const withUnchanged = computeRequirementDeltas(
      [
        { requirementId: 'URS-1', versionId: 'v1' },
        { requirementId: 'URS-KEEP', versionId: 'vk' },
      ],
      [
        { requirementId: 'URS-1', versionId: 'v1b' },
        { requirementId: 'URS-KEEP', versionId: 'vk' },
      ],
    );
    const assessment = buildChangeImpactAssessment({
      productId: 'p1',
      productVersionId: 'v2',
      productBaselineId: 'b2',
      previousUrsBaselineId: 'urs-old',
      ursBaselineId: 'urs-new',
      requirementSetId: 'set-1',
      deltas: withUnchanged,
      actor,
      triggerRetest: true,
    });
    expect(assessment?.retestRequiredRequirementIds).toContain('URS-1');
    expect(assessment?.carriedForwardRequirementIds).toContain('URS-KEEP');
    expect(hasOpenRetestRequired(assessment)).toBe(true);
  });

  it('7: release is blocked while RETEST_REQUIRED is open', async () => {
    const product = await service.createProduct(
      { name: `DT Retest ${Date.now()}`, productType: 'DATA_PRODUCT' },
      actor,
    );
    const v1 = await service.createProductVersion(
      product.id,
      { version: '1.0', ...URS_PIN },
      actor,
      credentials,
    );
    await service.addProductComponent(
      v1.id,
      { componentType: 'SOURCE', name: 'Src' },
      actor,
    );
    const b1 = await service.createProductBaseline(
      v1.id,
      { ursBaselineId: URS_PIN.ursBaselineId },
      actor,
      credentials,
    );
    await service.approveProductBaseline(b1.id, actor, credentials);
    await service.transitionProductVersionStatus(
      v1.id,
      { targetStatus: 'APPROVED' },
      actor,
    );

    (mockResolver.resolveApprovedBaseline as jest.Mock).mockImplementation(
      async (id: string) => ({
        id,
        status: 'APPROVED',
        baselineVersion: id === 'urs-baseline-v2' ? '2.0' : '1.0',
        requirementSetId: 'set-1',
        contentHash: id === 'urs-baseline-v2' ? 'b'.repeat(64) : 'a'.repeat(64),
      }),
    );

    const v2 = await service.createProductVersion(
      product.id,
      {
        version: '2.0',
        requirementSetId: 'set-1',
        ursBaselineId: 'urs-baseline-v2',
        ursVersion: '2.0',
        ursContentHash: 'b'.repeat(64),
      },
      actor,
      credentials,
    );
    expect(v2.parentVersionId).toBe(v1.id);
    await service.addProductComponent(
      v2.id,
      { componentType: 'SOURCE', name: 'Src2' },
      actor,
    );
    const b2 = await service.createProductBaseline(
      v2.id,
      { ursBaselineId: 'urs-baseline-v2' },
      actor,
      credentials,
    );
    const impact = await service.getChangeImpactAssessment(v2.id);
    expect(impact).toBeTruthy();
    expect(hasOpenRetestRequired(impact)).toBe(true);
    expect(impact?.retestRequiredRequirementIds).toEqual(
      expect.arrayContaining(['URS-1', 'URS-2']),
    );

    await service.approveProductBaseline(b2.id, actor, credentials);
    await service.createTraceabilityLink(
      {
        sourceType: 'URS',
        sourceId: 'u1',
        relationshipType: 'IMPLEMENTS',
        targetType: 'COMPONENT',
        targetId: (await service.listProductComponents(v2.id))[0].id,
      },
      actor,
    );
    await service.transitionProductVersionStatus(
      v2.id,
      { targetStatus: 'APPROVED' },
      actor,
    );
    await service.transitionProductVersionStatus(
      v2.id,
      { targetStatus: 'RELEASE_CANDIDATE' },
      actor,
    );
    const gate = await service.checkReleaseGate(v2.id, credentials);
    expect(gate.passed).toBe(false);
    expect(gate.blockers.some(b => b.code === 'RETEST_REQUIRED_OPEN')).toBe(
      true,
    );
  });
});
