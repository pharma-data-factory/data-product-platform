/**
 * ProductDependency invariants — Phase 4 (P4-S3).
 *
 * A ProductDependency is a declared data dependency: version A consumes
 * contract B. The service validates:
 *   - contractId is required
 *   - the referenced contract must exist
 *   - a version may declare at most one dependency per contract (conflict)
 *
 * Removal is also tested: DELETE removes the link and the version can
 * declare a new dependency on the same contract afterwards.
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

describe('ProductDependency', () => {
  let db: Knex;
  let service: ComposerService;
  let versionId: string;
  let contractId: string;
  const actor = 'user:default/test-user';

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });

    // Set up a product with a version and a component with a contract.
    const product = await service.createProduct(
      {
        name: 'Consumer Product',
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'NONE',
      },
      actor,
    );
    const version = await service.createProductVersion(product.id, {}, actor);
    versionId = version.id;

    // Create a contract on a separate producer product's component.
    const producerProduct = await service.createProduct(
      { name: 'Producer', productType: 'DATA_PRODUCT', owner: 'group:default/team' },
      actor,
    );
    const producerVersion = await service.createProductVersion(producerProduct.id, {}, actor);
    const component = await service.addProductComponent(
      producerVersion.id,
      { componentType: 'SOURCE', name: 'Source' },
      actor,
    );
    const contract = await service.addDataContract(
      component.id,
      { namespace: 'test-ns', name: 'output-event-v1', schemaType: 'JSON_SCHEMA' },
      actor,
    );
    contractId = contract.id;
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it('declares a dependency on an existing contract', async () => {
    const dep = await service.addProductDependency(
      versionId,
      { contractId, description: 'consumes OEE output events' },
      actor,
    );

    expect(dep.productVersionId).toBe(versionId);
    expect(dep.contractId).toBe(contractId);
    expect(dep.description).toBe('consumes OEE output events');
    expect(dep.createdBy).toBe(actor);
  });

  it('lists the declared dependency', async () => {
    const deps = await service.listProductDependencies(versionId);
    expect(deps.some(d => d.contractId === contractId)).toBe(true);
  });

  it('rejects a missing contractId', async () => {
    await expect(
      service.addProductDependency(versionId, { contractId: '' }, actor),
    ).rejects.toThrow(/contractId is required/i);
  });

  it('rejects a contractId that does not exist', async () => {
    await expect(
      service.addProductDependency(versionId, { contractId: 'nonexistent-uuid' }, actor),
    ).rejects.toThrow(/not found/i);
  });

  it('rejects a duplicate dependency on the same contract', async () => {
    // The dependency on contractId was already declared in the first test.
    await expect(
      service.addProductDependency(versionId, { contractId }, actor),
    ).rejects.toThrow(/already declares a dependency/i);
  });

  it('removes a dependency and allows re-declaration', async () => {
    // Create a fresh version to test removal independently.
    const freshProduct = await service.createProduct(
      { name: 'Fresh Consumer', productType: 'DATA_PRODUCT', owner: 'g:default/t' },
      actor,
    );
    const freshVersion = await service.createProductVersion(freshProduct.id, {}, actor);

    const dep = await service.addProductDependency(
      freshVersion.id,
      { contractId },
      actor,
    );
    expect((await service.listProductDependencies(freshVersion.id)).length).toBe(1);

    await service.removeProductDependency(dep.id, actor);
    expect((await service.listProductDependencies(freshVersion.id)).length).toBe(0);

    // Can declare again after removal.
    await expect(
      service.addProductDependency(freshVersion.id, { contractId }, actor),
    ).resolves.toBeTruthy();
  });
});
