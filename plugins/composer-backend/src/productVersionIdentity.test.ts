/**
 * ProductVersion identity invariants.
 *
 * A ProductVersion is the anchor for ProductBaseline, ValidationContext,
 * release identity and — from Phase 4 — dependency and change-impact
 * analysis. Everything downstream assumes that within one Product a version
 * label identifies exactly one version, and that `versionNumber` orders the
 * versions the same way the labels do. These tests pin those two properties.
 *
 * See docs/nexora-transformation/DECISIONS.md, NXD-006.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

describe('ProductVersion identity', () => {
  let db: Knex;
  let service: ComposerService;

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });
  });

  afterAll(async () => {
    await db?.destroy();
  });

  const actor = 'user:default/test-user';
  let productSeq = 0;

  async function newProduct() {
    productSeq += 1;
    return service.createProduct(
      {
        name: `Identity Product ${productSeq}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'NONE',
      },
      actor,
    );
  }

  it('numbers generated versions consecutively from 1', async () => {
    const product = await newProduct();
    const first = await service.createProductVersion(product.id, {}, actor);
    const second = await service.createProductVersion(product.id, {}, actor);

    expect([first.version, second.version]).toEqual(['1.0', '2.0']);
    expect([first.versionNumber, second.versionNumber]).toEqual([1, 2]);
  });

  it('rejects a duplicate version label instead of failing in the database', async () => {
    const product = await newProduct();
    await service.createProductVersion(product.id, { version: '1.0' }, actor);

    // The table has a unique index on (product_id, version). Without a domain
    // check the caller gets a raw driver error, which the router turns into a
    // 500 rather than a client error.
    await expect(
      service.createProductVersion(product.id, { version: '1.0' }, actor),
    ).rejects.toThrow(/already exists/i);
  });

  it('rejects a version label that is not a version', async () => {
    const product = await newProduct();

    // A Product version label identifies a controlled artefact. Free text here
    // ends up in baselines, validation contexts and release records.
    for (const label of ['', '   ', 'latest', 'v1', '1.0.0.0', '-1.0']) {
      await expect(
        service.createProductVersion(product.id, { version: label }, actor),
      ).rejects.toThrow(/version/i);
    }
  });

  it('generates the next label above the highest existing label', async () => {
    const product = await newProduct();
    await service.createProductVersion(product.id, { version: '1.0' }, actor);
    await service.createProductVersion(product.id, { version: '3.0' }, actor);

    // Generating from the row count would produce "3.0" here and collide with
    // the explicit version above. The next label has to clear the highest
    // label that exists, not the number of rows.
    const next = await service.createProductVersion(product.id, {}, actor);
    expect(next.version).toBe('4.0');
  });

  it('never reuses a versionNumber and keeps it strictly increasing', async () => {
    const product = await newProduct();
    const created = [
      await service.createProductVersion(product.id, {}, actor),
      await service.createProductVersion(product.id, { version: '5.2' }, actor),
      await service.createProductVersion(product.id, {}, actor),
      await service.createProductVersion(product.id, { version: '2.7' }, actor),
    ];

    const numbers = created.map(version => version.versionNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(new Set(numbers).size).toBe(numbers.length);

    const labels = created.map(version => version.version);
    expect(new Set(labels).size).toBe(labels.length);

    // listProductVersions orders by version_number, so the ordinal is what
    // callers see as creation order.
    const listed = await service.listProductVersions(product.id);
    expect(listed.map(v => v.version)).toEqual(labels);
  });
});
