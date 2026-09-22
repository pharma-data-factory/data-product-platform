/**
 * Data lineage — Phase 4 (P4-S4).
 *
 * Lineage answers: "who produces the data this version consumes, and who
 * consumes the data this version produces?" It is a one-hop view built from
 * ProductDependency links and existing contract/component/version/product
 * relationships.
 *
 * Test topology:
 *   Producer product:
 *     producerVersion → producerComponent → outputContract
 *
 *   Consumer product:
 *     consumerVersion → dependency on outputContract
 *
 * Expected lineage for consumerVersion:
 *   upstream:   outputContract → producerComponent → producerVersion → Producer
 *   downstream: (nothing — consumerVersion produces no contracts)
 *
 * Expected lineage for producerVersion:
 *   upstream:   (nothing — producerVersion consumes no contracts)
 *   downstream: outputContract → consumerVersion → Consumer
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

describe('Data lineage', () => {
  let db: Knex;
  let service: ComposerService;
  const actor = 'user:default/tester';

  let producerVersionId: string;
  let consumerVersionId: string;
  let contractId: string;
  let producerProductId: string;
  let consumerProductId: string;

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });

    // Producer: product → version → component → contract
    const producer = await service.createProduct(
      { name: 'Producer', productType: 'DATA_PRODUCT', owner: 'group:default/t' },
      actor,
    );
    producerProductId = producer.id;
    const pv = await service.createProductVersion(producer.id, {}, actor);
    producerVersionId = pv.id;
    const comp = await service.addProductComponent(
      pv.id,
      { componentType: 'SOURCE', name: 'Source' },
      actor,
    );
    const contract = await service.addDataContract(
      comp.id,
      { namespace: 'test-ns', name: 'output-event-v1', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    contractId = contract.id;

    // Consumer: product → version → dependency on contract
    const consumer = await service.createProduct(
      { name: 'Consumer', productType: 'DATA_PRODUCT', owner: 'group:default/t' },
      actor,
    );
    consumerProductId = consumer.id;
    const cv = await service.createProductVersion(consumer.id, {}, actor);
    consumerVersionId = cv.id;
    await service.addProductDependency(cv.id, { contractId }, actor);
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it('resolves upstream: consumer version sees producer product via the contract', async () => {
    const lineage = await service.getDataLineage(consumerVersionId);

    expect(lineage.versionId).toBe(consumerVersionId);
    expect(lineage.upstream).toHaveLength(1);

    const entry = lineage.upstream[0];
    expect(entry.contractId).toBe(contractId);
    expect(entry.contractName).toBe('output-event-v1');
    expect(entry.producerVersionId).toBe(producerVersionId);
    expect(entry.producerProductId).toBe(producerProductId);
    expect(entry.producerProductName).toBe('Producer');

    // Consumer produces no contracts, so downstream is empty.
    expect(lineage.downstream).toHaveLength(0);
  });

  it('resolves downstream: producer version sees consumer product via its contract', async () => {
    const lineage = await service.getDataLineage(producerVersionId);

    expect(lineage.upstream).toHaveLength(0); // producer consumes nothing

    expect(lineage.downstream).toHaveLength(1);
    const entry = lineage.downstream[0];
    expect(entry.contractId).toBe(contractId);
    expect(entry.contractName).toBe('output-event-v1');
    expect(entry.consumerVersionId).toBe(consumerVersionId);
    expect(entry.consumerProductId).toBe(consumerProductId);
    expect(entry.consumerProductName).toBe('Consumer');
  });

  it('returns empty lineage for a version with no contracts or dependencies', async () => {
    const isolated = await service.createProduct(
      { name: 'Isolated', productType: 'DATA_PRODUCT', owner: 'group:default/t' },
      actor,
    );
    const iv = await service.createProductVersion(isolated.id, {}, actor);
    const lineage = await service.getDataLineage(iv.id);

    expect(lineage.upstream).toHaveLength(0);
    expect(lineage.downstream).toHaveLength(0);
  });
});
