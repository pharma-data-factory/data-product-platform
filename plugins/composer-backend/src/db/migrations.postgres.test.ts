/**
 * The composer migration against the database it actually runs on.
 *
 * The rest of the composer suite uses SQLite, which is fine for domain logic
 * but cannot prove a schema change. The identity indexes added in NXD-009 use
 * an expression index (`lower(baseline_version)`) and `IF NOT EXISTS`, and
 * whether those behave the same in both dialects is exactly the kind of thing
 * that should not be assumed.
 *
 * Follows NXD-005: skips on a developer machine without PostgreSQL, fails in
 * CI, where the database is provisioned.
 */

import knex, { Knex } from 'knex';
import { up } from './migrations';

const CONNECTION = {
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TEST_DB_PORT || '5435', 10),
  user: process.env.TEST_DB_USER || 'urs_test',
  password: process.env.TEST_DB_PASSWORD || 'test_pass123',
  database: process.env.TEST_DB_NAME || 'urs_composer_test',
};

/** Own schema, so this cannot collide with a suite running beside it. */
const SCHEMA = 'test_composer_migrations';

const actor = 'user:default/migration-probe';

function row(overrides: Record<string, unknown>) {
  return { created_by: actor, created_at: new Date(), revision: 1, ...overrides };
}

/** traceability_links has no `revision` column; `row()` would invent one. */
function linkRow(overrides: Record<string, unknown>) {
  return { created_by: actor, created_at: new Date(), ...overrides };
}

