/**
 * The evidence package, which nothing had ever assembled.
 *
 * `NXD-077` shipped `buildEvidencePackage` and its route with no test and no
 * frontend consumer — the third and last of the modules `STATUS.md`
 * §Migration Debt lists as shipped unproven, after the edition resolver
 * (`NXD-081`) and the installation identity (`NXD-082`).
 *
 * This one is different from those two in a way worth stating. Nothing here
 * computes: every part was already readable through some fifteen endpoints,
 * and the aggregator's whole contribution is that they arrive together and
 * scoped to one version. So the assertions are about **completeness and
 * scope**, not about arithmetic — a part silently missing, or a part quietly
 * belonging to a different version, is the only way this can be wrong, and
 * both are invisible to a reader who has nothing to compare against.
 *
 * The `limits` array gets its own assertions. A regulated document that does
 * not say what it fails to prove invites the reader to assume it proves
 * everything, and the signature asymmetry in particular is a position
 * `NXD-077` argued and chose to hold. Removing that line should have to be
 * deliberate.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import { createRouter } from './router';
import { expectRefusedByDatabase } from './__testUtils__/databaseRefusal';
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
const BASELINE_ID = 'urs-baseline-evidence-pkg';

const REQUIREMENTS = [
  {
    id: 'urs-version-pkg-1',
    requirementRef: 'URS-PKG-001',
    title: 'Batch records are retained for ten years',
    statement: 'The solution shall retain batch records for ten years.',
    priority: 'MUST',
    gxpRelevance: 'DIRECT',
    contentHash: 'sha256:urs-version-pkg-1',
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
    requirementSetId: 'urs-set-evidence-pkg',
    solutionName: 'Evidence Package Probe',
    solutionType: 'data-product',
    businessNeed: 'Prove the package carries every part',
    businessCapabilities: ['capability:default/manufacturing'],
    requirements: REQUIREMENTS,
  };
  return {
    resolveApprovedBaseline: jest.fn(async () => reference),
    resolveBaselineContext: jest.fn(async () => context),
  };
}

describe('evidence package', () => {
  let db: Knex;
  let service: ComposerService;

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
  });

  afterEach(async () => {
    await db?.destroy();
  });

  /** A version carrying one of everything the package claims to collect. */
  async function furnishedVersion() {
    const product = await service.createProduct(
      {
        name: 'Evidence Package Product',
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
      { componentType: 'PROCESSING', name: 'batch-record-store' },
      ACTOR,
    );
    const contract = await service.addDataContract(
      component.id,
      {
        namespace: 'evidence',
        name: 'batch-record',
        schemaType: 'JSON_SCHEMA',
      },
      ACTOR,
    );
    await service.bindUrsBaseline(version.id, BASELINE_ID, ACTOR);
    const link = await service.createTraceabilityLink(
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

    return { product, version, component, contract, link, baseline };
  }

  describe('what it collects', () => {
    it('carries every part it claims, for one furnished version', async () => {
      const { product, version, component, contract, baseline } =
        await furnishedVersion();

      const pkg = await service.buildEvidencePackage(version.id);

      // Asserted as one object rather than as ten separate expectations: a
      // part that silently stops being collected is the failure mode here,
      // and a per-field assertion suite is exactly what lets one disappear
      // unnoticed.
      expect({
        productId: pkg.product.id,
        versionId: pkg.version.id,
        ursBaselineId: pkg.ursBaselineId,
        requirementRefs: pkg.requirements.map(r => r.requirementRef),
        componentIds: pkg.components.map(c => c.id),
        contractIds: pkg.contracts.map(c => c.id),
        baselineIds: pkg.baselines.map(b => b.id),
        hasCoverage: pkg.coverage !== undefined,
        hasReleaseGate: typeof pkg.releaseGate.passed === 'boolean',
        auditTrailIsPopulated: pkg.auditTrail.length > 0,
      }).toEqual({
        productId: product.id,
        versionId: version.id,
        ursBaselineId: BASELINE_ID,
        requirementRefs: ['URS-PKG-001'],
        componentIds: [component.id],
        contractIds: [contract.id],
        baselineIds: [baseline.id],
        hasCoverage: true,
        hasReleaseGate: true,
        auditTrailIsPopulated: true,
      });
    });

    it('reports an unfurnished version as empty rather than refusing it', async () => {
      // A package that reports nothing is a legitimate answer about a version
      // that holds nothing, and it must be distinguishable from a failure.
      const product = await service.createProduct(
        {
          name: 'Bare Product',
          productType: 'DATA_PRODUCT',
          owner: 'group:default/platform-team',
        },
        ACTOR,
      );
      const version = await service.createProductVersion(
        product.id,
        { version: '0.1' },
        ACTOR,
      );

      const pkg = await service.buildEvidencePackage(version.id);

      expect({
        requirements: pkg.requirements,
        components: pkg.components,
        contracts: pkg.contracts,
        functionalSpecifications: pkg.functionalSpecifications,
        traceabilityLinks: pkg.traceabilityLinks,
        baselines: pkg.baselines,
        ursBaselineId: pkg.ursBaselineId,
      }).toEqual({
        requirements: [],
        components: [],
        contracts: [],
        functionalSpecifications: [],
        traceabilityLinks: [],
        baselines: [],
        ursBaselineId: undefined,
      });
      expect(pkg.releaseGate.passed).toBe(false);
    });

    it('sorts the audit trail oldest first and merges both entity trails', async () => {
      const { product, version } = await furnishedVersion();
      const pkg = await service.buildEvidencePackage(version.id);

      const timestamps = pkg.auditTrail.map(e => e.timestamp.getTime());
      expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);

      // The product's own acts and the version's are one trail here. Reading
      // only the version's would hide the act that created the product.
      const entityIds = new Set(pkg.auditTrail.map(e => e.entityId));
      expect(entityIds.has(product.id)).toBe(true);
      expect(entityIds.has(version.id)).toBe(true);
    });

    it('stamps generatedAt, because a derived reading is only true when it was taken', async () => {
      const before = Date.now();
      const { version } = await furnishedVersion();
      const pkg = await service.buildEvidencePackage(version.id);

      expect(pkg.generatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(pkg.generatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('scope', () => {
    it('carries only this version traceability, not the whole product', async () => {
      // The one non-trivial thing the aggregator does. `listTraceabilityLinks`
      // returns every link in the database and the package filters it down;
      // `getProductTraceability` deliberately does not, because it answers a
      // different question. Getting this backwards puts another version's
      // evidence into this version's attestation, which in a regulated record
      // is worse than omitting it.
      const first = await furnishedVersion();

      const second = await service.createProductVersion(
        first.product.id,
        { version: '2.0' },
        ACTOR,
      );
      const otherComponent = await service.addProductComponent(
        second.id,
        { componentType: 'PROCESSING', name: 'second-version-component' },
        ACTOR,
      );
      await service.bindUrsBaseline(second.id, BASELINE_ID, ACTOR);
      const otherLink = await service.createTraceabilityLink(
        {
          sourceType: 'URS_REQUIREMENT_VERSION',
          sourceId: REQUIREMENTS[0].id,
          relationshipType: 'IMPLEMENTS',
          targetType: 'PRODUCT_COMPONENT',
          targetId: otherComponent.id,
        },
        ACTOR,
      );

      const pkg = await service.buildEvidencePackage(first.version.id);

      expect(pkg.traceabilityLinks.map(l => l.id)).toEqual([first.link.id]);
      expect(pkg.traceabilityLinks.map(l => l.id)).not.toContain(otherLink.id);
      expect(pkg.components.map(c => c.id)).toEqual([first.component.id]);
    });

    it('carries only this version contracts, across two components', async () => {
      const first = await furnishedVersion();
      const second = await service.createProductVersion(
        first.product.id,
        { version: '2.0' },
        ACTOR,
      );
      const otherComponent = await service.addProductComponent(
        second.id,
        { componentType: 'PROCESSING', name: 'other-store' },
        ACTOR,
      );
      const otherContract = await service.addDataContract(
        otherComponent.id,
        {
          namespace: 'evidence',
          name: 'other-record',
          schemaType: 'JSON_SCHEMA',
        },
        ACTOR,
      );

      const pkg = await service.buildEvidencePackage(first.version.id);

      expect(pkg.contracts.map(c => c.id)).toEqual([first.contract.id]);
      expect(pkg.contracts.map(c => c.id)).not.toContain(otherContract.id);
    });
  });

  describe('limits', () => {
    it('states what it does not prove, in the document itself', async () => {
      const { version } = await furnishedVersion();
      const pkg = await service.buildEvidencePackage(version.id);

      expect(pkg.limits.length).toBeGreaterThan(0);
    });

    it('declares the signature asymmetry rather than letting it be inferred', async () => {
      // NXD-077 argued this and chose to hold the asymmetry rather than close
      // it: a URS baseline carries a Part 11 signature bound to a content
      // hash, a product approval carries actor, timestamp and a
      // segregation-of-duties refusal. Printing the two side by side without
      // saying so is the thing an auditor would rightly object to. Removing
      // this line should be a decision, so it is a test.
      const { version } = await furnishedVersion();
      const pkg = await service.buildEvidencePackage(version.id);

      expect(pkg.limits.join('\n')).toMatch(
        /not electronically\s+signed|electronically signed/,
      );
      expect(pkg.limits.join('\n')).toContain('21 CFR Part 11');
    });

    it.each([
      ['deployment', /Deployment is not recorded/],
      ['cross-plugin correlation', /not across plugins/],
      ['being a derived reading', /derived reading, not a frozen export/],
    ])('declares the limit about %s', async (_label, pattern) => {
      const { version } = await furnishedVersion();
      const pkg = await service.buildEvidencePackage(version.id);

      expect(pkg.limits.join('\n')).toMatch(pattern);
    });
  });

  describe('refusals', () => {
    it('refuses a version that does not exist, naming it', async () => {
      await expect(
        service.buildEvidencePackage('no-such-version'),
      ).rejects.toThrow('Product version no-such-version not found');
    });

    it('cannot reach the orphaned-version guard, because the schema forbids the state', async () => {
      // `buildEvidencePackage` refuses a version whose product is missing,
      // with its own message. That branch turns out to be unreachable: the
      // foreign key refuses the delete, so there is no orphan to find. Written
      // down rather than deleted, because "this guard is defence in depth
      // behind a constraint" and "this guard is dead code" look identical from
      // the source, and only one of them is fine to remove.
      const { product } = await furnishedVersion();

      // Through the helper, not `.rejects.toThrow()`. The refusal comes from
      // better-sqlite3, a native module whose binding is loaded once per jest
      // worker, so the SqliteError carries the Error intrinsic of whichever
      // realm loaded it first and `toThrow` reports "Received function did
      // not throw" while the constraint fired correctly. This suite was
      // written with the bare form on 2026-09-29 and failed its first full
      // run the next day, passing in isolation every time — the third
      // recurrence of NXD-016, after identityConstraints and
      // productRequirements.
      await expectRefusedByDatabase(
        db('products').where({ id: product.id }).delete(),
        /FOREIGN KEY constraint failed/,
      );
    });
  });

  describe('over HTTP', () => {
    let app: express.Express;

    beforeEach(async () => {
      const router = await createRouter({
        logger: mockLogger,
        httpAuth: {
          credentials: jest.fn(async () => ({
            principal: { userEntityRef: ACTOR },
          })),
        } as never,
        // The route is gated on `product.read`. Omitting the permission
        // service does not make the route open — `authorize` refuses when it
        // is absent — so a stub that allows is what exercises the route
        // rather than the refusal.
        permissions: {
          authorize: jest.fn(async () => [{ result: AuthorizeResult.ALLOW }]),
        } as never,
        service,
        llmEnabled: false,
      } as never);
      app = express();
      app.use(router);
    });

    async function get(urlPath: string) {
      const server = await listenOnFetchablePort(app);
      try {
        const response = await fetch(`${server.url}${urlPath}`);
        const text = await response.text();
        return {
          status: response.status,
          body: text ? JSON.parse(text) : undefined,
        };
      } finally {
        await server.close();
      }
    }

    it('answers 200 with the package', async () => {
      const { version } = await furnishedVersion();

      const response = await get(`/versions/${version.id}/evidence-package`);

      expect(response.status).toBe(200);
      expect(response.body.version.id).toBe(version.id);
      expect(response.body.limits.length).toBeGreaterThan(0);
    });

    it('answers 404 for a version that does not exist', async () => {
      // Typed, not a 500. The same family of refusals B-1 retyped.
      const response = await get('/versions/no-such-version/evidence-package');

      expect(response.status).toBe(404);
    });
  });
});
