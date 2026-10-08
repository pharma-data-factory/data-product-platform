/**
 * Importing a product repository's CI test evidence (NXD-123).
 *
 * The CI uploads per-test outcomes naming URS requirement ids (NXD-122);
 * Composer matches them to the requirements bound to the version and records
 * one test execution per match. Pinned: passes and failures become PASSED and
 * FAILED, a skipped test is not evidence, an id the version does not carry is
 * reported rather than dropped silently, a requirement without a test is
 * named, and the same CI run is never recorded twice.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import type { CiEvidence, CiEvidenceClient } from './ci-evidence-client';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const BASELINE = 'urs-epm-1';
const actor = 'user:default/demo-author';
const RUN_URL = 'https://github.com/pharma-data-factory/oee/actions/runs/7';

const requirement = (ref: string) => ({
  id: `rv-${ref}`,
  requirementRef: ref,
  title: ref,
  statement: `${ref} statement`,
  priority: 'MUST',
  gxpRelevance: 'INDIRECT',
  versionLabel: '1.0',
  contentHash: `sha256:${ref}`,
});

const resolver: UrsBaselineResolver = {
  resolveApprovedBaseline: jest.fn(async (id: string) => ({
    id,
    status: 'APPROVED',
    baselineVersion: '1.0',
  })),
  resolveBaselineContext: jest.fn(async (id: string) => ({
    baselineId: id,
    baselineVersion: '1.0',
    requirementSetId: 'seed:urs-epm',
    solutionName: 'EPM',
    businessCapabilities: [],
    requirements: [requirement('URS-EPM-001'), requirement('URS-EPM-002')] as any,
  })),
};

function evidence(results: CiEvidence['results']): CiEvidence {
  return {
    available: true,
    run: { id: 7, url: RUN_URL, commit: 'abc123', conclusion: 'success', completedAt: '2026-10-05T12:00:00Z' },
    results,
  };
}

describe('importTestEvidence (NXD-123)', () => {
  let db: Knex;
  let repository: ComposerRepository;
  let service: ComposerService;
  let versionId: string;
  const client: CiEvidenceClient & { getLatestEvidence: jest.Mock } = {
    getLatestEvidence: jest.fn(),
  };

  beforeEach(async () => {
    db = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolver,
      ciEvidenceClient: client,
    });
    const product = await service.createProduct(
      {
        name: 'oee-line-3',
        productType: 'DATA_PRODUCT',
        repositoryUrl: 'https://github.com/pharma-data-factory/oee.git',
      } as any,
      actor,
    );
    const version = await service.createProductVersion(product.id, { version: '1.0' }, actor);
    await service.bindUrsBaseline(version.id, BASELINE, actor);
    versionId = version.id;
  });

  afterEach(async () => {
    await db?.destroy();
  });

  it('records one execution per matched requirement, and reports the rest', async () => {
    client.getLatestEvidence.mockResolvedValue(
      evidence([
        { suite: 'unit', testCase: 't::calc', outcome: 'passed', requirements: ['URS-EPM-001'] },
        { suite: 'unit', testCase: 't::edge', outcome: 'failed', requirements: ['URS-EPM-001', 'URS-EPM-999'] },
        { suite: 'unit', testCase: 't::slow', outcome: 'skipped', requirements: ['URS-EPM-002'] },
        { suite: 'unit', testCase: 't::health', outcome: 'passed', requirements: [] },
      ]),
    );

    const summary = await service.importTestEvidence(versionId, actor);

    expect(client.getLatestEvidence).toHaveBeenCalledWith(
      'https://github.com/pharma-data-factory/oee.git',
    );
    expect(summary).toMatchObject({
      run: { id: 7, url: RUN_URL, commit: 'abc123' },
      imported: 2,
      skipped: 1,
      alreadyRecorded: 0,
      byRequirement: { 'URS-EPM-001': { passed: 1, failed: 1 } },
      uncoveredRequirements: ['URS-EPM-002'],
      unknownRequirements: ['URS-EPM-999'],
    });
    const stored = await repository.listTestExecutions(['rv-URS-EPM-001', 'rv-URS-EPM-002']);
    expect(
      stored.map(e => [e.requirementVersionId, e.testCase, e.status, e.executionArtifactUrl]),
    ).toEqual(
      expect.arrayContaining([
        ['rv-URS-EPM-001', 't::calc', 'PASSED', RUN_URL],
        ['rv-URS-EPM-001', 't::edge', 'FAILED', RUN_URL],
      ]),
    );
    expect(stored).toHaveLength(2);
  });

  it('names the module as the suite and fits long ids to the column', async () => {
    const longCase = `tests/test_api.py::test_${'x'.repeat(300)}`;
    client.getLatestEvidence.mockResolvedValue(
      evidence([
        {
          suite: `tests/${'a'.repeat(300)}.py tests/test_api.py`,
          testCase: longCase,
          outcome: 'passed',
          requirements: ['URS-EPM-001'],
        },
      ]),
    );
    await service.importTestEvidence(versionId, actor);
    const [row] = await repository.listTestExecutions(['rv-URS-EPM-001']);
    expect(row.testSuite).toBe('tests/test_api.py');
    expect(row.testCase.length).toBe(255);
    expect(row.testCase).toMatch(/#[0-9a-f]{12}$/);
    // Re-importing the same run still recognises the shortened id.
    expect(await service.importTestEvidence(versionId, actor)).toMatchObject({
      imported: 0,
      alreadyRecorded: 1,
    });
  });

  it('never records the same CI run twice', async () => {
    client.getLatestEvidence.mockResolvedValue(
      evidence([{ suite: 'unit', testCase: 't::calc', outcome: 'passed', requirements: ['URS-EPM-001'] }]),
    );
    await service.importTestEvidence(versionId, actor);
    const again = await service.importTestEvidence(versionId, actor);
    expect(again).toMatchObject({ imported: 0, alreadyRecorded: 1 });
  });

  it('says why there is nothing to import', async () => {
    client.getLatestEvidence.mockResolvedValue({ available: false, reason: 'no-evidence-artifact' });
    await expect(service.importTestEvidence(versionId, actor)).rejects.toThrow(
      /uploaded no nexora-test-evidence artifact/,
    );
  });

  it('refuses a version with no bound baseline', async () => {
    const product = await service.createProduct(
      { name: 'unbound', productType: 'DATA_PRODUCT', repositoryUrl: 'https://github.com/x/y' } as any,
      actor,
    );
    const version = await service.createProductVersion(product.id, { version: '1.0' }, actor);
    await expect(service.importTestEvidence(version.id, actor)).rejects.toThrow(
      /No URS baseline is bound/,
    );
  });

  it('answers the newest execution per test case per requirement (NXD-124)', async () => {
    client.getLatestEvidence.mockResolvedValue(
      evidence([
        { suite: 'unit', testCase: 't::calc', outcome: 'passed', requirements: ['URS-EPM-001'] },
      ]),
    );
    await service.importTestEvidence(versionId, actor);
    const report = await service.getVersionTestEvidence(versionId);
    expect(report).toMatchObject({ productName: 'oee-line-3', version: '1.0', ursBaselineId: BASELINE });
    expect(report.requirements).toEqual([
      {
        requirementRef: 'URS-EPM-001',
        executions: [
          {
            testSuite: 't',
            testCase: 't::calc',
            status: 'PASSED',
            executedAt: '2026-10-05T12:00:00.000Z',
            executionArtifactUrl: RUN_URL,
          },
        ],
      },
      { requirementRef: 'URS-EPM-002', executions: [] },
    ]);
    const classification = await service.getUrsBaselineGmpClassification(BASELINE);
    expect(classification.versions).toEqual([
      expect.objectContaining({ id: versionId, productName: 'oee-line-3', version: '1.0' }),
    ]);
  });
});


/**
 * NXD-151. The same import, without a person: each product's newest DRAFT
 * version with bound requirements, as `system:ci-evidence-sync`.
 */