describe('composer migration on PostgreSQL', () => {
  let db: Knex | undefined;
  let available = false;

  beforeAll(async () => {
    const admin = knex({ client: 'pg', connection: CONNECTION });
    try {
      await admin.raw('select 1');
      available = true;
    } catch (error) {
      if (process.env.CI) {
        await admin.destroy().catch(() => {});
        throw new Error(
          `PostgreSQL is required in CI but was unreachable at ` +
            `${CONNECTION.host}:${CONNECTION.port}: ${(error as Error).message}`,
        );
      }
      await admin.destroy().catch(() => {});
      return;
    }
    await admin.raw('drop schema if exists ?? cascade', [SCHEMA]);
    await admin.raw('create schema ??', [SCHEMA]);
    await admin.destroy();
    db = knex({ client: 'pg', connection: CONNECTION, searchPath: [SCHEMA] });
  }, 60000);

  afterAll(async () => {
    await db?.destroy().catch(() => {});
    if (!available) {
      return;
    }
    const admin = knex({ client: 'pg', connection: CONNECTION });
    await admin.raw('drop schema if exists ?? cascade', [SCHEMA]);
    await admin.destroy();
  }, 60000);

  it('applies, re-applies and enforces both identity indexes', async () => {
    if (!available) {
      console.warn(
        'Skipping composer PostgreSQL migration test: no database. Run ' +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return;
    }
    const database = db as Knex;

    await up(database);
    // Re-running must not fail on an index that already exists.
    await up(database);

    await database('products').insert(
      row({
        id: 'p1',
        name: 'Probe',
        product_type: 'DATA_PRODUCT',
        lifecycle: 'EXPERIMENTAL',
        status: 'ACTIVE',
      }),
    );
    await database('product_versions').insert(
      row({
        id: 'v1',
        product_id: 'p1',
        version: '1.0',
        version_number: 1,
        status: 'DRAFT',
      }),
    );

    await expect(
      database('product_versions').insert(
        row({
          id: 'v2',
          product_id: 'p1',
          version: '9.0',
          version_number: 1,
          status: 'DRAFT',
        }),
      ),
    ).rejects.toThrow(/unique/i);

    await database('product_baselines').insert(
      row({
        id: 'b1',
        product_version_id: 'v1',
        baseline_version: 'Rev-A',
        status: 'DRAFT',
        snapshot: '{}',
      }),
    );

    // The expression index is what makes PostgreSQL agree with the service,
    // which treats these two labels as one identity.
    await expect(
      database('product_baselines').insert(
        row({
          id: 'b2',
          product_version_id: 'v1',
          baseline_version: 'rev-a',
          status: 'DRAFT',
          snapshot: '{}',
        }),
      ),
    ).rejects.toThrow(/unique/i);
  }, 60000);

  // MVP1-B (B-4a). These two guarantees exist only on PostgreSQL, and this
  // is the only composer suite that can see them.
  //
  // The CHECK constraints are the file's single dialect branch: SQLite's
  // ALTER TABLE cannot add a constraint to an existing table, so the
  // vocabulary is enforced there by the service alone. If that branch is
  // ever removed or the constraint renamed, these assertions fail rather
  // than the guarantee quietly disappearing.
  it('enforces the traceability vocabulary and the test-execution foreign key', async () => {
    if (!available) {
      console.warn(
        'Skipping composer PostgreSQL migration test: no database. Run ' +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return;
    }
    const database = db as Knex;

    await up(database);

    await database('product_components').insert(
      row({
        id: 'c1',
        product_version_id: 'v1',
        component_type: 'API',
        name: 'probe-api',
      }),
    );

    await expect(
      database('traceability_links').insert(
        linkRow({
          id: 'tl-bad-source',
          source_type: 'URS',
          source_id: 'URS-PROBE-001',
          relationship_type: 'IMPLEMENTS',
          target_type: 'PRODUCT_COMPONENT',
          target_id: 'c1',
        }),
      ),
    ).rejects.toThrow(/traceability_links_source_type_check/);

    await expect(
      database('traceability_links').insert(
        linkRow({
          id: 'tl-bad-target',
          source_type: 'URS_REQUIREMENT',
          source_id: 'URS-PROBE-001',
          relationship_type: 'IMPLEMENTS',
          target_type: 'COMPONENT',
          target_id: 'c1',
        }),
      ),
    ).rejects.toThrow(/traceability_links_target_type_check/);

    // The canonical spelling of the same link goes in.
    await database('traceability_links').insert(
      linkRow({
        id: 'tl-good',
        source_type: 'URS_REQUIREMENT',
        source_id: 'URS-PROBE-001',
        relationship_type: 'IMPLEMENTS',
        target_type: 'PRODUCT_COMPONENT',
        target_id: 'c1',
      }),
    );

    // The one endpoint that lives in this schema gets a real foreign key.
    await expect(
      database('traceability_links').insert(
        linkRow({
          id: 'tl-phantom-exec',
          source_type: 'URS_REQUIREMENT_VERSION',
          source_id: 'urs-version-probe',
          relationship_type: 'VERIFIED_BY',
          target_type: 'TEST_EXECUTION',
          target_id: 'exec-that-does-not-exist',
          target_test_execution_id: 'exec-that-does-not-exist',
        }),
      ),
    ).rejects.toThrow(/foreign key|violates/i);

    await database('test_executions').insert({
      id: 'exec-1',
      requirement_version_id: 'urs-version-probe',
      test_suite: 'integration',
      test_case: 'ingests a weighing event',
      status: 'PASSED',
      executed_at: new Date(),
      correlation_id: 'corr-probe-1',
      created_by: actor,
      created_at: new Date(),
    });

    await database('traceability_links').insert(
      linkRow({
        id: 'tl-real-exec',
        source_type: 'URS_REQUIREMENT_VERSION',
        source_id: 'urs-version-probe',
        relationship_type: 'VERIFIED_BY',
        target_type: 'TEST_EXECUTION',
        target_id: 'exec-1',
        target_test_execution_id: 'exec-1',
      }),
    );

    // Append-only: a second run of the same case is a second row, not an
    // upsert. A unique constraint here would have destroyed the history the
    // verification rule reads.
    await database('test_executions').insert({
      id: 'exec-2',
      requirement_version_id: 'urs-version-probe',
      test_suite: 'integration',
      test_case: 'ingests a weighing event',
      status: 'FAILED',
      executed_at: new Date(),
      correlation_id: 'corr-probe-2',
      created_by: actor,
      created_at: new Date(),
    });
    const runs = await database('test_executions')
      .where({ requirement_version_id: 'urs-version-probe' })
      .select();
    expect(runs).toHaveLength(2);
  }, 60000);

  it('refuses to migrate over a link whose types are outside the vocabulary', async () => {
    if (!available) {
      return;
    }
    const database = db as Knex;
    await up(database);

    // Drop the constraint so a bad row can be planted — this is what a
    // database written before MVP1-B looks like.
    await database.raw(
      'alter table ?? drop constraint ??',
      ['traceability_links', 'traceability_links_source_type_check'],
    );
    await database('traceability_links').insert(
      linkRow({
        id: 'tl-legacy',
        source_type: 'URS',
        source_id: 'URS-LEGACY-001',
        relationship_type: 'IMPLEMENTS',
        target_type: 'PRODUCT_COMPONENT',
        target_id: 'c1',
      }),
    );

    // Reports, names the row, and changes nothing — the same choice
    // assertNoDuplicateIdentities makes, for the same reason.
    await expect(up(database)).rejects.toThrow(/tl-legacy/);
    await expect(up(database)).rejects.toThrow(
      /will not guess what a link meant/,
    );

    await database('traceability_links').where({ id: 'tl-legacy' }).del();
    await expect(up(database)).resolves.toBeUndefined();
  }, 60000);

  // MVP1 item 6 / NXD-064 C-3. The suites that exercise drafts run on SQLite,
  // where `text` accepts anything and a missing NOT NULL costs nothing. The
  // provenance columns are the point of the table, so their notNullable is
  // proven on the dialect that actually enforces it.
  it('stores a draft with its provenance and refuses one without', async () => {
    if (!available) {
      return;
    }
    const database = db as Knex;
    await up(database);

    const draft = {
      id: 'draft-pg-1',
      urs_baseline_id: 'urs-baseline-probe',
      status: 'PENDING_REVIEW',
      product_name: 'Probe Product',
      description: 'Generated for the migration proof.',
      domain: 'manufacturing',
      suggested_components: JSON.stringify([{ name: 'c', reason: 'r' }]),
      suggested_contracts: JSON.stringify([]),
      model_id: 'claude-haiku-4-5',
      prompt_hash: `sha256:${'a'.repeat(64)}`,
      raw_response: '{"productName":"Probe Product"}',
      generated_by: 'user:default/probe',
      generated_at: new Date().toISOString(),
    };

    await database('ai_spec_drafts').insert(draft);

    const stored = await database('ai_spec_drafts')
      .where({ id: 'draft-pg-1' })
      .first();
    expect(stored.raw_response).toBe('{"productName":"Probe Product"}');
    // Nullable, and null while the draft is pending: the difference between a
    // proposal and a decision.
    expect(stored.applied_by).toBeNull();
    expect(stored.product_id).toBeNull();

    await expect(
      database('ai_spec_drafts').insert({
        ...draft,
        id: 'draft-pg-2',
        raw_response: null,
      }),
    ).rejects.toThrow();

    await expect(
      database('ai_spec_drafts').insert({
        ...draft,
        id: 'draft-pg-3',
        model_id: null,
      }),
    ).rejects.toThrow();
  }, 60000);
});
