/**
 * What the release gate says at each step a user can actually perform.
 *
 * The gate is the best-built thing in this plugin and, until Batch 1, the least
 * reachable: four of its blockers named evidence that no screen could produce.
 * This file measures that rather than asserting it in a document — it drives
 * the flow with the operations the Product page now offers and records which
 * codes clear and which remain.
 *
 * The remaining codes are the map for the batches after this one, so they are
 * asserted too. A test that only checked the happy direction would let the
 * gate quietly stop asking for something without anyone noticing.
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

/** Two people, because a version may not be approved by its author. */
const AUTHOR = 'user:default/author';
const APPROVER = 'user:default/approver';

function codesOf(result: { blockers: { code: string }[] }): string[] {
  return [...new Set(result.blockers.map(b => b.code))].sort();
}

describe('Release gate, as a user can reach it', () => {
  let db: Knex;
  let service: ComposerService;

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

  it('clears everything Batch 1 is responsible for, and nothing it is not', async () => {
    // 1. A product as the Products page creates one: name, type, domain,
    //    description. No owner, no classification, no GxP answer.
    const product = await service.createProduct(
      {
        name: 'Batch Analytics',
        productType: 'DATA_PRODUCT',
        domain: 'manufacturing',
        description: 'Current batch status',
      },
      AUTHOR,
    );
    const version = await service.createProductVersion(product.id, {}, AUTHOR);

    // The starting position: four codes, six blockers. The version is still
    // DRAFT, the product states none of its three obligations, it holds no
    // component, and no baseline has been approved.
    const start = await service.checkReleaseGate(version.id);
    expect(codesOf(start)).toEqual([
      'INVALID_STATUS',
      'NO_APPROVED_BASELINE',
      'NO_COMPONENTS',
      'POLICY_OBLIGATION_UNMET',
    ]);
    expect(start.blockers).toHaveLength(6);
    expect(
      start.blockers.filter(b => b.code === 'POLICY_OBLIGATION_UNMET'),
    ).toHaveLength(3);

    // 2. Governance — the Batch 1 form. Previously impossible: no screen
    //    collected these and `updateProduct` dropped `dataClassification`.
    await service.updateProduct(
      product.id,
      {
        owner: 'group:default/platform-team',
        dataClassification: 'CONFIDENTIAL',
        gxpRelevance: 'DIRECT',
        criticality: 'HIGH',
      },
      AUTHOR,
    );

    // 3. A component, so the version describes something.
    await service.addProductComponent(
      version.id,
      { componentType: 'API', name: 'Batch Status API' },
      AUTHOR,
    );

    // 4. Baseline created and approved — the Batch 1 section. Previously
    //    impossible: both methods existed and no page called either.
    const baseline = await service.createProductBaseline(
      version.id,
      { baselineVersion: '1.0' },
      AUTHOR,
    );
    await service.approveProductBaseline(baseline.id, APPROVER);

    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'APPROVED' },
      APPROVER,
    );
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'RELEASE_CANDIDATE' },
      APPROVER,
    );

    const after = await service.checkReleaseGate(version.id);

    // Cleared by Batch 1.
    expect(codesOf(after)).not.toContain('POLICY_OBLIGATION_UNMET');
    expect(codesOf(after)).not.toContain('NO_COMPONENTS');
    expect(codesOf(after)).not.toContain('NO_APPROVED_BASELINE');
    expect(codesOf(after)).not.toContain('INVALID_STATUS');

    // Left standing, deliberately. Each names a later batch:
    //
    //  - INCOMPLETE_TRACEABILITY — the component implements no requirement.
    //    Linking is manual today; Batch 4 makes it evidence-driven.
    //  - NO_URS_BASELINE — the version is bound to no URS baseline, so the
    //    baseline inherited none. Binding works (Requirements tab); this
    //    product deliberately skipped it, which is what the gate is for.
    expect(codesOf(after)).toEqual([
      'INCOMPLETE_TRACEABILITY',
      'NO_URS_BASELINE',
    ]);
  });

  it('still refuses to release while a blocker stands', async () => {
    const product = await service.createProduct(
      {
        name: 'Unfinished Product',
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'INTERNAL',
        gxpRelevance: 'NONE',
      },
      AUTHOR,
    );
    const version = await service.createProductVersion(product.id, {}, AUTHOR);
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'APPROVED' },
      APPROVER,
    );
    await service.transitionProductVersionStatus(
      version.id,
      { targetStatus: 'RELEASE_CANDIDATE' },
      APPROVER,
    );

    await expect(
      service.transitionProductVersionStatus(
        version.id,
        { targetStatus: 'RELEASED' },
        APPROVER,
      ),
    ).rejects.toThrow(/Release gate failed/);
  });

  it('a governance answer of NONE counts as answered', async () => {
    // The obligation is that the product *states* its GxP relevance. "Not
    // relevant" is a decision someone made; an empty column is not.
    const product = await service.createProduct(
      {
        name: 'Non-GxP Product',
        productType: 'DATA_PRODUCT',
        owner: 'group:default/platform-team',
        dataClassification: 'PUBLIC',
        gxpRelevance: 'NONE',
      },
      AUTHOR,
    );
    const version = await service.createProductVersion(product.id, {}, AUTHOR);

    const gate = await service.checkReleaseGate(version.id);
    expect(codesOf(gate)).not.toContain('POLICY_OBLIGATION_UNMET');
  });
});
