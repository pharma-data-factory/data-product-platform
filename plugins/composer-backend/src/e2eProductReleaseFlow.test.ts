/**
 * URS → Product → Release, in one go.
 *
 * Audit completion item 12. Every other suite in this repository proves one
 * joint of this journey. NXD-053 and NXD-059 both record the same lesson
 * from the other direction: each joint was written, routed, tested — and
 * broken, because nothing had ever driven the whole thing end to end. Four
 * defects shipped with a fully green suite for exactly that reason.
 *
 * So this walks it: an approved URS baseline produced by the real URS
 * service against a real PostgreSQL schema, bound to a product, refused by
 * the release gate, satisfied by test evidence posted over HTTP, and
 * released.
 *
 * **What is real and what is not, stated plainly.**
 *
 *  - The URS side is the real `URSService` on a real PostgreSQL schema, with
 *    real PIN re-authentication and the real three-step approval workflow.
 *    A baseline here is APPROVED because it was approved, not because a
 *    fixture says so.
 *  - The Composer side is the real service and the real router, over HTTP
 *    for the ingestion endpoint.
 *  - **The HTTP hop between the two plugins is not exercised.** Composer
 *    reaches URS through `UrsBaselineResolver`, which is the boundary; here
 *    it calls the URS service in-process instead of over the wire. The two
 *    plugins own separate databases and cannot share a process in
 *    production, so a test that wired them directly through their
 *    repositories would prove something false. Substituting at the resolver
 *    is the honest seam: everything either side of it is real, and what is
 *    skipped is one fetch.
 *  - Composer runs on SQLite, its established test pattern. The PostgreSQL
 *    guarantees that matter to it are proved in `db/migrations.postgres.test.ts`.
 *
 * Skips without a database rather than failing, and fails in CI where one is
 * provisioned — the rule NXD-005 set.
 */

import express from 'express';
import knex from 'knex';
import { AuthenticationError } from '@backstage/errors';
import {
  createTestSchema,
  listenOnFetchablePort,
} from '@internal/backend-test-utils';
import type { TestSchema } from '@internal/backend-test-utils';
import { SignatureMeaning, URSStatus } from '@internal/platform-common';
/* eslint-disable @backstage/no-mixed-plugin-imports -- this suite proves the URS → Product → Release journey and drives both sides; it uses the URS package's published API, not its private source */
import {
  URSService,
  PostgresURSRepository,
  SignaturePinReAuth,
  SolutionType,
  GxPRelevance,
  RequirementPriority,
  applyUrsMigrations,
  seedUrsDatabase,
} from '@internal/plugin-urs-composer-backend';
/* eslint-enable @backstage/no-mixed-plugin-imports */
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import { createRouter } from './router';
import type { UrsBaselineResolver } from './urs-baseline-resolver';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const AUTHOR = 'user:default/author';
/** Separation of duties: the author of a version may not approve it. */
const APPROVER = 'user:default/approver';
const PIN = 'signing-pin-e2e';
const CAPABILITY = 'business-capability:make/equipment-performance-management';

/** Reports every reviewing role, so the approval chain is not the subject. */
const CATALOG: any = {
  getEntityByRef: async (ref: string) => ({
    kind: 'User',
    metadata: { name: ref },
    spec: {
      memberOf: [
        'group:default/urs-business-reviewers',
        'group:default/urs-product-managers',
        'group:default/urs-quality-reviewers',
        'group:default/urs-authors',
      ],
    },
  }),
  getEntities: async () => ({ items: [] }),
};

