/**
 * Database-level enforcement of version and baseline identity.
 *
 * The service refuses duplicates (NXD-006, NXD-007), but an application check
 * is not a constraint: two concurrent creates can both pass it. These indexes
 * are the backstop. The migration refuses to install them over data that
 * already violates them rather than relabelling a controlled identifier.
 *
 * See docs/nexora-transformation/DECISIONS.md, NXD-009.
 */

import knex, { Knex } from 'knex';
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

function freshDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

describe('version and baseline identity constraints', () => {
  /**
   * Runs an insert as a real Promise.
   *
   * A knex QueryBuilder is a lazily-executed thenable, not a Promise. Handing
   * one directly to `expect(...).rejects` made this suite fail intermittently
   * (~60% of full runs) while passing in isolation, with the indexes provably
   * present and the data provably colliding. Awaiting inside an async function
   * removes the ambiguity about when — or whether — the query runs.
   */
  async function insertRow(
    database: Knex,
    table: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    await database(table).insert(values);
  }

  describe('with a migrated database', () => {
    let db: Knex;
    let service: ComposerService;

    beforeAll(async () => {
      db = freshDb();
      const repository = await ComposerRepository.create({
        getClient: () => db,
      });
      service = new ComposerService({ logger: mockLogger, repository });
    });

    afterAll(async () => {
      await db?.destroy();
    });

    const actor = 'user:default/test-user';

    async function seedProductVersion(name: string) {
      const product = await service.createProduct(
        {
          name,
          productType: 'DATA_PRODUCT',
          owner: 'group:default/platform-team',
          dataClassification: 'INTERNAL',
          gxpRelevance: 'NONE',
        },
        actor,
      );
      const version = await service.createProductVersion(product.id, {}, actor);
      return { product, version };
    }

    it('rejects a duplicate version ordinal written behind the service', async () => {
      const { product, version } = await seedProductVersion('Constraint A');

      // Bypassing the service is the point: this is what a concurrent create
      // racing the application-level check would produce.
      await expect(
        insertRow(db, 'product_versions', {
          id: 'forced-duplicate-ordinal',
          product_id: product.id,
          version: '99.0',
          version_number: version.versionNumber,
          status: 'DRAFT',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        }),
      ).rejects.toThrow(/unique/i);
    });

    it('rejects a duplicate baseline label differing only in case', async () => {
      const { version } = await seedProductVersion('Constraint B');
      await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name: 'Source' },
        actor,
      );
      await service.createProductBaseline(
        version.id,
        { baselineVersion: 'Rev-A' },
        actor,
      );

      // The service treats Rev-A and rev-a as one label. The index is on
      // lower(baseline_version) so the database agrees rather than quietly
      // permitting what the service forbids.
      await expect(
        insertRow(db, 'product_baselines', {
          id: 'forced-duplicate-label',
          product_version_id: version.id,
          baseline_version: 'rev-a',
          status: 'DRAFT',
          snapshot: '{}',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        }),
      ).rejects.toThrow(/unique/i);
    });

    it('still allows the same label under a different product version', async () => {
      const a = await seedProductVersion('Constraint C');
      const b = await seedProductVersion('Constraint D');
      for (const { version } of [a, b]) {
        await service.addProductComponent(
          version.id,
          { componentType: 'SOURCE', name: 'Source' },
          actor,
        );
        await service.createProductBaseline(
          version.id,
          { baselineVersion: '1.0' },
          actor,
        );
      }
      // Uniqueness is scoped to the parent, not global.
      const rows = await db('product_baselines').where({
        baseline_version: '1.0',
      });
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('migrating over data that already violates the rules', () => {
    let db: Knex;

    beforeEach(() => {
      db = freshDb();
    });

    afterEach(async () => {
      await db?.destroy();
    });

    /** Builds the pre-constraint schema by hand, so duplicates can be seeded. */
    async function legacySchema() {
      await db.schema.createTable('products', table => {
        table.string('id', 255).primary();
        table.string('name', 255).notNullable();
        table.string('product_type', 50).notNullable();
        table.string('lifecycle', 50).notNullable().defaultTo('EXPERIMENTAL');
        table.string('status', 50).notNullable().defaultTo('ACTIVE');
        table.string('created_by', 255).notNullable();
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.integer('revision').defaultTo(1);
      });
      await db.schema.createTable('product_versions', table => {
        table.string('id', 255).primary();
        table.string('product_id', 255).notNullable();
        table.string('version', 50).notNullable();
        table.integer('version_number').notNullable();
        table.string('status', 50).notNullable().defaultTo('DRAFT');
        table.string('created_by', 255).notNullable();
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.integer('revision').defaultTo(1);
      });
      await db('products').insert({
        id: 'p1',
        name: 'Legacy',
        product_type: 'DATA_PRODUCT',
        created_by: 'user:default/legacy',
        created_at: new Date(),
      });
    }

    it('stops with the offending rows instead of relabelling them', async () => {
      await legacySchema();
      for (const id of ['v1', 'v2']) {
        await db('product_versions').insert({
          id,
          product_id: 'p1',
          version: `${id}-label`,
          version_number: 1,
          status: 'DRAFT',
          created_by: 'user:default/legacy',
          created_at: new Date(),
        });
      }

      await expect(up(db)).rejects.toThrow(
        /migration stopped[\s\S]*product_versions: product_id=p1 version_number=1/i,
      );

      // The rows are left exactly as they were for a human to resolve.
      const rows = await db('product_versions').orderBy('id');
      expect(rows.map((r: any) => r.id)).toEqual(['v1', 'v2']);
      expect(rows.every((r: any) => r.version_number === 1)).toBe(true);
    });

    it('completes once the collision is resolved', async () => {
      await legacySchema();
      await db('product_versions').insert({
        id: 'v1',
        product_id: 'p1',
        version: '1.0',
        version_number: 1,
        status: 'DRAFT',
        created_by: 'user:default/legacy',
        created_at: new Date(),
      });

      await expect(up(db)).resolves.toBeUndefined();
    });

    it('is safe to run twice', async () => {
      await up(db);
      await expect(up(db)).resolves.toBeUndefined();
    });
  });
});
