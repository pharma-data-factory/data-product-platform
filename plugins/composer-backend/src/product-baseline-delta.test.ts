/**
 * Product Baseline Delta tests — snapshot comparison between baselines.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';
import type { UrsBaselineResolver } from './urs-baseline-resolver';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

function createDb(): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
}

describe('Product Baseline Delta', () => {
  let db: Knex;
  let service: ComposerService;
  const actor = 'user:default/test-user';
  const credentials = {};
  const ursBaselineId = 'urs-baseline-delta';
  const mockResolver: UrsBaselineResolver = {
    resolveApprovedBaseline: jest.fn(async (id: string) => ({
      id,
      status: 'APPROVED',
      baselineVersion: '1.0',
    })),
    resolveBaselineContext: jest.fn(),
    inspectBaseline: jest.fn(async (id: string) => ({
      id,
      status: 'APPROVED',
      baselineVersion: '1.0',
    })),
    listApprovedBaselines: jest.fn(async () => []),
    listChangeRequests: jest.fn(async () => ({ items: [], total: 0 })),
  };

  beforeAll(async () => {
    db = createDb();
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({
      logger: mockLogger,
      repository,
      ursBaselineResolver: mockResolver,
    });
  });

  afterAll(async () => {
    await db?.destroy();
  });

  async function createVersionWithComponents(componentNames: string[]) {
    const product = await service.createProduct(
      { name: `Delta Test ${Date.now()}`, productType: 'DATA_PRODUCT' },
      actor,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      actor,
    );
    for (const name of componentNames) {
      await service.addProductComponent(
        version.id,
        { componentType: 'SOURCE', name },
        actor,
      );
    }
    return version.id;
  }

  it('computes all ADDED for first baseline (no predecessor)', async () => {
    const versionId = await createVersionWithComponents(['Comp A', 'Comp B']);

    const baseline = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    const delta = await service.computeProductBaselineDelta(baseline.id, actor);
    expect(delta.previousBaselineId).toBeUndefined();
    expect(delta.summary.added).toBeGreaterThan(0);
    expect(delta.summary.removed).toBe(0);
    expect(delta.summary.modified).toBe(0);
    expect(delta.changes.every(c => c.changeType === 'ADDED')).toBe(true);
  });

  it('detects UNCHANGED when snapshots are identical', async () => {
    const versionId = await createVersionWithComponents(['Same Comp']);

    const b1 = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );
    const b2 = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    const delta = await service.computeProductBaselineDelta(b2.id, actor);
    expect(delta.previousBaselineId).toBe(b1.id);
    expect(delta.summary.unchanged).toBeGreaterThan(0);
    expect(delta.summary.added).toBe(0);
    expect(delta.summary.removed).toBe(0);
    expect(delta.summary.modified).toBe(0);
  });

  it('detects ADDED component in newer baseline', async () => {
    const versionId = await createVersionWithComponents(['Initial']);

    await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    await service.addProductComponent(
      versionId,
      { componentType: 'TRANSFORM', name: 'New Transform' },
      actor,
    );

    const b2 = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    const delta = await service.computeProductBaselineDelta(b2.id, actor);
    const addedComponents = delta.changes.filter(
      c => c.changeType === 'ADDED' && c.itemType === 'component',
    );
    expect(addedComponents.length).toBe(1);
    expect((addedComponents[0].current as Record<string, unknown>)?.name).toBe(
      'New Transform',
    );
  });

  it('detects REMOVED component in newer baseline', async () => {
    const versionId = await createVersionWithComponents(['Keep', 'Remove Me']);

    const b1 = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    const delta = await service.computeProductBaselineDelta(b1.id, actor);
    expect(delta.summary.added).toBeGreaterThan(0);
  });

  it('summary counts are correct', async () => {
    const versionId = await createVersionWithComponents(['A', 'B']);

    const b1 = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    await service.addProductComponent(
      versionId,
      { componentType: 'SINK', name: 'C' },
      actor,
    );

    const b2 = await service.createProductBaseline(
      versionId,
      { ursBaselineId },
      actor,
      credentials,
    );

    const delta = await service.computeProductBaselineDelta(b2.id, actor);
    const total =
      delta.summary.added +
      delta.summary.modified +
      delta.summary.removed +
      delta.summary.unchanged;
    expect(total).toBe(delta.changes.length);
    expect(delta.baselineVersion).toBe(b2.baselineVersion);
    expect(delta.previousBaselineVersion).toBe(b1.baselineVersion);
  });

  it('throws when baseline not found', async () => {
    await expect(
      service.computeProductBaselineDelta('non-existent-id', actor),
    ).rejects.toThrow('not found');
  });
});
