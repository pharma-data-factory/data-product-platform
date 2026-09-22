/**
 * DataContract input invariants — Phase 4 identity.
 *
 * P4-S1 (NXD-034) gave a contract a name, unique per component. Slice 1 of the
 * phase-closure plan finished the job NXD-010 described: identity is now the
 * coordinate `namespace/name@version`, enforced at the service layer (these
 * tests) and in the database (unique index on
 * `(namespace, lower(name), version)`). `productComponentId` is the relation to
 * the component that provides the contract, not the key.
 *
 * The practical difference these tests pin down: two components may no longer
 * both claim the same coordinate, the same name may live in two namespaces,
 * and a contract resolves from its ref without the caller knowing which
 * component declares it.
 */

import { InputError, NotFoundError } from '@backstage/errors';
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
  let versionId: string;

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
    versionId = version.id;
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
      service.addDataContract(componentId, { namespace: 'test-ns', name: '', schemaType: 'JSON_SCHEMA' }, actor),
    ).rejects.toThrow(/name is required/i);
  });

  it('rejects a blank-only name', async () => {
    await expect(
      service.addDataContract(componentId, { namespace: 'test-ns', name: '  ', schemaType: 'JSON_SCHEMA' }, actor),
    ).rejects.toThrow(/name is required/i);
  });

  it('stores the name and returns it', async () => {
    const contract = await service.addDataContract(
      componentId,
      { namespace: 'test-ns', name: 'output-event-v1', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(contract.name).toBe('output-event-v1');
    expect(contract.owner).toBeUndefined();
  });

  it('stores the owner when provided', async () => {
    const contract = await service.addDataContract(
      componentId,
      { namespace: 'test-ns', name: 'contract-with-owner', owner: 'group:default/data-team', schemaType: 'AVRO' },
      actor,
    );
    expect(contract.owner).toBe('group:default/data-team');
  });

  it('rejects a duplicate coordinate', async () => {
    await service.addDataContract(
      componentId,
      { namespace: 'test-ns', name: 'duplicate-name', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    await expect(
      service.addDataContract(
        componentId,
        { namespace: 'test-ns', name: 'duplicate-name', schemaType: 'OPENAPI' },
        actor,
      ),
    ).rejects.toThrow(/already exists/i);
  });

  // ── Coordinate identity (phase-closure Slice 1) ──────────────────────────

  it('rejects a name that is not a coordinate segment', async () => {
    // Uppercase used to be accepted and folded case-insensitively. It is now
    // refused outright: a coordinate is an identity, and two spellings of one
    // identity is the ambiguity the segment grammar exists to prevent.
    await expect(
      service.addDataContract(
        componentId,
        { namespace: 'test-ns', name: 'Case-Sensitive-Contract', schemaType: 'JSON_SCHEMA' },
        actor,
      ),
    ).rejects.toThrow(/lowercase kebab-case/i);
  });

  it.each(['', '  ', 'Not A Segment', 'trailing-', 'double--hyphen'])(
    'rejects namespace %p',
    async namespace => {
      await expect(
        service.addDataContract(
          componentId,
          { namespace, name: 'some-contract', schemaType: 'JSON_SCHEMA' },
          actor,
        ),
      ).rejects.toThrow(/namespace/i);
    },
  );

  it('allows the same name in two namespaces', async () => {
    // The point of a namespace: two teams may both own an "orders" contract.
    const a = await service.addDataContract(
      componentId,
      { namespace: 'sales', name: 'orders', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    const b = await service.addDataContract(
      componentId,
      { namespace: 'logistics', name: 'orders', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(a.id).not.toBe(b.id);
  });

  it('allows the same namespace and name at two versions', async () => {
    await service.addDataContract(
      componentId,
      { namespace: 'billing', name: 'invoice', schemaType: 'JSON_SCHEMA', version: '1.0' },
      actor,
    );
    const next = await service.addDataContract(
      componentId,
      { namespace: 'billing', name: 'invoice', schemaType: 'JSON_SCHEMA', version: '2.0' },
      actor,
    );
    expect(next.version).toBe('2.0');
  });

  it('refuses a coordinate already held by a different component', async () => {
    // Before Slice 1 this was legal: identity was scoped to the component, so
    // two components could each declare "shipments" and a ref naming it would
    // have been ambiguous.
    const other = await service.addProductComponent(
      versionId,
      { componentType: 'SINK', name: 'Second Component' },
      actor,
    );
    await service.addDataContract(
      componentId,
      { namespace: 'fulfilment', name: 'shipments', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    await expect(
      service.addDataContract(
        other.id,
        { namespace: 'fulfilment', name: 'shipments', schemaType: 'JSON_SCHEMA' },
        actor,
      ),
    ).rejects.toThrow(/already exists at fulfilment\/shipments@1\.0/i);
  });

  it('resolves a contract from its ref alone', async () => {
    const created = await service.addDataContract(
      componentId,
      { namespace: 'catalogue', name: 'products', schemaType: 'AVRO', version: '3.1' },
      actor,
    );
    const resolved = await service.getDataContractByRef('catalogue/products@3.1');
    expect(resolved.id).toBe(created.id);
  });

  // ── Provider-neutral exchange (phase-closure Slice 2) ────────────────────

  describe('exchange definition', () => {
    it('accepts a delivery mechanism Core has never heard of', async () => {
      // The point of the slice. ProductComponent.interfaceType is a closed
      // enum, so a new transport there needs a Core release. An exchange
      // mechanism must not, because the strategy makes exchange technologies
      // providers rather than Nexora domain truth.
      const contract = await service.addDataContract(
        componentId,
        {
          namespace: 'exch',
          name: 'novel-transport',
          schemaType: 'JSON_SCHEMA',
          exchange: { deliveryMechanism: 's3-parquet' },
        },
        actor,
      );
      expect(contract.exchange?.deliveryMechanism).toBe('s3-parquet');
    });

    it('defaults accessMode to REQUEST rather than to open access', async () => {
      const contract = await service.addDataContract(
        componentId,
        {
          namespace: 'exch',
          name: 'default-access',
          schemaType: 'JSON_SCHEMA',
          exchange: { deliveryMechanism: 'rest' },
        },
        actor,
      );
      expect(contract.exchange?.accessMode).toBe('REQUEST');
    });

    it('round-trips endpoint, classification and SLA', async () => {
      const created = await service.addDataContract(
        componentId,
        {
          namespace: 'exch',
          name: 'full-exchange',
          schemaType: 'JSON_SCHEMA',
          exchange: {
            deliveryMechanism: 'kafka',
            endpoint: 'topic://orders.v1',
            accessMode: 'ENTITLEMENT',
            classification: 'CONFIDENTIAL',
            sla: { availabilityPercent: 99.5, freshnessSeconds: 300 },
          },
        },
        actor,
      );
      const read = await service.getDataContract(created.id);
      expect(read?.exchange).toEqual({
        deliveryMechanism: 'kafka',
        endpoint: 'topic://orders.v1',
        accessMode: 'ENTITLEMENT',
        classification: 'CONFIDENTIAL',
        sla: { availabilityPercent: 99.5, freshnessSeconds: 300 },
      });
    });

    it('leaves exchange undefined when none is declared', async () => {
      // Not a half-built object: a caller checking exchange?.deliveryMechanism
      // should not also have to ask whether the wrapper is a placeholder.
      const contract = await service.addDataContract(
        componentId,
        { namespace: 'exch', name: 'no-exchange', schemaType: 'JSON_SCHEMA' },
        actor,
      );
      expect(contract.exchange).toBeUndefined();
      expect((await service.getDataContract(contract.id))?.exchange).toBeUndefined();
    });

    it.each([
      ['Not A Segment', /deliveryMechanism/i],
      ['', /deliveryMechanism/i],
    ])('rejects malformed deliveryMechanism %p', async (mechanism, expected) => {
      await expect(
        service.addDataContract(
          componentId,
          {
            namespace: 'exch',
            name: `bad-mech-${Math.random().toString(36).slice(2, 8)}`,
            schemaType: 'JSON_SCHEMA',
            exchange: { deliveryMechanism: mechanism },
          },
          actor,
        ),
      ).rejects.toThrow(expected);
    });

    it('rejects an unknown accessMode but not an unknown mechanism', async () => {
      await expect(
        service.addDataContract(
          componentId,
          {
            namespace: 'exch',
            name: 'bad-access',
            schemaType: 'JSON_SCHEMA',
            exchange: {
              deliveryMechanism: 'rest',
              accessMode: 'SOMEHOW' as any,
            },
          },
          actor,
        ),
      ).rejects.toThrow(/Unknown accessMode/i);
    });

    it('rejects an out-of-range SLA', async () => {
      await expect(
        service.addDataContract(
          componentId,
          {
            namespace: 'exch',
            name: 'bad-sla',
            schemaType: 'JSON_SCHEMA',
            exchange: {
              deliveryMechanism: 'rest',
              sla: { availabilityPercent: 150 },
            },
          },
          actor,
        ),
      ).rejects.toThrow(/availabilityPercent/i);
    });
  });

  it('distinguishes a malformed ref from a contract that does not exist', async () => {
    // A typo and a retired contract are different problems and must not
    // produce the same answer.
    //
    // The error *types* are asserted, not just the messages, because the
    // router maps them to 400 and 404 by instance check. Exercising
    // /contracts/resolve against an absent coordinate is what caught the
    // missing NotFoundError branch — it answered 500. This plugin has no
    // router test harness, so this assertion is what keeps the two halves of
    // that mapping in step.
    await expect(service.getDataContractByRef('not-a-ref')).rejects.toThrow(
      InputError,
    );
    await expect(service.getDataContractByRef('not-a-ref')).rejects.toThrow(
      /not a contract coordinate/i,
    );
    await expect(
      service.getDataContractByRef('catalogue/absent@1.0'),
    ).rejects.toThrow(NotFoundError);
    await expect(
      service.getDataContractByRef('catalogue/absent@1.0'),
    ).rejects.toThrow(/No DataContract at/i);
  });

  // ── Schema type and version validation (pre-existing, Phase 1, NXD-010) ──

  it.each(['JSON_SCHEMA', 'AVRO', 'PROTOBUF', 'OPENAPI', 'ASYNCAPI'])(
    'accepts the supported schema type %s',
    async schemaType => {
      const contract = await service.addDataContract(
        componentId,
        { namespace: 'test-ns', name: `schema-type-${schemaType.toLowerCase().replace(/_/g, '-')}`, schemaType },
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
        service.addDataContract(componentId, { namespace: 'test-ns', name: `bad-type-${String(schemaType).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, schemaType }, actor),
      ).rejects.toThrow(/schemaType/i);
    }
  });

  it('still requires a schema type', async () => {
    await expect(
      service.addDataContract(componentId, { namespace: 'test-ns', name: 'no-schema-type', schemaType: '  ' }, actor),
    ).rejects.toThrow(/schemaType/i);
  });

  it('rejects a contract version that is not a version', async () => {
    for (const version of ['', '   ', 'latest', 'v2', '1', '1.0.0.0', '01.0']) {
      await expect(
        service.addDataContract(
          componentId,
          { namespace: 'test-ns', name: `bad-version-${version || 'empty'}`, schemaType: 'JSON_SCHEMA', version },
          actor,
        ),
      ).rejects.toThrow(/version/i);
    }
  });

  it('defaults to 1.0 when no version is given', async () => {
    const contract = await service.addDataContract(
      componentId,
      { namespace: 'test-ns', name: 'default-version-contract', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(contract.version).toBe('1.0');
  });

  it('accepts a semantic version with a patch component', async () => {
    const contract = await service.addDataContract(
      componentId,
      { namespace: 'test-ns', name: 'patch-version-contract', schemaType: 'AVRO', version: '2.1.3' },
      actor,
    );
    expect(contract.version).toBe('2.1.3');
  });

  // ── Quality rules (Phase 4, P4-S6) ────────────────────────────────────────

  it('stores quality rules and returns them', async () => {
    const contract = await service.addDataContract(
      componentId,
      {
        namespace: 'test-ns',
        name: 'contract-with-quality',
        schemaType: 'JSON_SCHEMA',
        qualityRules: [
          { name: 'no-null-ids', rule: 'completeness', field: 'id', mandatory: true },
          { name: 'unique-keys', rule: 'uniqueness', field: 'key', mandatory: true },
          { name: 'count-range', rule: 'range', field: 'count',
            params: { min: 0, max: 1000 }, mandatory: false },
        ],
      },
      actor,
    );
    expect(contract.qualityRules).toHaveLength(3);
    expect(contract.qualityRules[0].name).toBe('no-null-ids');
    expect(contract.qualityRules[0].rule).toBe('completeness');
    expect(contract.qualityRules[2].params).toEqual({ min: 0, max: 1000 });
    expect(contract.qualityRules[2].mandatory).toBe(false);
  });

  it('defaults to empty qualityRules when none are provided', async () => {
    const contract = await service.addDataContract(
      componentId,
      { namespace: 'test-ns', name: 'no-quality-rules', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    expect(contract.qualityRules).toEqual([]);
  });

  it('rejects a quality rule with an unknown rule type', async () => {
    await expect(
      service.addDataContract(
        componentId,
        {
          namespace: 'test-ns',
          name: 'bad-rule-type',
          schemaType: 'JSON_SCHEMA',
          qualityRules: [
            { name: 'bad', rule: 'not-a-real-rule' as any, field: 'x', mandatory: true },
          ],
        },
        actor,
      ),
    ).rejects.toThrow(/Unknown quality rule type/i);
  });

  it('rejects a quality rule with a missing field', async () => {
    await expect(
      service.addDataContract(
        componentId,
        {
          namespace: 'test-ns',
          name: 'missing-field-rule',
          schemaType: 'JSON_SCHEMA',
          qualityRules: [
            { name: 'bad', rule: 'completeness', field: '', mandatory: true },
          ],
        },
        actor,
      ),
    ).rejects.toThrow(/field/i);
  });
});
