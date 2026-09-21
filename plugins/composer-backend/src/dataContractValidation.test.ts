/**
 * DataContract input invariants — Phase 4 identity (NXD-034).
 *
 * Phase 4 (P4-S1) added name and owner to DataContract. A contract now has a
 * stable identity: its name is unique (case-insensitive) per component,
 * enforced both at the service layer (this test) and in the database
 * (unique index on (product_component_id, lower(name))).
 *
 * A row is still keyed to a productComponentId. Making contracts fully
 * first-class (own namespace, independent references across products) is the
 * next Phase 4 slice — NXD-010 recorded what that requires.
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

  // ── Phase 4 identity (P4-S1, NXD-034) ────────────────────────────────────

  it('requires a name', async () => {
    await expect(
      service.addDataContract(componentId, { name: '', schemaType: 'JSON_SCHEMA' }, actor),
    ).rejects.toThrow(/name is required/i);
  });

  it('rejects a blank-only name', async () => {
    await expect(
      service.addDataContract(componentId, { name: '  ', schemaType: 'JSON_SCHEMA' }, actor),
    ).rejects.toThrow(/name is required/i);
  });

  it('stores the name and returns it', async () => {
    const contract = await service.addDataContract(
      componentId,
      { name: 'output-event-v1', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(contract.name).toBe('output-event-v1');
    expect(contract.owner).toBeUndefined();
  });

  it('stores the owner when provided', async () => {
    const contract = await service.addDataContract(
      componentId,
      { name: 'contract-with-owner', owner: 'group:default/data-team', schemaType: 'AVRO' },
      actor,
    );
    expect(contract.owner).toBe('group:default/data-team');
  });

  it('rejects a duplicate name (exact match) on the same component', async () => {
    await service.addDataContract(
      componentId,
      { name: 'duplicate-name', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    await expect(
      service.addDataContract(
        componentId,
        { name: 'duplicate-name', schemaType: 'OPENAPI' },
        actor,
      ),
    ).rejects.toThrow(/already exists/i);
  });

  it('rejects a duplicate name (case-insensitive) on the same component', async () => {
    await service.addDataContract(
      componentId,
      { name: 'Case-Sensitive-Contract', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    await expect(
      service.addDataContract(
        componentId,
        { name: 'case-sensitive-contract', schemaType: 'JSON_SCHEMA' },
        actor,
      ),
    ).rejects.toThrow(/already exists/i);
  });

  // ── Schema type and version validation (pre-existing, Phase 1, NXD-010) ──

  it.each(['JSON_SCHEMA', 'AVRO', 'PROTOBUF', 'OPENAPI', 'ASYNCAPI'])(
    'accepts the supported schema type %s',
    async schemaType => {
      const contract = await service.addDataContract(
        componentId,
        { name: `schema-type-${schemaType.toLowerCase()}`, schemaType },
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
        service.addDataContract(componentId, { name: `bad-type-${schemaType}`, schemaType }, actor),
      ).rejects.toThrow(/schemaType/i);
    }
  });

  it('still requires a schema type', async () => {
    await expect(
      service.addDataContract(componentId, { name: 'no-schema-type', schemaType: '  ' }, actor),
    ).rejects.toThrow(/schemaType/i);
  });

  it('rejects a contract version that is not a version', async () => {
    for (const version of ['', '   ', 'latest', 'v2', '1', '1.0.0.0', '01.0']) {
      await expect(
        service.addDataContract(
          componentId,
          { name: `bad-version-${version || 'empty'}`, schemaType: 'JSON_SCHEMA', version },
          actor,
        ),
      ).rejects.toThrow(/version/i);
    }
  });

  it('defaults to 1.0 when no version is given', async () => {
    const contract = await service.addDataContract(
      componentId,
      { name: 'default-version-contract', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(contract.version).toBe('1.0');
  });

  it('accepts a semantic version with a patch component', async () => {
    const contract = await service.addDataContract(
      componentId,
      { name: 'patch-version-contract', schemaType: 'AVRO', version: '2.1.3' },
      actor,
    );
    expect(contract.version).toBe('2.1.3');
  });
});