describe('syncCiEvidence (NXD-151)', () => {
  let db: Knex;
  let repository: ComposerRepository;
  let service: ComposerService;
  const client: CiEvidenceClient & { getLatestEvidence: jest.Mock } = {
    getLatestEvidence: jest.fn(),
  };

  beforeEach(async () => {
    db = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: resolver,
      ciEvidenceClient: client,
    });
    client.getLatestEvidence.mockReset();
    client.getLatestEvidence.mockResolvedValue(
      evidence([{ suite: 'unit', testCase: 't::calc', outcome: 'passed', requirements: ['URS-EPM-001'] }]),
    );
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function product(name: string, repositoryUrl?: string) {
    return service.createProduct(
      { name, productType: 'DATA_PRODUCT', ...(repositoryUrl ? { repositoryUrl } : {}) } as any,
      actor,
    );
  }

  it('imports into the newest bound DRAFT version only, once, as the sync actor', async () => {
    const p = await product('oee-line-3', 'https://github.com/pharma-data-factory/oee.git');
    const older = await service.createProductVersion(p.id, { version: '1.0' }, actor);
    await service.bindUrsBaseline(older.id, BASELINE, actor);
    // A later draft is the one under development.
    await new Promise(r => setTimeout(r, 5));
    const newer = await service.createProductVersion(p.id, { version: '1.1' }, actor);
    await service.bindUrsBaseline(newer.id, BASELINE, actor);

    const first = await service.syncCiEvidence();
    expect(first.imported).toBe(1);
    expect(first.versions).toEqual([
      expect.objectContaining({ versionId: newer.id, imported: 1, alreadyRecorded: 0 }),
    ]);
    const evidence1 = await service.getVersionTestEvidence(newer.id);
    expect(JSON.stringify(evidence1)).toContain('t::calc');
    // An execution belongs to the requirement version (NXD-123), which both
    // drafts share through one baseline: the older one sees it too. The sync
    // chose the newer one; it did not import twice.
    expect(client.getLatestEvidence).toHaveBeenCalledTimes(1);

    const audit = await db('composer_audit_events').where({ actor: 'system:ci-evidence-sync' }).count({ n: '*' });
    expect(Number(audit[0].n)).toBeGreaterThan(0);

    // The same run again records nothing.
    const second = await service.syncCiEvidence();
    expect(second.imported).toBe(0);
    expect(second.versions[0]).toEqual(expect.objectContaining({ imported: 0, alreadyRecorded: 1 }));
  });

  it('leaves a version past DRAFT alone, and skips products it cannot serve without stopping', async () => {
    const approved = await product('approved-one', 'https://github.com/acme/a');
    const v = await service.createProductVersion(approved.id, { version: '1.0' }, actor);
    await service.bindUrsBaseline(v.id, BASELINE, actor);
    await db('product_versions').where({ id: v.id }).update({ status: 'APPROVED' });

    await product('no-repo');
    const unbound = await product('unbound', 'https://github.com/acme/u');
    await service.createProductVersion(unbound.id, { version: '1.0' }, actor);
    const bound = await product('bound', 'https://github.com/acme/b');
    const bv = await service.createProductVersion(bound.id, { version: '1.0' }, actor);
    await service.bindUrsBaseline(bv.id, BASELINE, actor);

    const result = await service.syncCiEvidence();
    expect(result.versions.map(o => [o.versionId === bv.id, o.skipped ?? 'ok'])).toEqual(
      expect.arrayContaining([
        [false, expect.stringMatching(/No URS baseline is bound/)],
        [true, 'ok'],
      ]),
    );
    expect(result.versions.some(o => o.versionId === v.id)).toBe(false);
    expect(result.imported).toBe(1);
  });
});
