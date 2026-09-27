/**
 * Test evidence, from the wire to the release gate.
 *
 * MVP1-B Slices B-4b and B-4c, audit completion items 2, 3 and 5. Until
 * this path existed, nothing on the normal route could mark a requirement
 * verified, so `coverage.verified` was zero for every product that had not
 * been hand-linked — and the gate did not read coverage anyway. A product
 * could reach RELEASED with no requirement verified at all.
 *
 * **This is the first suite in composer-backend that goes through the
 * router.** Every other one calls the service directly with a hard-coded
 * actor string, which is exactly the gap
 * `docs/engineering/definition-of-done.md` (NXD-053) names as the reason
 * four defects shipped with a fully green suite: "the unit tests exercise
 * the modules directly, so nothing had ever gone through the wiring". The
 * endpoint here is written for a machine that nobody will hand-test, so the
 * wiring — `authorizeService`, `express.json()`, `respondError`'s status
 * mapping — is the part most likely to be wrong and least likely to be
 * noticed.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { AuthenticationError } from '@backstage/errors';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import { createRouter } from './router';
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

const ACTOR = 'user:default/qa';
const APPROVER = 'user:default/approver';
const BASELINE_ID = 'urs-baseline-evidence-1';

const REQUIREMENTS = [
  {
    id: 'urs-version-ev-1',
    requirementRef: 'URS-EV-001',
    title: 'Weighing events arrive within 2 seconds',
    statement: 'The solution shall ingest weighing events in near real time.',
    priority: 'MUST',
    gxpRelevance: 'DIRECT',
    contentHash: 'sha256:urs-version-ev-1',
  },
  {
    id: 'urs-version-ev-2',
    requirementRef: 'URS-EV-002',
    title: 'Every event carries its material lot',
    statement: 'The solution shall persist the material lot of each event.',
    priority: 'MUST',
    gxpRelevance: 'DIRECT',
    contentHash: 'sha256:urs-version-ev-2',
  },
];

function resolver(): UrsBaselineResolver {
  const reference: UrsBaselineReference = {
    id: BASELINE_ID,
    status: 'APPROVED',
    baselineVersion: '1.0',
  };
  const context: UrsBaselineContext = {
    baselineId: BASELINE_ID,
    baselineVersion: '1.0',
    requirementSetId: 'urs-set-evidence-1',
    solutionName: 'Evidence Probe',
    solutionType: 'data-product',
    businessNeed: 'Prove that evidence reaches the gate',
    businessCapabilities: ['capability:default/manufacturing'],
    requirements: REQUIREMENTS,
  };
  return {
    resolveApprovedBaseline: jest.fn(async () => reference),
    resolveBaselineContext: jest.fn(async () => context),
  };
}

describe('test evidence ingestion, over HTTP', () => {
  let db: Knex;
  let service: ComposerService;
  let app: express.Express;
  /** Flipped per test to exercise the service/user/anonymous branches. */
  let principal: 'service' | 'user' | 'none';

  beforeEach(async () => {
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

    principal = 'service';
    // Stands in for Backstage's httpAuth. `allow: ['service']` is what
    // authorizeService asks for, and the real implementation throws when the
    // presented credential is not of an allowed kind — so the stub has to
    // throw too, or the 401 path is never exercised.
    const httpAuth = {
      credentials: jest.fn(async (_req: unknown, opts?: { allow?: string[] }) => {
        const allow = opts?.allow ?? [];
        if (principal === 'none' || !allow.includes(principal)) {
          // The real httpAuth throws this type, and respondError maps it by
          // `instanceof`. A look-alike with the right `name` is what made
          // this assertion pass against a 500 the first time round.
          throw new AuthenticationError(
            `No ${allow.join(' or ')} credentials presented`,
          );
        }
        return principal === 'service'
          ? { principal: { subject: 'release-pipeline' } }
          : { principal: { userEntityRef: ACTOR } };
      }),
    };

    const router = await createRouter({
      logger: mockLogger,
      httpAuth: httpAuth as never,
      permissions: undefined,
      service,
      llmEnabled: false,
    } as never);
    app = express();
    app.use(router);
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function post(urlPath: string, body: unknown) {
    const server = await listenOnFetchablePort(app);
    try {
      const response = await fetch(`${server.url}${urlPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: text ? JSON.parse(text) : undefined,
      };
    } finally {
      await server.close();
    }
  }

  /** A RELEASE_CANDIDATE bound to the baseline, with one traced component. */
  async function releaseCandidate() {
    const product = await service.createProduct(
      {
        name: 'Evidence Probe Product',
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
      },
      ACTOR,
    );
    await service.updateProduct(
      product.id,
      {
        owner: 'group:default/platform-team',
        dataClassification: 'CONFIDENTIAL',
        gxpRelevance: 'DIRECT',
        criticality: 'HIGH',
      },
      ACTOR,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      ACTOR,
    );
    const component = await service.addProductComponent(
      version.id,
      { componentType: 'PROCESSING', name: 'weighing-ingest' },
      ACTOR,
    );
    await service.bindUrsBaseline(version.id, BASELINE_ID, ACTOR);

    // One IMPLEMENTS link so UNTRACED_COMPONENT is cleared and the coverage
    // blocker is the only traceability signal left in the list.
    await service.createTraceabilityLink(
      {
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: REQUIREMENTS[0].id,
        relationshipType: 'IMPLEMENTS',
        targetType: 'PRODUCT_COMPONENT',
        targetId: component.id,
      },
      ACTOR,
    );

    const baseline = await service.createProductBaseline(
      version.id,
      { baselineVersion: '1.0' },
      ACTOR,
    );
    await service.approveProductBaseline(baseline.id, APPROVER);
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'APPROVED' },
      APPROVER,
    );
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'RELEASE_CANDIDATE' },
      APPROVER,
    );
    return { product, version, component };
  }

  const result = (requirementVersionId: string, status: string, extra = {}) => ({
    requirementVersionId,
    testSuite: 'integration',
    testCase: 'ingests a weighing event',
    status,
    ...extra,
  });

  /**
   * An explicit run time, minutes apart.
   *
   * Two runs of one case inside the same millisecond is a real possibility
   * over a fast loopback, and `latestExecutionPerCase` would then be
   * deciding on a tie-break rather than on the rule under test. CI knows
   * when its test ran and sends it; so does this.
   */
  const at = (minute: number) =>
    new Date(Date.UTC(2026, 8, 27, 10, minute, 0)).toISOString();

  it('walks the whole path: blocked, verified, released, revoked', async () => {
    const { version } = await releaseCandidate();

    // 1. Bound, but nothing verified. This is the state that used to pass.
    const start = await service.checkReleaseGate(version.id);
    const startCodes = start.blockers.map(b => b.code);
    expect(startCodes).toContain('INCOMPLETE_TRACEABILITY');
    expect(startCodes).not.toContain('UNTRACED_COMPONENT');
    const blocker = start.blockers.find(
      b => b.code === 'INCOMPLETE_TRACEABILITY',
    );
    // The message has to be actionable, not just present.
    expect(blocker?.message).toContain('0 of 2');
    expect(blocker?.message).toContain('URS-EV-001');
    expect(blocker?.message).toContain('URS-EV-002');

    // 2. First requirement passes.
    const first = await post(
      '/test-executions',
      result(REQUIREMENTS[0].id, 'PASSED', {
        executedAt: at(1),
        executionArtifactUrl: 'https://ci.example.com/runs/1/report.xml',
      }),
    );
    expect(first.status).toBe(201);
    expect(first.body.execution.id).toBeTruthy();
    // The link is derived, not requested — that is the whole point of B-4b.
    expect(first.body.verifiedByLinkId).toBeTruthy();

    const half = await service.getRequirementCoverage(version.id);
    expect(half.verified).toBe(1);
    expect(half.total).toBe(2);
    expect(
      half.byRequirement.find(r => r.requirementRef === 'URS-EV-001')
        ?.executions,
    ).toHaveLength(1);

    const stillBlocked = await service.checkReleaseGate(version.id);
    const stillMessage = stillBlocked.blockers.find(
      b => b.code === 'INCOMPLETE_TRACEABILITY',
    )?.message;
    expect(stillMessage).toContain('1 of 2');
    expect(stillMessage).toContain('URS-EV-002');
    expect(stillMessage).not.toContain('URS-EV-001');

    // 3. Second requirement passes — coverage complete.
    const second = await post(
      '/test-executions',
      result(REQUIREMENTS[1].id, 'PASSED', {
        testCase: 'persists the material lot',
        executedAt: at(2),
      }),
    );
    expect(second.status).toBe(201);

    const full = await service.getRequirementCoverage(version.id);
    expect(full.verified).toBe(2);

    const open = await service.checkReleaseGate(version.id);
    expect(open.blockers.map(b => b.code)).not.toContain(
      'INCOMPLETE_TRACEABILITY',
    );

    // 4. A later failing run of the same case revokes it. This is the
    //    assertion that proves the rule rather than describing it: without
    //    latest-per-case the passing row above would still be found and the
    //    gate would stay open on a product whose test now fails.
    const failing = await post(
      '/test-executions',
      result(REQUIREMENTS[1].id, 'FAILED', {
        testCase: 'persists the material lot',
        executedAt: at(3),
      }),
    );
    expect(failing.status).toBe(201);
    // No link for a failure, and the earlier one is not deleted.
    expect(failing.body.verifiedByLinkId).toBeUndefined();

    const revoked = await service.getRequirementCoverage(version.id);
    expect(revoked.verified).toBe(1);
    expect(
      revoked.byRequirement.find(r => r.requirementRef === 'URS-EV-002')
        ?.executions.map(e => e.status),
    ).toEqual(['FAILED']);

    const blockedAgain = await service.checkReleaseGate(version.id);
    expect(blockedAgain.blockers.map(b => b.code)).toContain(
      'INCOMPLETE_TRACEABILITY',
    );

    // 5. A re-run that passes brings it back. Evidence is current, not
    //    one-way.
    const repaired = await post(
      '/test-executions',
      result(REQUIREMENTS[1].id, 'PASSED', {
        testCase: 'persists the material lot',
        executedAt: at(4),
      }),
    );
    expect(repaired.status).toBe(201);
    const healed = await service.getRequirementCoverage(version.id);
    expect(healed.verified).toBe(2);
  });

  it('refuses to release while a requirement is unverified', async () => {
    const { version } = await releaseCandidate();

    await expect(
      service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED' },
        APPROVER,
      ),
    ).rejects.toThrow(/INCOMPLETE_TRACEABILITY/);
  });

  describe('refusals', () => {
    it('answers 404 for a requirement in no bound baseline', async () => {
      await releaseCandidate();
      const response = await post(
        '/test-executions',
        result('urs-version-that-does-not-exist', 'PASSED'),
      );
      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/bound\s+URS baseline snapshot/);
    });

    it('answers 400 for a status outside the vocabulary', async () => {
      await releaseCandidate();
      const response = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'SKIPPED'),
      );
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Unsupported status: SKIPPED/);
    });

    it('answers 400 and names every missing field at once', async () => {
      const response = await post('/test-executions', {});
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/requirementVersionId is required/);
      expect(response.body.error).toMatch(/testSuite is required/);
      expect(response.body.error).toMatch(/status is required/);
    });

    it('answers 400 for an artifact url nobody else can open', async () => {
      await releaseCandidate();
      const response = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'PASSED', {
          executionArtifactUrl: 'artifacts/report.xml',
        }),
      );
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/absolute http\(s\) URL/);
    });

    // The endpoint is for CI. A logged-in human is not a service principal,
    // and authorizeService asks for one specifically.
    it('answers 401 for a user principal and for no credentials', async () => {
      await releaseCandidate();

      principal = 'user';
      const asUser = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'PASSED'),
      );
      expect(asUser.status).toBe(401);

      principal = 'none';
      const anonymous = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'PASSED'),
      );
      expect(anonymous.status).toBe(401);
    });
  });

  describe('audit correlation', () => {
    it('writes the ingestion and the derived link under one id', async () => {
      await releaseCandidate();
      const response = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'PASSED'),
      );
      expect(response.status).toBe(201);

      const rows = await db('composer_audit_events')
        .whereIn('event_type', [
          'TEST_EXECUTION_INGESTED',
          'TRACEABILITY_LINK_CREATED',
        ])
        .select();
      const ingested = rows.filter(
        (r: any) => r.event_type === 'TEST_EXECUTION_INGESTED',
      );
      expect(ingested).toHaveLength(1);
      const derived = rows.find(
        (r: any) =>
          r.event_type === 'TRACEABILITY_LINK_CREATED' &&
          r.correlation_id === ingested[0].correlation_id,
      );
      expect(derived).toBeDefined();
    });

    // NXD-065 left this open: the id is minted at a service boundary and no
    // HTTP header carried one, so one CI run posting twelve results produced
    // twelve unrelated operations. A caller may now supply it.
    it('adopts a correlation id supplied by the caller', async () => {
      await releaseCandidate();
      await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'PASSED', {
          correlationId: 'ci-run-4711',
        }),
      );
      await post(
        '/test-executions',
        result(REQUIREMENTS[1].id, 'PASSED', {
          testCase: 'persists the material lot',
          correlationId: 'ci-run-4711',
        }),
      );

      const executions = await db('test_executions').select();
      expect(executions).toHaveLength(2);
      expect(executions.every((e: any) => e.correlation_id === 'ci-run-4711')).toBe(
        true,
      );

      const events = await db('composer_audit_events')
        .where({ correlation_id: 'ci-run-4711' })
        .select();
      // Two ingestions and two derived links, one operation.
      expect(events).toHaveLength(4);
    });

    it('refuses an empty correlation id rather than correlating on ""', async () => {
      await releaseCandidate();
      const response = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, 'PASSED', { correlationId: '   ' }),
      );
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/correlationId, when present/);
    });
  });

  it('keeps every run, because a re-run is evidence and not a correction', async () => {
    await releaseCandidate();
    for (const status of ['PASSED', 'FAILED', 'PASSED']) {
      const response = await post(
        '/test-executions',
        result(REQUIREMENTS[0].id, status),
      );
      expect(response.status).toBe(201);
    }
    const rows = await db('test_executions')
      .where({ requirement_version_id: REQUIREMENTS[0].id })
      .select();
    expect(rows).toHaveLength(3);
  });
});
