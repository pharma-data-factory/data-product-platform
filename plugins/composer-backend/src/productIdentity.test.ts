/**
 * The identity Step 2 gives a Product: a repository, and the Catalog entity
 * that describes it.
 *
 * A Product existed twice — a row here, an entity in the Catalog — with nothing
 * in common, so `/products` could not say where the code lives and
 * `/data-products` could not find its governance. The join is written once, by
 * the `nexora:product:create` scaffolder action, at the only moment both
 * identities are in one hand.
 *
 * What is worth testing is not that two columns store strings. It is that the
 * join has exactly **one** answer: the reverse lookup the cross-link depends on
 * is worthless if two products can claim one entity, and the case of an entity
 * ref must not be able to smuggle a second claim past the check. So the
 * constraint is in the database as well as the service (NXD-009), and both are
 * exercised here — the service for the message, the index for the race the
 * service cannot see.
 *
 * Runs against SQLite through the real migration. There is no PostgreSQL
 * harness in this plugin yet (the URS and Validation suites carry that); the
 * expression-index form used here is the one `data_contracts_name_unique`
 * already runs on both engines.
 */

import knex, { Knex } from 'knex';
import { ConflictError, InputError } from '@backstage/errors';
import { expectRefusedByDatabase } from './__testUtils__/databaseRefusal';
import { up } from './db/migrations';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const ACTOR = 'user:default/dana';
const ENTITY = 'component:default/oee-analytics';
const REPO = 'https://github.com/acme/oee-analytics';

describe('Product identity: repository and Catalog entity', () => {
  let db: Knex;
  let service: ComposerService;

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
    const repository = await ComposerRepository.create({
      getClient: () => db,
    });
    service = new ComposerService({
      repository,
      logger: mockLogger,
    } as any);
  });

  afterAll(async () => {
    await db?.destroy();
  });

  let counter = 0;
  const create = (overrides: Record<string, unknown> = {}) => {
    counter += 1;
    return service.createProduct(
      {
        name: `Product ${counter}`,
        productType: 'DATA_PRODUCT',
        ...overrides,
      } as any,
      ACTOR,
    );
  };

  it('stores both fields and reads them back', async () => {
    const product = await create({
      repositoryUrl: REPO,
      catalogEntityRef: ENTITY,
    });

    const reread = await service.getProduct(product.id);
    expect(reread?.repositoryUrl).toBe(REPO);
    expect(reread?.catalogEntityRef).toBe(ENTITY);
  });

  it('finds the product that claims an entity, whatever case it is asked in', async () => {
    const product = await create({
      catalogEntityRef: 'component:default/case-test',
    });

    for (const ref of [
      'component:default/case-test',
      'Component:Default/Case-Test',
    ]) {
      const found = await service.getProductByCatalogEntityRef(ref);
      expect(found?.id).toBe(product.id);
    }
  });

  it('answers null for an entity nothing claims', async () => {
    expect(
      await service.getProductByCatalogEntityRef('component:default/nobody'),
    ).toBeNull();
  });

  it('refuses a second product for the same entity, and names the first', async () => {
    const first = await create({
      catalogEntityRef: 'component:default/claimed',
    });

    await expect(
      create({ catalogEntityRef: 'component:default/claimed' }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      create({ catalogEntityRef: 'component:default/claimed' }),
    ).rejects.toThrow(new RegExp(first.id));
  });

  it('treats a differently-cased ref as the same claim', async () => {
    await create({ catalogEntityRef: 'component:default/cased' });
    // An entity ref is a Catalog identity. Two spellings are one entity, and a
    // check that folds case in the lookup but not in the refusal would let the
    // second claim through and then fail to find either.
    await expect(
      create({ catalogEntityRef: 'Component:default/Cased' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('lets any number of products have no entity at all', async () => {
    // The other three creation paths produce exactly this, and must keep
    // working: NULLs do not collide in a unique index.
    await create();
    await create();
    const { items } = await service.listProducts(100, 0);
    expect(items.filter(p => !p.catalogEntityRef).length).toBeGreaterThan(1);
  });

  it('is enforced by the database, not only by the service', async () => {
    await create({ catalogEntityRef: 'component:default/racer' });

    // Straight to the table, the way a second concurrent request would arrive
    // after both had passed the service check.
    // The helper takes the promise, not a thunk: awaiting a function that is
    // never called reads as "the database accepted it", which is exactly the
    // false pass it exists to prevent.
    await expectRefusedByDatabase(
      db('products').insert({
        id: 'racing-row',
        name: 'Racer',
        product_type: 'DATA_PRODUCT',
        lifecycle: 'EXPERIMENTAL',
        status: 'ACTIVE',
        catalog_entity_ref: 'component:default/racer',
        created_by: ACTOR,
        created_at: new Date(),
        revision: 1,
      }),
      /products_catalog_entity_ref_unique|UNIQUE/i,
    );
  });

  it('refuses a ref that is not a full entity reference', async () => {
    for (const bad of ['oee-analytics', 'component:oee', 'component:a/b/c']) {
      await expect(
        create({ catalogEntityRef: bad }),
      ).rejects.toBeInstanceOf(InputError);
    }
  });

  it('refuses a repository that is not an http(s) URL', async () => {
    // The value is rendered as a link and handed to a developer to clone, so
    // the scheme is the check. The script URL is assembled rather than written
    // out because the lint rule that forbids one in source does not know the
    // difference between using it and refusing it.
    const scriptUrl = ['java', 'script:alert(1)'].join('');
    for (const bad of [scriptUrl, 'ftp://example.com/repo', 'not-a-url']) {
      await expect(
        create({ repositoryUrl: bad }),
      ).rejects.toBeInstanceOf(InputError);
    }
  });

  it('persists both fields through the update path too', async () => {
    // The class of defect NXD-058 found twice in updateProduct: a column that
    // exists, is requested, and is never mapped.
    const product = await create();

    await service.updateProduct(
      product.id,
      { repositoryUrl: REPO, catalogEntityRef: 'component:default/attached' },
      ACTOR,
    );

    const reread = await service.getProduct(product.id);
    expect(reread?.repositoryUrl).toBe(REPO);
    expect(reread?.catalogEntityRef).toBe('component:default/attached');
  });

  it('lets a product keep its own entity across an unrelated edit', async () => {
    const product = await create({
      catalogEntityRef: 'component:default/keeps-its-own',
    });

    await service.updateProduct(product.id, { domain: 'manufacturing' }, ACTOR);
    const reread = await service.getProduct(product.id);
    expect(reread?.catalogEntityRef).toBe('component:default/keeps-its-own');

    // And re-stating the same ref is not a conflict with itself.
    await service.updateProduct(
      product.id,
      { catalogEntityRef: 'component:default/keeps-its-own' },
      ACTOR,
    );
    expect((await service.getProduct(product.id))?.revision).toBe(3);
  });
});
