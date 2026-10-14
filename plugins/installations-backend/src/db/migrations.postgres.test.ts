/**
 * The installations schema on PostgreSQL (NXD-139).
 *
 * SQLite backs the unit suites and has no triggers of this kind, so the two
 * properties only the database can keep are proven here: the act and audit
 * trails refuse UPDATE, DELETE and TRUNCATE (NXD-092's pattern), and target
 * and installation names are unique case-insensitively. And one property of
 * the provider API (NXD-143) that SQLite cannot prove for PostgreSQL: a
 * report and its IQ evidence are written in one transaction that the
 * append-only triggers let through.
 *
 * Follows NXD-005: skips without PostgreSQL, fails in CI where one exists.
 */

import type { Knex } from 'knex';
import { createTestSchema, type TestSchema } from '@internal/backend-test-utils';
import { DIGEST_1, RIGHT_PIN, fakeWorld } from '../__testUtils__/fixtures';
import { InstallationsRepository } from '../repository';
import { InstallationsService } from '../service';
import { up } from './migrations';

const actor = 'user:default/migration-probe';

describe('installations migration on PostgreSQL', () => {
  let schema: TestSchema;

  beforeAll(async () => {
    schema = await createTestSchema('installations_migrations', { migrate: up });
  }, 60000);

  afterAll(async () => {
    await schema?.dispose();
  }, 60000);

  function skip(what: string): boolean {
    if (!schema.available) {
      console.warn(
        `Skipping installations PostgreSQL test (${what}): no database. Run ` +
          '`docker compose -f docker-compose.test.yml up -d`.',
      );
      return true;
    }
    return false;
  }

  async function seed(db: Knex, suffix: string) {
    await db('runtime_targets').insert({
      id: `t-${suffix}`,
      name: `line-${suffix}`,
      display_name: 'Line',
      provider_kind: 'docker-compose',
      created_by: actor,
      created_at: new Date(),
      revision: 1,
    });
    await db('artifact_installations').insert({
      id: `i-${suffix}`,
      target_id: `t-${suffix}`,
      name: 'oee',
      artifact_namespace: 'pharma',
      artifact_name: 'oee',
      desired_state: 'PRESENT',
      desired_artifact_ref: 'pharma/oee@1.0.0',
      desired_version: '1.0.0',
      desired_artifact_version_id: 'v1',
      desired_image_repository: 'ghcr.io/pharma/oee',
      desired_image_digest: `sha256:${'a'.repeat(64)}`,
      desired_config: '{}',
      desired_config_hash: `sha256:${'0'.repeat(64)}`,
      desired_revision: 1,
      desired_changed_by: actor,
      desired_changed_at: new Date(),
      gmp_relevant: true,
      gmp_classification_source: 'PRODUCT',
      qualification_status: 'PENDING_EVIDENCE',
      created_by: actor,
      created_at: new Date(),
      revision: 1,
    });
  }

  it('applies twice, and keeps names unique regardless of case', async () => {
    if (skip('identity')) return;
    const db = schema.db;
    await up(db);
    await seed(db, 'a');
    await expect(
      db('runtime_targets').insert({
        id: 't-dup',
        name: 'LINE-A',
        display_name: 'dup',
        provider_kind: 'docker-compose',
        created_by: actor,
        created_at: new Date(),
        revision: 1,
      }),
    ).rejects.toThrow(/unique/i);
    const row = await db('artifact_installations').where({ id: 'i-a' }).first();
    await expect(
      db('artifact_installations').insert({ ...row, id: 'i-dup', name: 'OEE' }),
    ).rejects.toThrow(/unique/i);
    // The installation itself stays editable: desired state changes; the
    // trails that describe the changes do not.
    await db('artifact_installations').where({ id: 'i-a' }).update({ desired_state: 'ABSENT' });
    // The observed columns are written by the provider API (NXD-143).
    await db('artifact_installations')
      .where({ id: 'i-a' })
      .update({ observed_state: 'RUNNING', observed_reported_by: 'provider:basel' });
  }, 60000);

  it('makes the act records append-only', async () => {
    if (skip('acts')) return;
    const db = schema.db;
    await seed(db, 'b');
    await db('installation_acts').insert({
      id: 'act-1',
      installation_id: 'i-b',
      act: 'INSTALL',
      desired_revision: 1,
      artifact_ref: 'pharma/oee@1.0.0',
      image_digest: `sha256:${'a'.repeat(64)}`,
      config_hash: `sha256:${'0'.repeat(64)}`,
      justification: 'go-live',
      signed_by: actor,
      signed_at: '2026-10-07T00:00:00Z',
      gmp_relevant: true,
      gmp_classification_source: 'PRODUCT',
      reauth_method: 'signature-pin',
    });
    await expect(
      db('installation_acts').where({ id: 'act-1' }).update({ justification: 'edited' }),
    ).rejects.toThrow(/INSTALLATIONS_APPEND_ONLY: installation_acts .* UPDATE/);
    await expect(db('installation_acts').where({ id: 'act-1' }).delete()).rejects.toThrow(
      /INSTALLATIONS_APPEND_ONLY: installation_acts .* DELETE/,
    );
    await expect(db.raw('truncate installation_acts')).rejects.toThrow(
      /INSTALLATIONS_APPEND_ONLY: installation_acts .* TRUNCATE/,
    );
  }, 60000);

  it('makes the audit trail append-only', async () => {
    if (skip('audit')) return;
    const db = schema.db;
    await db('installation_audit_events').insert({
      id: 'ev-1',
      event_type: 'INSTALLATION_REQUESTED',
      installation_id: 'i-b',
      actor,
      occurred_at: new Date(),
      details: '{}',
    });
    await expect(
      db('installation_audit_events').where({ id: 'ev-1' }).update({ actor: 'someone-else' }),
    ).rejects.toThrow(/INSTALLATIONS_APPEND_ONLY: installation_audit_events .* UPDATE/);
    await expect(db('installation_audit_events').where({ id: 'ev-1' }).delete()).rejects.toThrow(
      /INSTALLATIONS_APPEND_ONLY: installation_audit_events .* DELETE/,
    );
    await expect(db.raw('truncate installation_audit_events')).rejects.toThrow(
      /INSTALLATIONS_APPEND_ONLY: installation_audit_events .* TRUNCATE/,
    );
    // Inserting still works.
    await db('installation_audit_events').insert({
      id: 'ev-2',
      event_type: 'UPGRADE_REQUESTED',
      installation_id: 'i-b',
      actor,
      occurred_at: new Date(),
      details: '{}',
    });
    expect(await db('installation_audit_events').count({ n: '*' }).first()).toEqual({ n: '2' });
  }, 60000);

  it('takes a provider report and its IQ evidence through the real service', async () => {
    if (skip('provider report')) return;
    const repository = await InstallationsRepository.create({ getClient: () => schema.db });
    const service = new InstallationsService(repository);
    const world = fakeWorld();
    const target = await service.registerTarget(
      { name: 'line-provider', providerKind: 'docker-compose', providerSubject: 'provider:basel' },
      actor,
    );
    const installed = await service.install(
      {
        targetId: target.id,
        artifactRef: 'pharma/oee@1.0.0',
        config: { EQUIPMENT_ID: 'filler-01' },
        signature: { justification: 'go-live', pin: RIGHT_PIN },
      },
      world.ctx(),
    );
    const report = {
      state: 'RUNNING',
      desiredRevision: 1,
      imageDigest: DIGEST_1,
      configHash: installed.desired.configHash,
    };
    await service.reportObserved(target, installed.id, report, 'provider:basel');
    await service.reportObserved(target, installed.id, report, 'provider:basel');
    const stored = await service.getInstallation(installed.id);
    expect(stored).toEqual(
      expect.objectContaining({ qualificationStatus: 'EVIDENCE_RECORDED', revision: 2 }),
    );
    expect(stored.observed?.reportedAt).toBeInstanceOf(Date);
    const [iq] = await service.listQualifications(installed.id);
    expect(iq).toEqual(
      expect.objectContaining({ status: 'EVIDENCE_RECORDED', observedTargetId: target.id }),
    );
    expect(iq.evidenceRecordedAt).toBeInstanceOf(Date);
    expect((await service.listAuditEvents(installed.id)).map(e => e.eventType)).toEqual([
      'INSTALLATION_REQUESTED',
      'OBSERVED_STATE_CHANGED',
      'IQ_EVIDENCE_RECORDED',
    ]);
  }, 60000);

  it('keeps one IQ record per desired revision', async () => {
    if (skip('qualifications')) return;
    const db = schema.db;
    const iq = {
      installation_id: 'i-b',
      desired_revision: 1,
      status: 'PENDING_EVIDENCE',
      expected_image_digest: `sha256:${'a'.repeat(64)}`,
      expected_config_hash: `sha256:${'0'.repeat(64)}`,
      expected_target_id: 't-b',
      created_at: new Date(),
      revision: 1,
    };
    await db('installation_qualifications').insert({ ...iq, id: 'iq-1' });
    await expect(db('installation_qualifications').insert({ ...iq, id: 'iq-2' })).rejects.toThrow(
      /unique/i,
    );
  }, 60000);
});
