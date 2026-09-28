/**
 * What a product version stops accepting once it leaves DRAFT.
 *
 * `ArchitectureTab.tsx` disabled the add-component form outside DRAFT and said
 * in a doc comment that the rule belonged in the service. It did, and it was
 * not there: `addProductComponent`, `addDataContract`, `addProductDependency`,
 * `removeProductDependency` and `deriveFunctionalSpecifications` would all
 * change a RELEASED version for any caller who went to the API instead of the
 * page. See NXD-072.
 *
 * Two halves, and the second one matters more than the first.
 *
 * The refusals are asserted **individually, on their wording**, because the
 * five reasons are different — what a version is built from, is made of,
 * publishes, consumes and specifies — and a shared sentence would state none
 * of them. A test that only checked for 409 would pass against exactly the
 * generic message the `refusal` parameter exists to prevent.
 *
 * And three methods deliberately keep working after release. Evidence arrives
 * *after* a product ships: a passing CI run derives its own `VERIFIED_BY` link
 * (NXD-068) and the release gate reads it (NXD-069), so gating traceability on
 * DRAFT would contradict both and break the end-to-end journey, which posts
 * evidence at RELEASE_CANDIDATE. Those exemptions are asserted here rather
 * than only explained in a comment, so that someone "completing the family"
 * later finds a red test instead of a plausible-looking change.
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

describe('a version stops accepting changes when it leaves DRAFT', () => {
  let db: Knex;
  let service: ComposerService;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function draft() {
    const product = await service.createProduct(
      { name: `Guarded ${Math.random()}`, productType: 'DATA_PRODUCT' },
      AUTHOR,
    );
    const version = await service.createProductVersion(
      product.id,
      { version: '1.0' },
      AUTHOR,
    );
    const component = await service.addProductComponent(
      version.id,
      { componentType: 'API', name: 'probe' },
      AUTHOR,
    );
    return { product, version, component };
  }

  /** APPROVED rather than RELEASED: reachable in one legal transition. */
  async function approved() {
    const built = await draft();
    await service.transitionProductVersionStatus(
      built.version.id,
      { targetStatus: 'APPROVED' },
      APPROVER,
    );
    return built;
  }

  async function releaseCandidate() {
    const built = await approved();
    await service.transitionProductVersionStatus(
      built.version.id,
      { targetStatus: 'RELEASE_CANDIDATE' },
      APPROVER,
    );
    return built;
  }

  describe('each refusal says why, and they do not say the same thing', () => {
    it('refuses a component, naming the architecture', async () => {
      const { version } = await approved();
      await expect(
        service.addProductComponent(
          version.id,
          { componentType: 'API', name: 'late' },
          AUTHOR,
        ),
      ).rejects.toBeInstanceOf(ConflictError);
      await expect(
        service.addProductComponent(
          version.id,
          { componentType: 'API', name: 'late' },
          AUTHOR,
        ),
      ).rejects.toThrow(
        /Product version 1\.0 is APPROVED\. A component can only be added while the version is DRAFT — the architecture of a version is part of what was approved\./,
      );
    });

    it('refuses a contract, naming what the version publishes', async () => {
      const { component } = await approved();
      await expect(
        service.addDataContract(
          component.id,
          { namespace: 'probe', name: 'late', schemaType: 'JSON_SCHEMA' },
          AUTHOR,
        ),
      ).rejects.toThrow(/what a version publishes is part of what was approved/);
    });

    it('refuses a dependency, naming what the version consumes', async () => {
      const { version } = await approved();
      const provider = await draft();
      const contract = await service.addDataContract(
        provider.component.id,
        { namespace: 'probe', name: 'shared', schemaType: 'JSON_SCHEMA' },
        AUTHOR,
      );
      await expect(
        service.addProductDependency(version.id, { contractId: contract.id }, AUTHOR),
      ).rejects.toThrow(/what a version consumes is part of what was approved/);
    });

    it('refuses removing a dependency that was declared while DRAFT', async () => {
      const built = await draft();
      const provider = await draft();
      const contract = await service.addDataContract(
        provider.component.id,
        { namespace: 'probe', name: 'shared', schemaType: 'JSON_SCHEMA' },
        AUTHOR,
      );
      const dep = await service.addProductDependency(
        built.version.id,
        { contractId: contract.id },
        AUTHOR,
      );
      await service.transitionProductVersionStatus(
        built.version.id,
        { targetStatus: 'APPROVED' },
        APPROVER,
      );

      await expect(
        service.removeProductDependency(dep.id, AUTHOR),
      ).rejects.toThrow(/can only be removed while the version is DRAFT/);
    });

    it('refuses deriving a functional specification, naming the specification', async () => {
      const { version } = await approved();
      await expect(
        service.deriveFunctionalSpecifications(version.id, AUTHOR),
      ).rejects.toThrow(/what a version specifies is part of what was approved/);
    });

    // The refactor check. `bindUrsBaseline` had this guard before the helper
    // existed and its sentence is matched elsewhere; moving it into a
    // parameter must not have reworded it.
    it('keeps the URS binding refusal word for word', async () => {
      const { version } = await approved();
      await expect(
        service.bindUrsBaseline(version.id, 'baseline-1', AUTHOR),
      ).rejects.toThrow(
        /Product version 1\.0 is APPROVED\. A URS baseline can only be bound while the version is DRAFT — the requirements a version implements are part of what was approved\./,
      );
    });
  });

  describe('the guard is a guard, not a block', () => {
    it('accepts every guarded operation while the version is DRAFT', async () => {
      const { version, component } = await draft();
      const provider = await draft();
      const contract = await service.addDataContract(
        provider.component.id,
        { namespace: 'probe', name: 'shared', schemaType: 'JSON_SCHEMA' },
        AUTHOR,
      );

      await expect(
        service.addProductComponent(
          version.id,
          { componentType: 'API', name: 'second' },
          AUTHOR,
        ),
      ).resolves.toBeDefined();
      await expect(
        service.addDataContract(
          component.id,
          { namespace: 'probe', name: 'published', schemaType: 'JSON_SCHEMA' },
          AUTHOR,
        ),
      ).resolves.toBeDefined();
      const dep = await service.addProductDependency(
        version.id,
        { contractId: contract.id },
        AUTHOR,
      );
      await expect(
        service.removeProductDependency(dep.id, AUTHOR),
      ).resolves.toBeUndefined();
    });

    it('answers 404-shaped errors for ids that do not exist', async () => {
      await expect(
        service.addProductComponent(
          'no-such-version',
          { componentType: 'API', name: 'x' },
          AUTHOR,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        service.addDataContract(
          'no-such-component',
          { namespace: 'probe', name: 'x', schemaType: 'JSON_SCHEMA' },
          AUTHOR,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
      // Was an InputError, so an absent dependency answered 400.
      await expect(
        service.removeProductDependency('no-such-dependency', AUTHOR),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('what release does not stop, and must not', () => {
    // NXD-068/069. Delete these and the evidence chain is silently severed:
    // a passing run could no longer produce the link the release gate reads.
    it('still records a traceability link on a released version', async () => {
      const { version, component } = await releaseCandidate();
      const spec = await service.getProductVersion(version.id);
      expect(spec?.status).toBe('RELEASE_CANDIDATE');

      await expect(
        service.createTraceabilityLink(
          {
            sourceType: 'PRODUCT_COMPONENT',
            sourceId: component.id,
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          AUTHOR,
        ),
      ).resolves.toBeDefined();
    });

    it('still creates a product baseline on a released version', async () => {
      const { version } = await releaseCandidate();
      await expect(
        service.createProductBaseline(version.id, { baselineVersion: '1.0' }, AUTHOR),
      ).resolves.toBeDefined();
    });
  });
});
