/**
 * ProductBaseline identity invariants.
 *
 * A ValidationContext binds the exact validated candidate, and a
 * ProductBaseline is part of that binding. Two baselines of one ProductVersion
 * sharing a label make the validated candidate ambiguous, which is the one
 * thing a baseline exists to prevent.
 *
 * Unlike product_versions, product_baselines has no unique index, so nothing
 * caught a duplicate at all — it was simply stored twice.
 *
 * The rule matches the one the URS side already reached: a baseline label is
 * checked for presence and uniqueness, not for format, because it often has to
 * match a document number in an external QMS.
 *
 * See docs/nexora-transformation/DECISIONS.md, NXD-007.
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

describe('ProductBaseline identity', () => {
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
  let seq = 0;

  async function newProductVersion() {
    seq += 1;
    const product = await service.createProduct(
      {
        name: `Baseline Product ${seq}`,
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'NONE',
      },
      actor,
    );
    const version = await service.createProductVersion(product.id, {}, actor);
    await service.addProductComponent(
      version.id,
      { componentType: 'SOURCE', name: 'Source' },
      actor,
    );
    return version;
  }

  it('rejects a duplicate baseline label for the same product version', async () => {
    const version = await newProductVersion();
    await service.createProductBaseline(
      version.id,
      { baselineVersion: 'QMS-DOC-4471' },
      actor,
    );

    await expect(
      service.createProductBaseline(
        version.id,
        { baselineVersion: 'QMS-DOC-4471' },
        actor,
      ),
    ).rejects.toThrow(/already exists/i);
  });

  it('treats labels differing only in case as the same label', async () => {
    const version = await newProductVersion();
    await service.createProductBaseline(
      version.id,
      { baselineVersion: 'Rev-A' },
      actor,
    );

    await expect(
      service.createProductBaseline(
        version.id,
        { baselineVersion: 'rev-a' },
        actor,
      ),
    ).rejects.toThrow(/already exists/i);
  });

  it('requires a label when one is supplied', async () => {
    const version = await newProductVersion();
    await expect(
      service.createProductBaseline(version.id, { baselineVersion: '  ' }, actor),
    ).rejects.toThrow(/required/i);
  });

  it('accepts a QMS document number rather than forcing a version format', async () => {
    const version = await newProductVersion();
    const baseline = await service.createProductBaseline(
      version.id,
      { baselineVersion: 'SOP-1234 Rev B' },
      actor,
    );
    expect(baseline.baselineVersion).toBe('SOP-1234 Rev B');
  });

  it('does not supersede the approved baseline when the request is rejected', async () => {
    const version = await newProductVersion();
    const first = await service.createProductBaseline(
      version.id,
      { baselineVersion: '1.0' },
      actor,
    );
    await service.approveProductBaseline(first.id, actor);

    // Creating a baseline supersedes the approved one. If the label were
    // checked after that write, a rejected request would leave this product
    // version with a superseded baseline and nothing to replace it.
    await expect(
      service.createProductBaseline(
        version.id,
        { baselineVersion: '1.0' },
        actor,
      ),
    ).rejects.toThrow(/already exists/i);

    const reloaded = await service.getProductBaseline(first.id);
    expect(reloaded?.status).toBe('APPROVED');
  });

  it('generates a label above the highest existing one, not from the count', async () => {
    const version = await newProductVersion();
    await service.createProductBaseline(
      version.id,
      { baselineVersion: '1.0' },
      actor,
    );
    await service.createProductBaseline(
      version.id,
      { baselineVersion: '4.0' },
      actor,
    );

    // Counting rows would generate "3.0" here, which is below a baseline that
    // already exists — and after one more baseline it would generate "4.0"
    // and duplicate it outright.
    const generated = await service.createProductBaseline(version.id, {}, actor);
    expect(generated.baselineVersion).toBe('5.0');
  });
});