describe('E2E: URS baseline → product → verified release', () => {
  let testDb: TestSchema;
  let dbAvailable = false;

  beforeAll(async () => {
    testDb = await createTestSchema('composer-e2e-product-release', {
      migrate: applyUrsMigrations,
      seed: seedUrsDatabase,
    });
    dbAvailable = testDb.available;
  }, 60000);

  afterAll(async () => {
    await testDb?.dispose();
  }, 60000);

  it('refuses release until every requirement is verified, then allows it', async () => {
    if (!dbAvailable) {
      console.warn(
        'Skipping E2E product release flow: no PostgreSQL. Run ' +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return;
    }

    // ---------------------------------------------------------------- URS
    const ursRepository = new PostgresURSRepository(testDb.db);
    const urs = new URSService({
      logger: mockLogger,
      repository: ursRepository,
      catalog: CATALOG,
    });
    const reauth = new SignaturePinReAuth(ursRepository);
    await reauth.enroll(AUTHOR, PIN);
    await reauth.enroll(APPROVER, PIN);

    const set = await urs.createRequirementSet(
      {
        businessCapabilityRefs: [CAPABILITY],
        businessNeed: 'Capture weighing events from connected balances',
        solutionType: SolutionType.PROJECT,
        solutionName: 'Weighing Event Capture',
      },
      AUTHOR,
    );

    for (const [title, statement] of [
      [
        'Balance events arrive within 2 seconds',
        'The solution shall ingest weighing events in near real time.',
      ],
      [
        'Each event carries its material lot',
        'The solution shall persist the material lot of every event.',
      ],
    ]) {
      await urs.createRequirement(
        set.id,
        {
          title,
          statement,
          priority: RequirementPriority.MUST,
          gxpRelevance: GxPRelevance.DIRECT,
        },
        AUTHOR,
      );
    }

    // DRAFT → IN_REVIEW → REVIEWED → IN_APPROVAL, then a QA signature each.
    // A baseline is releasable only once every version it pins is APPROVED,
    // which is what made this walk impossible before NXD-059.
    for (const status of [
      URSStatus.IN_REVIEW,
      URSStatus.REVIEWED,
      URSStatus.IN_APPROVAL,
    ]) {
      await urs.advanceRequirementSetVersions(set.id, status, AUTHOR);
    }
    for (const version of await urs.getCurrentVersions(set.id)) {
      await urs.signRequirementVersion(
        version.id,
        SignatureMeaning.APPROVED_QA,
        APPROVER,
        PIN,
      );
    }

    const approvedVersions = await urs.getCurrentVersions(set.id);
    expect(approvedVersions).toHaveLength(2);
    expect(approvedVersions.every(v => v.status === URSStatus.APPROVED)).toBe(
      true,
    );

    const ursBaseline = await urs.createBaseline(
      set.id,
      approvedVersions.map(v => v.id),
      '1.0',
      AUTHOR,
    );
    const instance = await urs.submitBaseline(ursBaseline.id, AUTHOR);
    for (const step of instance.steps ?? []) {
      await urs.approveApprovalStep(
        instance.id,
        step.id,
        APPROVER,
        'Approved',
        undefined,
        PIN,
      );
    }
    const released = await urs.getBaseline(ursBaseline.id);
    // Genuinely approved, by the workflow, not by a fixture.
    expect(String(released!.status).toUpperCase()).toBe('APPROVED');

    // ----------------------------------------------------------- Composer
    const composerDb = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await composerDb.raw('select 1');
    const composerRepository = await ComposerRepository.create({
      getClient: () => composerDb,
    });

    // The plugin boundary. In production this is an HTTP call; here it reads
    // the same URS service the steps above drove.
    const resolver: UrsBaselineResolver = {
      resolveApprovedBaseline: async (baselineId: string) => {
        const b = await urs.getBaseline(baselineId);
        if (!b || String(b.status).toUpperCase() !== 'APPROVED') {
          throw new Error(`URS baseline ${baselineId} is not APPROVED`);
        }
        return {
          id: b.id,
          status: 'APPROVED',
          baselineVersion: b.baselineVersion,
        };
      },
      resolveBaselineContext: async (baselineId: string) => {
        const b = await urs.getBaseline(baselineId);
        const rs = await urs.getRequirementSet(b!.requirementSetId);
        const versions = await urs.getCurrentVersions(b!.requirementSetId);
        return {
          baselineId: b!.id,
          baselineVersion: b!.baselineVersion,
          requirementSetId: rs!.id,
          solutionName: rs!.solutionName ?? 'Weighing Event Capture',
          solutionType: 'data-product',
          businessNeed: rs!.businessNeed ?? '',
          businessCapabilities: rs!.businessCapabilityRefs ?? [CAPABILITY],
          requirements: versions.map(v => ({
            id: v.id,
            requirementRef: v.requirementId,
            title: v.title,
            statement: v.statement ?? '',
            priority: v.priority,
            gxpRelevance: v.gxpRelevance,
            contentHash: v.contentHash ?? `sha256:${v.id}`,
          })),
        };
      },
    };

    const composer = new ComposerService({
      logger: mockLogger,
      repository: composerRepository,
      ursBaselineResolver: resolver,
    });

    const httpAuth = {
      credentials: jest.fn(
        async (_req: unknown, opts?: { allow?: string[] }) => {
          if (!(opts?.allow ?? []).includes('service')) {
            throw new AuthenticationError('No service credentials presented');
          }
          return { principal: { subject: 'release-pipeline' } };
        },
      ),
    };
    const router = await createRouter({
      logger: mockLogger,
      httpAuth: httpAuth as never,
      permissions: undefined,
      service: composer,
      llmEnabled: false,
    } as never);
    const app = express();
    app.use(router);

    async function postEvidence(body: unknown) {
      const server = await listenOnFetchablePort(app);
      try {
        const response = await fetch(`${server.url}/test-executions`, {
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

    try {
      const product = await composer.createProduct(
        {
          name: 'Weighing Events Data Product',
          productType: 'DATA_PRODUCT',
          owner: 'group:default/platform-team',
        },
        AUTHOR,
      );
      await composer.updateProduct(
        product.id,
        {
          owner: 'group:default/platform-team',
          dataClassification: 'CONFIDENTIAL',
          gxpRelevance: 'DIRECT',
          criticality: 'HIGH',
        },
        AUTHOR,
      );
      const version = await composer.createProductVersion(
        product.id,
        { version: '1.0' },
        AUTHOR,
      );
      const component = await composer.addProductComponent(
        version.id,
        { componentType: 'PROCESSING', name: 'weighing-ingest' },
        AUTHOR,
      );

      const { requirements } = await composer.bindUrsBaseline(
        version.id,
        ursBaseline.id,
        AUTHOR,
      );
      expect(requirements).toHaveLength(2);

      // Architecture: the component implements both requirements. Clears
      // UNTRACED_COMPONENT so the coverage blocker is the only traceability
      // signal left standing.
      for (const requirement of requirements) {
        await composer.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT_VERSION',
            sourceId: requirement.ursRequirementVersionId,
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          AUTHOR,
        );
      }

      const productBaseline = await composer.createProductBaseline(
        version.id,
        { baselineVersion: '1.0' },
        AUTHOR,
      );
      expect(productBaseline.ursBaselineIds).toEqual([ursBaseline.id]);
      await composer.approveProductBaseline(productBaseline.id, APPROVER);
      await composer.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'APPROVED' },
        APPROVER,
      );
      await composer.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASE_CANDIDATE' },
        APPROVER,
      );

      // ------------------------------------------------- gate refuses
      const blocked = await composer.checkReleaseGate(version.id);
      expect(blocked.passed).toBe(false);
      const blockedCodes = blocked.blockers.map(b => b.code);
      expect(blockedCodes).toContain('INCOMPLETE_TRACEABILITY');
      expect(blockedCodes).not.toContain('UNTRACED_COMPONENT');
      expect(blockedCodes).not.toContain('NO_URS_BASELINE');
      // Approved by the real workflow, so this must not fire.
      expect(blockedCodes).not.toContain('NO_APPROVED_URS_BASELINE');

      await expect(
        composer.transitionProductVersionStatus(
          version.id,
          { targetStatus: 'RELEASED' },
          APPROVER,
        ),
      ).rejects.toThrow(/Release gate failed.*INCOMPLETE_TRACEABILITY/);

      // ------------------------------------------------- CI posts evidence
      let minute = 0;
      for (const requirement of requirements) {
        minute += 1;
        const response = await postEvidence({
          requirementVersionId: requirement.ursRequirementVersionId,
          testSuite: 'integration',
          testCase: `verifies ${requirement.requirementRef}`,
          status: 'PASSED',
          executedAt: new Date(
            Date.UTC(2026, 8, 27, 12, minute, 0),
          ).toISOString(),
          executionArtifactUrl: 'https://ci.example.com/runs/1/report.xml',
          correlationId: 'ci-run-e2e-1',
        });
        expect(response.status).toBe(201);
        expect(response.body.verifiedByLinkId).toBeTruthy();
      }

      const coverage = await composer.getRequirementCoverage(version.id);
      expect(coverage.total).toBe(2);
      expect(coverage.verified).toBe(2);
      expect(coverage.mapped).toBe(2);

      // ------------------------------------------------- gate opens
      const open = await composer.checkReleaseGate(version.id);
      expect(open.blockers.map(b => b.code)).not.toContain(
        'INCOMPLETE_TRACEABILITY',
      );
      expect(open.passed).toBe(true);

      const releasedVersion = await composer.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED' },
        APPROVER,
      );
      expect(releasedVersion.status).toBe('RELEASED');

      // One CI run, one operation in the trail. NXD-065/066.
      const events = await composerDb('composer_audit_events')
        .where({ correlation_id: 'ci-run-e2e-1' })
        .select();
      expect(events.length).toBeGreaterThanOrEqual(4);
    } finally {
      await composerDb.destroy();
    }
  }, 120000);
});
