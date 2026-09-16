/**
 * DataContract input invariants.
 *
 * Scope is deliberately validation only. DataContract has no name — a row is
 * identified by a UUID and its parent component — so there is no well-defined
 * key to make unique yet. Giving it an identity, an owner and the rest of the
 * first-class field set is Phase 4 work, and doing half of it here would mean
 * two migrations on one table and a uniqueness key chosen before the model is.
 *
 * See docs/nexora-transformation/DECISIONS.md, NXD-010.
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

describe('DataContract validation', () => {
  let db: Knex;
  let service: ComposerService;
  let componentId: string;

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });

    const actor = 'user:default/test-user';
    const product = await service.createProduct(
      {
        name: 'Contract Product',
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'NONE',
      },
      actor,
    );
    const version = await service.createProductVersion(product.id, {}, actor);
    const component = await service.addProductComponent(
      version.id,
      { componentType: 'SOURCE', name: 'Source' },
      actor,
    );
    componentId = component.id;
  });

  afterAll(async () => {
    await db?.destroy();
  });

  const actor = 'user:default/test-user';

  it.each(['JSON_SCHEMA', 'AVRO', 'PROTOBUF', 'OPENAPI', 'ASYNCAPI'])(
    'accepts the supported schema type %s',
    async schemaType => {
      const contract = await service.addDataContract(
        componentId,
        { schemaType },
        actor,
      );
      expect(contract.schemaType).toBe(schemaType);
    },
  );

  it('rejects a schema type outside the supported set', async () => {
    // DATA_CONTRACT_SCHEMA_TYPES has always existed; addDataContract cast
    // straight past it, so any string became a schemaType and every consumer
    // downstream had to cope with a value the type said was impossible.
    for (const schemaType of ['XSD', 'json_schema', 'JSON-SCHEMA', 'anything']) {
      await expect(
        service.addDataContract(componentId, { schemaType }, actor),
      ).rejects.toThrow(/schemaType/i);
    }
  });

  it('still requires a schema type', async () => {
    await expect(
      service.addDataContract(componentId, { schemaType: '  ' }, actor),
    ).rejects.toThrow(/schemaType/i);
  });

  it('rejects a contract version that is not a version', async () => {
    for (const version of ['', '   ', 'latest', 'v2', '1', '1.0.0.0', '01.0']) {
      await expect(
        service.addDataContract(
          componentId,
          { schemaType: 'JSON_SCHEMA', version },
          actor,
        ),
      ).rejects.toThrow(/version/i);
    }
  });

  it('defaults to 1.0 when no version is given', async () => {
    const contract = await service.addDataContract(
      componentId,
      { schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(contract.version).toBe('1.0');
  });

  it('accepts a semantic version with a patch component', async () => {
    const contract = await service.addDataContract(
      componentId,
      { schemaType: 'AVRO', version: '2.1.3' },
      actor,
    );
    expect(contract.version).toBe('2.1.3');
  });
});
