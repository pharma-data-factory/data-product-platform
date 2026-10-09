/**
 * NXD-157. A component can be removed while its version is DRAFT, the same
 * rule that lets it be added; its traceability links go with it, each one an
 * audit event; a component that provides a data contract stays.
 */

import knex, { Knex } from 'knex';
import { ConflictError, NotFoundError } from '@backstage/errors';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const AUTHOR = 'user:default/author';
const APPROVER = 'user:default/approver';

describe('removing a component (NXD-157)', () => {
  let db: Knex;
  let repository: ComposerRepository;
  let service: ComposerService;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function draft() {
    const product = await service.createProduct(
      { name: `Removable ${Math.random()}`, productType: 'DATA_PRODUCT' },
      AUTHOR,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      AUTHOR,
    );
    const add = (name: string) =>
      service.addProductComponent(
        version.id,
        { componentType: 'PROCESSING', name },
        AUTHOR,
      );
    return { version, keep: await add('keep'), drop: await add('drop') };
  }

  const link = (sourceId: string, targetId: string) =>
    service.createTraceabilityLink(
      {
        sourceType: 'PRODUCT_COMPONENT',
        sourceId,
        relationshipType: 'IMPLEMENTS',
        targetType: 'PRODUCT_COMPONENT',
        targetId,
      },
      AUTHOR,
    );

  const events = async (entityType: string) =>
    (
      await db('composer_audit_events')
        .where({ entity_type: entityType })
        .orderBy('timestamp')
    ).map((e: any) => ({
      id: e.entity_id,
      type: e.event_type,
      reason: e.reason,
      oldValue: e.old_value,
    }));

  it('removes a DRAFT component with every link to or from it, each an audit event, and leaves the rest', async () => {
    const { version, keep, drop } = await draft();
    const into = await link(keep.id, drop.id);
    const outOf = await link(drop.id, keep.id);
    const unrelated = await link(keep.id, keep.id);

    await service.deleteProductComponent(drop.id, AUTHOR);

    expect(
      (await service.listProductComponents(version.id)).map(c => c.name),
    ).toEqual(['keep']);
    expect(
      (await repository.listTraceabilityLinks([keep.id, drop.id])).map(
        l => l.id,
      ),
    ).toEqual([unrelated.id]);
    const deletedLinks = (await events('TRACEABILITY_LINK')).filter(
      e => e.type === 'TRACEABILITY_LINK_DELETED',
    );
    expect(deletedLinks.map(e => e.id).sort()).toEqual(
      [into.id, outOf.id].sort(),
    );
    expect(deletedLinks.every(e => e.reason === 'component drop removed')).toBe(
      true,
    );
    const removed = (await events('PRODUCT_COMPONENT')).find(
      e => e.type === 'PRODUCT_COMPONENT_DELETED',
    );
    expect(removed?.id).toBe(drop.id);
    expect(JSON.parse(removed!.oldValue)).toMatchObject({
      productVersionId: version.id,
      name: 'drop',
      componentType: 'PROCESSING',
    });
  });

  it('refuses a component of a version that left DRAFT, and changes nothing', async () => {
    const { version, drop } = await draft();
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'APPROVED' },
      APPROVER,
    );

    const refusal = service.deleteProductComponent(drop.id, AUTHOR);
    await expect(refusal).rejects.toThrow(ConflictError);
    await expect(
      service.deleteProductComponent(drop.id, AUTHOR),
    ).rejects.toThrow(
      'Product version 1.0 is APPROVED. A component can only be removed while the version is DRAFT',
    );
    expect(await service.listProductComponents(version.id)).toHaveLength(2);
  });

  it('refuses a component that provides a data contract, and an unknown id', async () => {
    const { drop } = await draft();
    await service.addDataContract(
      drop.id,
      { namespace: 'probe', name: 'out', schemaType: 'JSON_SCHEMA' },
      AUTHOR,
    );
    await expect(
      service.deleteProductComponent(drop.id, AUTHOR),
    ).rejects.toThrow(
      'Component drop provides 1 data contract, which other products may consume; it cannot be removed',
    );
    await expect(
      service.deleteProductComponent('nope', AUTHOR),
    ).rejects.toThrow(NotFoundError);
  });
});
