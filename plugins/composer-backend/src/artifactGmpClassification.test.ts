/**
 * Whether a registry artifact is GMP-relevant, from the Composer products
 * that govern it (NXD-139). Read by the installations store to decide
 * whether installing is an electronic signature.
 */

import express from 'express';
import knex, { Knex } from 'knex';
import { NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { listenOnFetchablePort } from '@internal/backend-test-utils';
import { ComposerRepository } from './repository';
import { createRouter } from './router';
import { ComposerService } from './service';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const AUTHOR = 'user:default/dana-author';

describe('artifact GMP classification (NXD-139)', () => {
  let db: Knex;
  let repository: ComposerRepository;
  let service: ComposerService;

  beforeEach(async () => {
    db = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function governing(artifactRef: string, gxpRelevance?: string) {
    const product = await service.createProduct(
      {
        name: `p-${Math.random()}`,
        productType: 'DATA_PRODUCT',
        ...(gxpRelevance ? { gxpRelevance } : {}),
      } as any,
      AUTHOR,
    );
    const version = await service.createProductVersion(product.id, { version: '1.0' }, AUTHOR);
    await repository.setProductVersionArtifactRef(version.id, artifactRef);
    return product;
  }

  it('answers ungoverned for an artifact no product registered', async () => {
    expect(await service.getArtifactGmpClassification('pharma', 'oee')).toEqual({
      namespace: 'pharma',
      name: 'oee',
      governed: false,
      gmpRelevant: false,
      products: [],
    });
  });

  it('takes the governing product’s relevance, for any version of the artifact', async () => {
    const product = await governing('pharma/oee@1.0.0', 'DIRECT');
    const answer = await service.getArtifactGmpClassification('Pharma', 'OEE');
    expect(answer.governed).toBe(true);
    expect(answer.gmpRelevant).toBe(true);
    expect(answer.products).toEqual([
      { id: product.id, name: product.name, gxpRelevance: 'DIRECT' },
    ]);
  });

  it('only an explicit NONE is not GMP-relevant; unanswered is', async () => {
    await governing('acme/listing@1.0.0', 'NONE');
    expect((await service.getArtifactGmpClassification('acme', 'listing')).gmpRelevant).toBe(false);
    await governing('acme/unanswered@1.0.0');
    expect((await service.getArtifactGmpClassification('acme', 'unanswered')).gmpRelevant).toBe(true);
  });

  // NXD-146: what the registry asks before it publishes.
  it('answers whether a product version registered as exactly this version is released', async () => {
    expect(await service.getArtifactReleaseStatus('pharma', 'oee', '1.0.0')).toEqual({
      namespace: 'pharma',
      name: 'oee',
      version: '1.0.0',
      governed: false,
      released: false,
      productVersions: [],
    });

    const product = await governing('pharma/oee@1.0.0', 'NONE');
    const [pv] = await repository.listProductVersionsForArtifact('pharma', 'oee');
    const unreleased = await service.getArtifactReleaseStatus('Pharma', 'OEE', '1.0.0');
    expect(unreleased).toEqual(
      expect.objectContaining({
        governed: true,
        released: false,
        productVersions: [
          { id: pv.id, productId: product.id, productName: product.name, version: '1.0', status: 'DRAFT' },
        ],
      }),
    );
    // Another version of a governed artifact: governed, and nothing registered as it.
    expect(await service.getArtifactReleaseStatus('pharma', 'oee', '1.1.0')).toEqual(
      expect.objectContaining({ governed: true, released: false, productVersions: [] }),
    );

    await db('product_versions').where({ id: pv.id }).update({ status: 'RELEASED' });
    expect((await service.getArtifactReleaseStatus('pharma', 'oee', '1.0.0')).released).toBe(true);
  });

  it('does not match another artifact sharing a prefix', async () => {
    await governing('pharma/oee-extra@1.0.0', 'DIRECT');
    expect((await service.getArtifactGmpClassification('pharma', 'oee')).governed).toBe(false);
  });
});

describe('GET /artifacts/:namespace/:name/gmp-classification (NXD-139)', () => {
  let db: Knex;
  let server: { url: string; close: () => Promise<void> };
  let principal: 'user' | 'service';
  let decision: (typeof AuthorizeResult)['ALLOW' | 'DENY'];
  let checked: string[];

  beforeEach(async () => {
    db = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    const repository = await ComposerRepository.create({ getClient: () => db });
    const service = new ComposerService({ logger: mockLogger, repository });
    principal = 'user';
    decision = AuthorizeResult.ALLOW;
    checked = [];
    const router = await createRouter({
      logger: mockLogger,
      httpAuth: {
        credentials: async (_req: unknown, opts?: { allow?: string[] }) => {
          if (!(opts?.allow ?? []).includes(principal)) {
            throw new NotAllowedError(`This endpoint does not allow '${principal}' credentials`);
          }
          return principal === 'service'
            ? { principal: { type: 'service', subject: 'plugin:installations' } }
            : { principal: { type: 'user', userEntityRef: AUTHOR } };
        },
      } as never,
      permissions: {
        authorize: async (queries: Array<{ permission: { name: string } }>) => {
          checked.push(...queries.map(q => q.permission.name));
          return queries.map(() => ({ result: decision }));
        },
      } as never,
      service,
    });
    const app = express();
    app.use(router);
    server = await listenOnFetchablePort(app);
  });

  afterEach(async () => {
    await server?.close();
    await db?.destroy();
  });

  it('answers a person with product.read and a service, and refuses a person without', async () => {
    const path = `${server.url}/artifacts/pharma/oee/gmp-classification`;
    const asUser = await fetch(path);
    expect(asUser.status).toBe(200);
    expect(await asUser.json()).toEqual(expect.objectContaining({ governed: false }));
    expect(checked).toEqual(['product.read']);

    principal = 'service';
    expect((await fetch(path)).status).toBe(200);
    expect(checked).toEqual(['product.read']);

    principal = 'user';
    decision = AuthorizeResult.DENY;
    expect((await fetch(path)).status).toBe(403);
  });

  it('serves the release status to the registry as a service, and to a person with product.read (NXD-146)', async () => {
    const path = `${server.url}/artifacts/pharma/oee/versions/1.0.0/release-status`;
    principal = 'service';
    const asService = await fetch(path);
    expect(asService.status).toBe(200);
    expect(await asService.json()).toEqual(
      expect.objectContaining({ version: '1.0.0', governed: false, released: false }),
    );
    expect(checked).toEqual([]);

    principal = 'user';
    expect((await fetch(path)).status).toBe(200);
    expect(checked).toEqual(['product.read']);
    decision = AuthorizeResult.DENY;
    expect((await fetch(path)).status).toBe(403);
  });
});
