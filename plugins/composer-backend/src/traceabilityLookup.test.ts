/**
 * NXD-093. `listTraceabilityLinks` is scoped in the database.
 *
 * It used to read the whole table, and six service paths — the release gate
 * and the evidence package among them — filtered the result in memory. The
 * service suites prove those paths still answer the same; this proves the
 * repository returns what touches the given ids and nothing else.
 */

import knex, { Knex } from 'knex';
import { ComposerRepository } from './repository';

describe('listTraceabilityLinks scoping (NXD-093)', () => {
  let db: Knex;
  let repo: ComposerRepository;

  beforeAll(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    repo = await ComposerRepository.create({ getClient: () => db });

    const link = (
      id: string,
      sourceType: string,
      sourceId: string,
      relationshipType: string,
      targetType: string,
      targetId: string,
    ) => ({
      id,
      source_type: sourceType,
      source_id: sourceId,
      relationship_type: relationshipType,
      target_type: targetType,
      target_id: targetId,
      created_by: 'user:default/probe',
      created_at: new Date(),
    });
    await db('traceability_links').insert([
      link('into-a', 'URS_REQUIREMENT_VERSION', 'req-1', 'IMPLEMENTS', 'COMPONENT', 'comp-a'),
      link('out-of-a', 'COMPONENT', 'comp-a', 'VERIFIED_BY', 'TEST_CASE', 'tc-1'),
      link('into-b', 'URS_REQUIREMENT_VERSION', 'req-1', 'IMPLEMENTS', 'COMPONENT', 'comp-b'),
      link('spec-to-a', 'FUNCTIONAL_SPEC', 'fs-1', 'IMPLEMENTS', 'COMPONENT', 'comp-a'),
      link('unrelated', 'URS_REQUIREMENT_VERSION', 'req-9', 'IMPLEMENTS', 'COMPONENT', 'comp-z'),
    ]);
  });

  afterAll(async () => {
    await db?.destroy();
  });

  const ids = (links: { id: string }[]) => links.map(l => l.id).sort();

  it('returns links touching the ids on either end, and nothing else', async () => {
    expect(ids(await repo.listTraceabilityLinks(['comp-a']))).toEqual([
      'into-a',
      'out-of-a',
      'spec-to-a',
    ]);
  });

  it('does not reach a sibling through a shared source', async () => {
    // req-1 implements both comp-a and comp-b. Asking about comp-a must not
    // return comp-b's link: the source is shared, the link is not.
    expect(ids(await repo.listTraceabilityLinks(['comp-a']))).not.toContain(
      'into-b',
    );
  });

  it('unions several ids without duplicating a link that touches two of them', async () => {
    expect(
      ids(await repo.listTraceabilityLinks(['comp-a', 'fs-1', 'comp-a'])),
    ).toEqual(['into-a', 'out-of-a', 'spec-to-a']);
  });

  it('answers an empty id list with no links rather than all of them', async () => {
    expect(await repo.listTraceabilityLinks([])).toEqual([]);
  });

  it('creates the two single-column lookup indexes', async () => {
    const indexes = await db.raw(
      "select name from sqlite_master where type = 'index' and tbl_name = 'traceability_links'",
    );
    expect(indexes.map((row: { name: string }) => row.name)).toEqual(
      expect.arrayContaining([
        'traceability_links_source_id_idx',
        'traceability_links_target_id_idx',
      ]),
    );
  });
});
