/**
 * The provider half of the store (NXD-129 slice 2, NXD-143).
 *
 * Pinned: the provider reads every installation of its target with the
 * released manifest's runtime, and a pin the registry no longer answers for
 * is listed blocked; a report is validated, must belong to the target and
 * may not answer a revision that does not exist; the audit trail records a
 * change of what was observed, not every poll; IQ evidence is recorded only
 * from a report that matches the current desire, and only once; and an act
 * never overwrites a report.
 */

import type { Knex } from 'knex';
import {
  DIGEST_1,
  DIGEST_2,
  RIGHT_PIN,
  fakeWorld,
  sqliteRepository,
} from './__testUtils__/fixtures';
import type { InstallationsRepository } from './repository';
import { InstallationsService } from './service';

const GMP_SIGNATURE = { justification: 'Line 3 go-live, change CC-118.', pin: RIGHT_PIN };
const PROVIDER = 'provider:basel';
const OTHER_HASH = `sha256:${'f'.repeat(64)}`;

describe('InstallationsService — provider API', () => {
  let db: Knex;
  let repository: InstallationsRepository;
  let service: InstallationsService;
  let world: ReturnType<typeof fakeWorld>;

  beforeEach(async () => {
    ({ db, repository } = await sqliteRepository());
    service = new InstallationsService(repository);
    world = fakeWorld();
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function target(name = 'basel-line-3') {
    return service.registerTarget(
      { name, providerKind: 'docker-compose', providerSubject: PROVIDER },
      'user:default/admin',
    );
  }

  async function installed(targetId: string, overrides: Record<string, unknown> = {}) {
    return service.install(
      {
        targetId,
        artifactRef: 'pharma/oee@1.0.0',
        config: { EQUIPMENT_ID: 'filler-01' },
        signature: GMP_SIGNATURE,
        ...overrides,
      },
      world.ctx(),
    );
  }

  describe('reading desired state', () => {
    it('lists every installation of the target with the released runtime', async () => {
      const t = await target();
      const other = await target('basel-line-4');
      const a = await installed(t.id);
      await installed(other.id);
      await service.remove(a.id, { signature: GMP_SIGNATURE }, world.ctx());
      world.versions.get('pharma/oee@1.0.0')!.manifest!.spec!.runtime!.storage = [
        { name: 'data', mountPath: '/app/data' },
      ];

      const state = await service.desiredStateFor(t, world.readVersion);
      expect(state.target).toEqual({ id: t.id, name: 'basel-line-3', providerKind: 'docker-compose' });
      expect(state.installations).toHaveLength(1);
      const [item] = state.installations;
      // ABSENT is listed: the provider has to take it down.
      expect(item.desired).toEqual(
        expect.objectContaining({ state: 'ABSENT', imageDigest: DIGEST_1, revision: 2 }),
      );
      expect(item.runtime).toEqual(
        expect.objectContaining({ storage: [{ name: 'data', mountPath: '/app/data' }] }),
      );
      expect(item.blocked).toBeUndefined();
    });

    it('lists a pin the registry no longer answers for as blocked, without a runtime', async () => {
      const t = await target();
      await installed(t.id);
      world.versions.set('pharma/oee@1.0.0', {
        ...world.versions.get('pharma/oee@1.0.0')!,
        id: 'ver-reregistered',
      });
      const [item] = (await service.desiredStateFor(t, world.readVersion)).installations;
      expect(item.blocked).toMatch(/pinned as version ver-1.0.0, but the registry answers ver-reregistered/);
      expect(item.runtime).toBeUndefined();

      world.versions.delete('pharma/oee@1.0.0');
      const [gone] = (await service.desiredStateFor(t, world.readVersion)).installations;
      expect(gone.blocked).toMatch(/no longer has it/);
    });

    it('reads each pinned version once per request', async () => {
      const t = await target();
      await installed(t.id);
      await installed(t.id, { name: 'oee-second' });
      world.readVersion.mockClear();
      await service.desiredStateFor(t, world.readVersion);
      expect(world.readVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('reporting observed state', () => {
    it('refuses a malformed report, another target’s installation and a future revision', async () => {
      const t = await target();
      const other = await target('basel-line-4');
      const i = await installed(t.id);
      await expect(
        service.reportObserved(t, i.id, { state: 'GREAT', desiredRevision: 0 }, PROVIDER),
      ).rejects.toThrow(/state must be one of.*desiredRevision must be a positive integer/);
      await expect(
        service.reportObserved(t, i.id, { state: 'RUNNING', desiredRevision: 1, imageDigest: 'latest' }, PROVIDER),
      ).rejects.toThrow(/imageDigest must be sha256/);
      await expect(
        service.reportObserved(other, i.id, { state: 'RUNNING', desiredRevision: 1 }, PROVIDER),
      ).rejects.toThrow(/is not on runtime target "basel-line-4"/);
      await expect(
        service.reportObserved(t, i.id, { state: 'RUNNING', desiredRevision: 2 }, PROVIDER),
      ).rejects.toThrow(/cannot answer revision 2/);
      expect((await service.getInstallation(i.id)).observed).toBeUndefined();
    });

    it('records what was observed, and audits a change but not a repeat', async () => {
      const t = await target();
      const i = await installed(t.id);
      const pending = { state: 'PENDING', desiredRevision: 1, message: 'pulling image' };
      const after = await service.reportObserved(t, i.id, pending, PROVIDER);
      expect(after.observed).toEqual(
        expect.objectContaining({ state: 'PENDING', desiredRevision: 1, reportedBy: PROVIDER }),
      );
      await service.reportObserved(t, i.id, { ...pending, message: 'still pulling' }, PROVIDER);
      const stored = await service.getInstallation(i.id);
      expect(stored.observed?.message).toBe('still pulling');
      // Reports do not move the revision a person's act is checked against.
      expect(stored.revision).toBe(1);

      const events = await service.listAuditEvents(i.id);
      expect(events.map(e => e.eventType)).toEqual([
        'INSTALLATION_REQUESTED',
        'OBSERVED_STATE_CHANGED',
      ]);
      expect(events[1]).toEqual(
        expect.objectContaining({
          actor: PROVIDER,
          details: expect.objectContaining({
            before: null,
            after: expect.objectContaining({ state: 'PENDING', desiredRevision: 1 }),
            matchesDesired: false,
          }),
        }),
      );
    });

    it('records IQ evidence from a report matching the desire, once', async () => {
      const t = await target();
      const i = await installed(t.id);
      const running = {
        state: 'RUNNING',
        desiredRevision: 1,
        imageDigest: DIGEST_1,
        configHash: i.desired.configHash,
      };
      const after = await service.reportObserved(t, i.id, running, PROVIDER);
      expect(after.qualificationStatus).toBe('EVIDENCE_RECORDED');
      expect(await service.getInstallation(i.id)).toEqual(
        expect.objectContaining({ qualificationStatus: 'EVIDENCE_RECORDED', revision: 2 }),
      );
      const [iq] = await service.listQualifications(i.id);
      expect(iq).toEqual(
        expect.objectContaining({
          status: 'EVIDENCE_RECORDED',
          observedImageDigest: DIGEST_1,
          observedConfigHash: i.desired.configHash,
          observedTargetId: t.id,
          evidenceRecordedBy: PROVIDER,
          revision: 2,
        }),
      );
      expect(iq.evidenceRecordedAt).toBeInstanceOf(Date);
      expect(iq.qualifiedBy).toBeUndefined();

      await service.reportObserved(t, i.id, running, PROVIDER);
      expect((await service.listAuditEvents(i.id)).map(e => e.eventType)).toEqual([
        'INSTALLATION_REQUESTED',
        'OBSERVED_STATE_CHANGED',
        'IQ_EVIDENCE_RECORDED',
      ]);
    });

    it('records no evidence from a report that differs from the desire', async () => {
      const t = await target();
      const i = await installed(t.id);
      const base = { state: 'RUNNING', desiredRevision: 1, imageDigest: DIGEST_1, configHash: i.desired.configHash };
      for (const report of [
        { ...base, imageDigest: DIGEST_2 },
        { ...base, configHash: OTHER_HASH },
        { ...base, state: 'DEGRADED' },
        { state: 'RUNNING', desiredRevision: 1 },
      ]) {
        const after = await service.reportObserved(t, i.id, report, PROVIDER);
        expect(after.qualificationStatus).toBe('PENDING_EVIDENCE');
      }
      const [iq] = await service.listQualifications(i.id);
      expect(iq).toEqual(expect.objectContaining({ status: 'PENDING_EVIDENCE', revision: 1 }));
      expect(iq.observedImageDigest).toBeUndefined();
    });

    it('does not qualify a new revision with evidence of the old one', async () => {
      const t = await target();
      const i = await installed(t.id);
      await service.upgrade(i.id, { version: '1.1.0', signature: GMP_SIGNATURE }, world.ctx());
      // The provider still runs revision 1, exactly as revision 1 desired it.
      const after = await service.reportObserved(
        t,
        i.id,
        { state: 'RUNNING', desiredRevision: 1, imageDigest: DIGEST_1, configHash: i.desired.configHash },
        PROVIDER,
      );
      expect(after.qualificationStatus).toBe('PENDING_EVIDENCE');
      expect((await service.listQualifications(i.id)).map(q => q.status)).toEqual([
        'PENDING_EVIDENCE',
        'PENDING_EVIDENCE',
      ]);
    });

    it('records no evidence for an installation that is not GMP-relevant', async () => {
      world.state.classification = { gmpRelevant: false, source: 'PRODUCT' };
      const t = await target();
      const i = await installed(t.id, { signature: { confirmed: true } });
      const after = await service.reportObserved(
        t,
        i.id,
        { state: 'RUNNING', desiredRevision: 1, imageDigest: DIGEST_1, configHash: i.desired.configHash },
        PROVIDER,
      );
      expect(after.qualificationStatus).toBe('NOT_REQUIRED');
      expect(await service.listQualifications(i.id)).toEqual([]);
    });
  });

  it('an act after a report keeps the report', async () => {
    const t = await target();
    const i = await installed(t.id);
    await service.reportObserved(t, i.id, { state: 'RUNNING', desiredRevision: 1 }, PROVIDER);
    // The act read the installation before the report arrived.
    jest.spyOn(repository, 'getInstallation').mockResolvedValueOnce(i);
    await service.upgrade(i.id, { version: '1.1.0', signature: GMP_SIGNATURE }, world.ctx());
    expect((await service.getInstallation(i.id)).observed).toEqual(
      expect.objectContaining({ state: 'RUNNING', desiredRevision: 1 }),
    );
  });

  it('an act that read the installation before its evidence was recorded is refused as stale', async () => {
    const t = await target();
    const i = await installed(t.id);
    await service.reportObserved(
      t,
      i.id,
      { state: 'RUNNING', desiredRevision: 1, imageDigest: DIGEST_1, configHash: i.desired.configHash },
      PROVIDER,
    );
    jest.spyOn(repository, 'getInstallation').mockResolvedValueOnce(i);
    await expect(
      service.remove(i.id, { signature: GMP_SIGNATURE }, world.ctx()),
    ).rejects.toThrow(/changed while it was being updated/);
    expect((await service.getInstallation(i.id)).qualificationStatus).toBe('EVIDENCE_RECORDED');
  });
});
