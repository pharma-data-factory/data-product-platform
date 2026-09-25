/**
 * What `updateProduct` is able to write.
 *
 * `platform-policy.document.json` makes owner, data classification and GxP
 * relevance obligations on every released product, and `checkReleaseGate`
 * reports each unmet one as `POLICY_OBLIGATION_UNMET`. Two of the three could
 * be written; `dataClassification` could not — `CreateProductRequest` declares
 * it, the column exists, `createProduct` maps it, and the update path simply
 * did not. So a product created without a classification could never acquire
 * one, and the gate asked for something no write path could record.
 *
 * Exactly the defect the comment in `createProduct` describes for
 * `declaredPolicies`, one method further down.
 *
 * Run against SQLite through the real repository, because a mapping omission
 * is only visible once the row is read back.
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

const ACTOR = 'user:default/test-user';

describe('updateProduct', () => {
  let db: Knex;
  let service: ComposerService;
  let seq = 0;

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

  /** A product in the state the Products page creates one: four fields. */
  async function bareProduct() {
    seq += 1;
    return service.createProduct(
      {
        name: `Batch Analytics ${seq}`,
        productType: 'DATA_PRODUCT',
        domain: 'manufacturing',
        description: 'Current batch status',
      },
      ACTOR,
    );
  }

  it('writes the three fields every released product must declare', async () => {
    const created = await bareProduct();
    expect(created.owner).toBeUndefined();
    expect(created.dataClassification).toBeUndefined();
    expect(created.gxpRelevance).toBeUndefined();

    await service.updateProduct(
      created.id,
      {
        owner: 'group:default/platform-team',
        dataClassification: 'CONFIDENTIAL',
        gxpRelevance: 'DIRECT',
        criticality: 'HIGH',
      },
      ACTOR,
    );

    const stored = await service.getProduct(created.id);
    expect(stored).toMatchObject({
      owner: 'group:default/platform-team',
      dataClassification: 'CONFIDENTIAL',
      gxpRelevance: 'DIRECT',
      criticality: 'HIGH',
    });
  });

  it('clears the platform-policy blockers the gate reports', async () => {
    const created = await bareProduct();
    const version = await service.createProductVersion(created.id, {}, ACTOR);

    const before = await service.checkReleaseGate(version.id);
    const policyCodesBefore = before.blockers
      .filter(b => b.code === 'POLICY_OBLIGATION_UNMET')
      .map(b => b.message);
    expect(policyCodesBefore).toHaveLength(3);

    await service.updateProduct(
      created.id,
      {
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        // NONE is an answer, so criticality stays optional.
        gxpRelevance: 'NONE',
      },
      ACTOR,
    );

    const after = await service.checkReleaseGate(version.id);
    expect(
      after.blockers.filter(b => b.code === 'POLICY_OBLIGATION_UNMET'),
    ).toEqual([]);
  });

  it('leaves a field the request does not mention alone', async () => {
    const created = await bareProduct();
    await service.updateProduct(
      created.id,
      { owner: 'group:default/platform-team', dataClassification: 'INTERNAL' },
      ACTOR,
    );

    await service.updateProduct(created.id, { criticality: 'LOW' }, ACTOR);

    const stored = await service.getProduct(created.id);
    expect(stored).toMatchObject({
      owner: 'group:default/platform-team',
      dataClassification: 'INTERNAL',
      criticality: 'LOW',
    });
  });

  it('advances the revision by one per edit', async () => {
    const created = await bareProduct();
    expect(created.revision).toBe(1);

    await service.updateProduct(created.id, { team: 'Platform' }, ACTOR);
    // The service advanced it and the repository incremented it again, so an
    // edit moved the counter by two. A revision that skips counts nothing.
    expect((await service.getProduct(created.id))?.revision).toBe(2);

    await service.updateProduct(created.id, { team: 'Data' }, ACTOR);
    expect((await service.getProduct(created.id))?.revision).toBe(3);
  });

  it('records who changed it', async () => {
    const created = await bareProduct();
    await service.updateProduct(
      created.id,
      { owner: 'group:default/platform-team' },
      ACTOR,
    );

    const stored = await service.getProduct(created.id);
    expect(stored?.updatedBy).toBe(ACTOR);
    // Asserted as "set", not as a Date. `rowToProduct` passes `updated_at`
    // through untouched and better-sqlite3 hands back an epoch number, so the
    // declared `Date` type is a lie under SQLite and true under Postgres.
    // Pre-existing and out of this test's scope — nothing reads the field yet.
    expect(stored?.updatedAt).toBeTruthy();
  });
});
