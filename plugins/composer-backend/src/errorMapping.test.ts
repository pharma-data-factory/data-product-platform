/**
 * What a refusal looks like from outside the process.
 *
 * Audit completion item 7. `service.ts` threw seventeen bare `Error`s, and
 * `respondError` has no branch for one — so a caller asking for a product
 * version that does not exist, or naming a component nothing, or attempting
 * a transition the state machine forbids, was told **"Internal server
 * error"**. That is the wording `ae62aa4` went after on the URS side: three
 * correct refusals that read as "the platform is broken".
 *
 * Typing the throw is only half of it. The half that can regress silently is
 * the mapping, because every service-level test asserts on a thrown object
 * and would keep passing if `respondError` lost a branch tomorrow. So this
 * suite goes over HTTP and asserts the number the caller actually receives.
 *
 * Kept separate from `testEvidenceIngestion.test.ts`: that one walks a
 * journey, this one is a table of refusals. Mixing them would bury both.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { AuthenticationError } from '@backstage/errors';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import { createRouter } from './router';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const ACTOR = 'user:default/engineer';
/** Separation of duties: the author of a version may not approve it. */
const APPROVER = 'user:default/approver';

describe('error mapping, as the caller sees it', () => {
  let db: Knex;
  let service: ComposerService;
  let app: express.Express;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    // No llmClient: the AI endpoints are off, which is the shipped default
    // (`composer.ai.enabled: false`) and the state the 501 branch is for.
    service = new ComposerService({ logger: mockLogger, repository });

    const httpAuth = {
      credentials: jest.fn(async (_req: unknown, opts?: { allow?: string[] }) => {
        if (!(opts?.allow ?? []).includes('user')) {
          throw new AuthenticationError('No service credentials presented');
        }
        return { principal: { userEntityRef: ACTOR } };
      }),
    };
    const permissions = {
      authorize: jest.fn(async (requests: unknown[]) =>
        requests.map(() => ({ result: AuthorizeResult.ALLOW })),
      ),
    };

    const router = await createRouter({
      logger: mockLogger,
      httpAuth: httpAuth as never,
      permissions: permissions as never,
      service,
      llmEnabled: false,
    } as never);
    app = express();
    app.use(router);
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function call(method: 'POST' | 'GET', urlPath: string, body?: unknown) {
    const server = await listenOnFetchablePort(app);
    try {
      const response = await fetch(`${server.url}${urlPath}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
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

  async function draftVersion() {
    const product = await service.createProduct(
      { name: `Mapping Probe ${Math.random()}`, productType: 'DATA_PRODUCT' },
      ACTOR,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      ACTOR,
    );
    return { product, version };
  }

  describe('404 — the entity is not there', () => {
    it('answers 404 for a version of a product that does not exist', async () => {
      const response = await call('POST', '/products/no-such-product/versions', {});
      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/Product no-such-product not found/);
    });

    it('answers 404 for a component on a version that does not exist', async () => {
      const response = await call('POST', '/versions/no-such-version/components', {
        componentType: 'API',
        name: 'orphan',
      });
      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/Product version no-such-version not found/);
    });

    it('answers 404 for a baseline on a version that does not exist', async () => {
      const response = await call('POST', '/versions/no-such-version/baselines', {});
      expect(response.status).toBe(404);
    });

    it('answers 404 for the release gate of a version that does not exist', async () => {
      const response = await call('GET', '/versions/no-such-version/release-gate');
      expect(response.status).toBe(404);
    });

    it('answers 404 for approving a baseline that does not exist', async () => {
      const response = await call('POST', '/baselines/no-such-baseline/approve', {});
      expect(response.status).toBe(404);
    });
  });

  describe('400 — the caller sent something unusable', () => {
    it('answers 400 for a component with no name', async () => {
      const { version } = await draftVersion();
      const response = await call('POST', `/versions/${version.id}/components`, {
        componentType: 'API',
        name: '   ',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Component name is required/);
    });
  });

  describe('409 — the state does not permit it', () => {
    it('answers 409 for a transition the state machine forbids', async () => {
      const { version } = await draftVersion();
      const response = await call('POST', `/versions/${version.id}/transition`, {
        targetStatus: 'RELEASED',
      });
      expect(response.status).toBe(409);
      expect(response.body.error).toMatch(/Invalid transition from DRAFT to RELEASED/);
    });

    // A standing blocker is the gate doing its job. Answering 500 said the
    // opposite. Reaching RELEASE_CANDIDATE first is what makes the
    // transition legal and the *gate* the thing that refuses.
    it('answers 409 when the release gate still has blockers', async () => {
      const { version } = await draftVersion();
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

      const response = await call('POST', `/versions/${version.id}/transition`, {
        targetStatus: 'RELEASED',
      });
      expect(response.status).toBe(409);
      expect(response.body.error).toMatch(/Release gate failed/);
    });
  });

  describe('501 — the capability is switched off', () => {
    // Off is the shipped default. A caller hitting one of these got
    // "Internal server error", which invites a bug report for a setting.
    it('answers 501 for AI component suggestions', async () => {
      const response = await call('POST', '/ai/suggest-components', {
        productName: 'X',
        description: 'Y',
        domain: 'manufacturing',
        availableComponents: [],
      });
      expect(response.status).toBe(501);
      expect(response.body.error).toMatch(/AI suggestions are not enabled/);
    });

    it('answers 501 for AI product analysis', async () => {
      const response = await call('POST', '/ai/analyze-product', {
        question: 'What does this product do?',
        productContext: { entityRef: 'component:default/x' },
      });
      expect(response.status).toBe(501);
    });
  });

  // The whole point of the exercise, stated as one assertion: nothing a
  // caller can do to these routes should produce a 500. A 500 means the
  // platform failed, and none of the above is a platform failure.
  it('never answers 500 for a refusal a caller caused', async () => {
    const { version } = await draftVersion();
    const attempts = [
      ['POST', '/products/no-such-product/versions', {}],
      ['POST', '/versions/no-such-version/components', { componentType: 'API', name: 'x' }],
      ['POST', '/versions/no-such-version/baselines', {}],
      ['GET', '/versions/no-such-version/release-gate', undefined],
      ['POST', '/baselines/no-such-baseline/approve', {}],
      ['POST', `/versions/${version.id}/components`, { componentType: 'API', name: '' }],
      ['POST', `/versions/${version.id}/transition`, { targetStatus: 'RELEASED' }],
      ['POST', '/ai/suggest-components', {
        productName: 'X', description: 'Y', domain: 'd', availableComponents: [],
      }],
    ] as const;

    for (const [method, urlPath, body] of attempts) {
      const response = await call(method, urlPath, body);
      expect({ urlPath, status: response.status }).toEqual({
        urlPath,
        status: expect.any(Number),
      });
      expect(response.status).not.toBe(500);
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
  });
});
