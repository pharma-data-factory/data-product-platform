/**
 * What the product write paths accept into a governance field.
 *
 * Found by running the API, not by reading it. `POST /products` with
 * `gxpRelevance: 'TOTALLY_MADE_UP_VALUE'` returned 201 and stored the string
 * verbatim — on the field that classifies regulatory relevance.
 *
 * The consequence is worse than a bad display value. `checkReleaseGate` asks
 * only whether the field is *set* (`gxp-relevance-set`), and treats anything
 * other than `NONE` as GxP-relevant. So nonsense does not fail the gate; it
 * satisfies the obligation and then reads as DIRECT-equivalent, which pulls in
 * the criticality obligation on the strength of a typo. The URS side of the
 * platform has enforced the same three-value vocabulary since P1A.
 *
 * `Product.gxpRelevance` stays `string` and stored rows are untouched — the
 * doc comment on `GXP_RELEVANCE_LEVELS` is about reading legacy data, and that
 * reasoning still holds. This covers writing.
 *
 * Run against SQLite through the real repository so the read-back is real.
 */

import knex, { Knex } from 'knex';
import { InputError } from '@backstage/errors';
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

describe('product governance vocabulary', () => {
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

  function create(extra: Record<string, unknown> = {}) {
    seq += 1;
    return service.createProduct(
      {
        name: `Batch Analytics ${seq}`,
        productType: 'DATA_PRODUCT',
        ...extra,
      } as any,
      ACTOR,
    );
  }

  describe('createProduct', () => {
    it('refuses a gxpRelevance outside the vocabulary', async () => {
      await expect(
        create({ gxpRelevance: 'TOTALLY_MADE_UP_VALUE' }),
      ).rejects.toThrow(/Unsupported gxpRelevance: TOTALLY_MADE_UP_VALUE/);
    });

    it('names the values it would have accepted', async () => {
      await expect(create({ gxpRelevance: 'maybe' })).rejects.toThrow(
        /Expected one of NONE, INDIRECT, DIRECT/,
      );
    });

    it.each(['NONE', 'INDIRECT', 'DIRECT'])('accepts %s', async level => {
      const product = await create({ gxpRelevance: level });
      expect(product.gxpRelevance).toBe(level);
    });

    it('refuses a criticality outside the vocabulary', async () => {
      await expect(create({ criticality: 'VERY_HIGH' })).rejects.toThrow(
        /Unsupported criticality: VERY_HIGH/,
      );
    });

    it('refuses a lifecycle outside the vocabulary', async () => {
      await expect(create({ lifecycle: 'SUNSET' })).rejects.toThrow(
        /Unsupported lifecycle: SUNSET/,
      );
    });

    it('refuses a dataClassification outside the vocabulary', async () => {
      await expect(create({ dataClassification: 'TOP_SECRET' })).rejects.toThrow(
        /Unsupported dataClassification: TOP_SECRET/,
      );
    });

    it('still allows every governance field to be absent', async () => {
      // Absence is the release gate's business, not the validator's: the gate
      // reports it per obligation with a message a reviewer can act on. A
      // create form that collects four fields must keep working.
      const product = await create();
      expect(product.gxpRelevance).toBeUndefined();
      expect(product.criticality).toBeUndefined();
      expect(product.lifecycle).toBe('EXPERIMENTAL');
    });

    it('reports every bad field at once, not just the first', async () => {
      await expect(
        create({ gxpRelevance: 'X', criticality: 'Y', lifecycle: 'Z' }),
      ).rejects.toThrow(
        /Unsupported gxpRelevance: X.*Unsupported criticality: Y.*Unsupported lifecycle: Z/s,
      );
    });
  });

  describe('updateProduct', () => {
    it('refuses with an InputError, so the caller is told what was wrong', async () => {
      // The refusal was a plain Error, which `respondError` maps to
      // `500 {"error":"Internal server error"}` — the reason reaches the server
      // log and never the caller. Driving the live API showed exactly that: a
      // rejected vocabulary value read as a server fault. The router maps by
      // instance check, so the type is the assertion, not the message.
      const product = await create();
      await expect(
        service.updateProduct(product.id, { gxpRelevance: 'MAYBE' }, ACTOR),
      ).rejects.toBeInstanceOf(InputError);
    });

    it('refuses garbage that createProduct would have refused', async () => {
      // The edit path validated nothing at all, so the vocabulary could be
      // bypassed by creating clean and then updating dirty.
      const product = await create({ gxpRelevance: 'NONE' });
      await expect(
        service.updateProduct(product.id, { gxpRelevance: 'NOT_A_LEVEL' }, ACTOR),
      ).rejects.toThrow(/Unsupported gxpRelevance: NOT_A_LEVEL/);
    });

    it('leaves the stored value untouched when it refuses', async () => {
      const product = await create({ gxpRelevance: 'DIRECT' });
      await expect(
        service.updateProduct(product.id, { criticality: 'NOPE' }, ACTOR),
      ).rejects.toThrow();
      const reread = await service.getProduct(product.id);
      expect(reread?.gxpRelevance).toBe('DIRECT');
      // null, not undefined: this is a column read back, where `createProduct`
      // returns the in-memory object it built.
      expect(reread?.criticality ?? undefined).toBeUndefined();
      expect(reread?.revision).toBe(1);
    });

    it('does not demand name and productType on a partial update', async () => {
      // validateProduct would have; validateProductGovernance is the reason
      // the update path uses its own validator rather than reusing that one.
      const product = await create();
      const updated = await service.updateProduct(
        product.id,
        { gxpRelevance: 'INDIRECT', criticality: 'HIGH' },
        ACTOR,
      );
      expect(updated.gxpRelevance).toBe('INDIRECT');
      expect(updated.criticality).toBe('HIGH');
    });
  });
});
