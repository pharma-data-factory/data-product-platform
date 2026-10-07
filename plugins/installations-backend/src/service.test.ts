/**
 * The installations store's rules (NXD-139).
 *
 * Pinned: only a RELEASED version with a release build is installable; the
 * configuration is validated against the version's own `spec.config` and a
 * secret is held by reference only; a GMP-relevant act needs a justification
 * and the PIN, checked after everything else, so a refused act costs no PIN
 * attempt (NXD-128's order); a non-GMP act needs a confirmation; upgrade and
 * remove change desired state; every act is recorded in one transaction.
 */

import type { Knex } from 'knex';
import { NotAllowedError } from '@backstage/errors';
import {
  DIGEST_1,
  DIGEST_2,
  OPERATOR,
  RIGHT_PIN,
  fakeWorld,
  sqliteRepository,
} from './__testUtils__/fixtures';
import type { InstallationsRepository } from './repository';
import { InstallationsService } from './service';

const GMP_SIGNATURE = { justification: 'Line 3 go-live, change CC-118.', pin: RIGHT_PIN };

describe('InstallationsService', () => {
  let db: Knex;
  let repository: InstallationsRepository;
  let service: InstallationsService;
  let world: ReturnType<typeof fakeWorld>;
  let targetId: string;

  beforeEach(async () => {
    ({ db, repository } = await sqliteRepository());
    service = new InstallationsService(repository);
    world = fakeWorld();
    targetId = (
      await service.registerTarget(
        { name: 'basel-line-3', providerKind: 'docker-compose', providerSubject: 'provider:basel' },
        'user:default/admin',
      )
    ).id;
  });

  afterEach(async () => {
    await db?.destroy();
  });

  function install(overrides: Record<string, unknown> = {}) {
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

  describe('runtime targets', () => {
    it('registers a target once, audited', async () => {
      const [target] = await service.listTargets();
      expect(target).toEqual(
        expect.objectContaining({
          name: 'basel-line-3',
          providerKind: 'docker-compose',
          providerSubject: 'provider:basel',
        }),
      );
      await expect(
        service.registerTarget({ name: 'BASEL-line-3', providerKind: 'docker-compose' }, 'x'),
      ).rejects.toThrow(/invalid target name/i);
      await expect(
        service.registerTarget({ name: 'basel-line-3', providerKind: 'docker-compose' }, 'x'),
      ).rejects.toThrow(/already exists/);
      expect(await repository.listAuditEvents({ targetId })).toEqual([
        expect.objectContaining({ eventType: 'TARGET_REGISTERED', actor: 'user:default/admin' }),
      ]);
    });

    it('refuses a provider kind that is not a name', async () => {
      await expect(
        service.registerTarget({ name: 'x', providerKind: 'Docker Compose' }, 'a'),
      ).rejects.toThrow(/invalid providerKind/i);
    });
  });

  describe('what may be installed', () => {
    it('installs a RELEASED version at the digest its release recorded', async () => {
      const installation = await install();
      expect(installation.desired).toEqual(
        expect.objectContaining({
          state: 'PRESENT',
          artifactRef: 'pharma/oee@1.0.0',
          artifactVersionId: 'ver-1.0.0',
          imageRepository: 'ghcr.io/pharma/oee',
          imageDigest: DIGEST_1,
          config: { EQUIPMENT_ID: 'filler-01' },
          revision: 1,
          changedBy: OPERATOR,
        }),
      );
      expect(installation.name).toBe('oee');
      expect(installation.observed).toBeUndefined();
      expect(await service.getInstallation(installation.id)).toEqual(installation);
    });

    it('refuses a version that is not RELEASED', async () => {
      await expect(install({ artifactRef: 'pharma/oee@2.0.0' })).rejects.toThrow(
        /lifecycle is CERTIFIED; only a RELEASED version may be installed/,
      );
    });

    it('refuses a RELEASED version without a release build', async () => {
      await expect(install({ artifactRef: 'pharma/oee@0.9.0' })).rejects.toThrow(
        /no recorded release build/,
      );
    });

    it('refuses an unknown version, a malformed coordinate and an unknown target', async () => {
      await expect(install({ artifactRef: 'pharma/oee@9.9.9' })).rejects.toThrow(
        /not in the registry/,
      );
      await expect(install({ artifactRef: 'oee' })).rejects.toThrow(/namespace\/name@version/);
      await expect(install({ targetId: 'nope' })).rejects.toThrow(/Runtime target nope not found/);
    });

    it('validates the configuration against the version’s spec.config', async () => {
      await expect(install({ config: {} })).rejects.toThrow(/config\.EQUIPMENT_ID is required/);
      await expect(
        install({ config: { EQUIPMENT_ID: 'f', MQTT_PORT: 'x', OTHER: '1' } }),
      ).rejects.toThrow(/MQTT_PORT must be a number; config\.OTHER is not declared/);
    });

    it('refuses a literal secret value and stores a reference', async () => {
      await expect(
        install({ config: { EQUIPMENT_ID: 'f', MQTT_PASSWORD: 'Sup3rS3cret!' } }),
      ).rejects.toThrow(/MQTT_PASSWORD is a secret: give a reference/);
      const installation = await install({
        config: { EQUIPMENT_ID: 'f', MQTT_PASSWORD: { secretRef: 'basel/mqtt-password' } },
      });
      expect(installation.desired.config.MQTT_PASSWORD).toEqual({
        secretRef: 'basel/mqtt-password',
      });
    });

    it('refuses a second installation of the same name on a target', async () => {
      await install();
      await expect(install()).rejects.toThrow(/already has an installation named "oee"/);
      const second = await install({ name: 'oee-line-b' });
      expect(second.name).toBe('oee-line-b');
    });
  });

  describe('a GMP-relevant act is an electronic signature', () => {
    it('needs a justification and the PIN, and records both', async () => {
      await expect(install({ signature: { pin: RIGHT_PIN } })).rejects.toThrow(
        /GMP-relevant: installing it needs a justification and your signing PIN/,
      );
      await expect(
        install({ signature: { justification: 'go-live' } }),
      ).rejects.toThrow(/needs your signing PIN/);
      const installation = await install();
      expect(installation.gmpRelevant).toBe(true);
      expect(installation.qualificationStatus).toBe('PENDING_EVIDENCE');
      expect(await service.listActs(installation.id)).toEqual([
        expect.objectContaining({
          act: 'INSTALL',
          desiredRevision: 1,
          artifactRef: 'pharma/oee@1.0.0',
          imageDigest: DIGEST_1,
          configHash: installation.desired.configHash,
          justification: GMP_SIGNATURE.justification,
          signedBy: OPERATOR,
          gmpRelevant: true,
          gmpClassificationSource: 'PRODUCT',
          reauthMethod: 'signature-pin',
        }),
      ]);
    });

    it('a wrong PIN changes nothing', async () => {
      await expect(
        install({ signature: { justification: 'x', pin: 'wrong' } }),
      ).rejects.toThrow(NotAllowedError);
      expect(await service.listInstallations()).toEqual([]);
    });

    it('a refused act costs no PIN attempt', async () => {
      for (const refused of [
        { artifactRef: 'pharma/oee@2.0.0' },
        { artifactRef: 'pharma/oee@0.9.0' },
        { config: { EQUIPMENT_ID: 'f', MQTT_PASSWORD: 'literal' } },
        { targetId: 'nope' },
      ]) {
        await expect(install(refused)).rejects.toThrow();
      }
      await install();
      await expect(install()).rejects.toThrow(/already has an installation/);
      // One PIN check: the act that succeeded.
      expect(world.verifyPin).toHaveBeenCalledTimes(1);
    });

    it('checks in NXD-128’s order: allowed, then classification, then PIN', async () => {
      await install();
      expect(world.state.calls).toEqual(['read', 'classify', 'pin']);
    });

    it('treats an unanswered classification as GMP-relevant', async () => {
      world.state.classification = { gmpRelevant: true, source: 'UNAVAILABLE' };
      await expect(install({ signature: { confirmed: true } })).rejects.toThrow(
        /GMP-relevant/,
      );
      const installation = await install();
      expect(installation.gmpClassificationSource).toBe('UNAVAILABLE');
    });

    it('opens an IQ record awaiting the provider’s evidence', async () => {
      const installation = await install();
      expect(await service.listQualifications(installation.id)).toEqual([
        expect.objectContaining({
          desiredRevision: 1,
          status: 'PENDING_EVIDENCE',
          expectedImageDigest: DIGEST_1,
          expectedConfigHash: installation.desired.configHash,
          expectedTargetId: targetId,
        }),
      ]);
    });
  });

  describe('a product that is not GMP-relevant', () => {
    beforeEach(() => {
      world.state.classification = { gmpRelevant: false, source: 'NO_PRODUCT' };
    });

    it('needs a confirmation, no PIN, and is recorded', async () => {
      await expect(install({ signature: {} })).rejects.toThrow(
        /Confirm installing this installation/,
      );
      const installation = await install({ signature: { confirmed: true } });
      expect(world.verifyPin).not.toHaveBeenCalled();
      expect(installation.qualificationStatus).toBe('NOT_REQUIRED');
      expect(await service.listQualifications(installation.id)).toEqual([]);
      const [act] = await service.listActs(installation.id);
      expect(act).toEqual(
        expect.objectContaining({
          act: 'INSTALL',
          gmpRelevant: false,
          gmpClassificationSource: 'NO_PRODUCT',
          justification: '',
        }),
      );
      expect(act.reauthMethod).toBeUndefined();
    });
  });

  describe('upgrade and remove change desired state', () => {
    it('upgrades to another released version, at that version’s digest', async () => {
      const installed = await install();
      const upgraded = await service.upgrade(
        installed.id,
        { version: '1.1.0', signature: GMP_SIGNATURE },
        world.ctx(),
      );
      expect(upgraded.desired).toEqual(
        expect.objectContaining({
          state: 'PRESENT',
          artifactRef: 'pharma/oee@1.1.0',
          imageDigest: DIGEST_2,
          config: { EQUIPMENT_ID: 'filler-01' },
          revision: 2,
        }),
      );
      expect(await service.getInstallation(installed.id)).toEqual(upgraded);
      expect((await service.listActs(installed.id)).map(a => [a.act, a.desiredRevision])).toEqual([
        ['INSTALL', 1],
        ['UPGRADE', 2],
      ]);
      expect(
        (await service.listQualifications(installed.id)).map(q => [q.desiredRevision, q.status]),
      ).toEqual([
        [1, 'PENDING_EVIDENCE'],
        [2, 'PENDING_EVIDENCE'],
      ]);
    });

    it('upgrades the configuration alone, and refuses an upgrade that changes nothing', async () => {
      const installed = await install();
      await expect(
        service.upgrade(installed.id, { signature: GMP_SIGNATURE }, world.ctx()),
      ).rejects.toThrow(/must change the version or the configuration/);
      const upgraded = await service.upgrade(
        installed.id,
        { config: { EQUIPMENT_ID: 'filler-02' }, signature: GMP_SIGNATURE },
        world.ctx(),
      );
      expect(upgraded.desired.config).toEqual({ EQUIPMENT_ID: 'filler-02' });
      expect(upgraded.desired.configHash).not.toBe(installed.desired.configHash);
      // The refused upgrade cost no PIN attempt: install and this upgrade.
      expect(world.verifyPin).toHaveBeenCalledTimes(2);
    });

    it('refuses an upgrade to a version that is not installable', async () => {
      const installed = await install();
      await expect(
        service.upgrade(installed.id, { version: '2.0.0', signature: GMP_SIGNATURE }, world.ctx()),
      ).rejects.toThrow(/only a RELEASED version/);
    });

    it('removes by desiring ABSENT; the record and its trail stay', async () => {
      const installed = await install();
      const removed = await service.remove(installed.id, { signature: GMP_SIGNATURE }, world.ctx());
      expect(removed.desired).toEqual(
        expect.objectContaining({
          state: 'ABSENT',
          artifactRef: 'pharma/oee@1.0.0',
          revision: 2,
        }),
      );
      await expect(
        service.remove(installed.id, { signature: GMP_SIGNATURE }, world.ctx()),
      ).rejects.toThrow(/already desired ABSENT/);
      await expect(
        service.upgrade(installed.id, { version: '1.1.0', signature: GMP_SIGNATURE }, world.ctx()),
      ).rejects.toThrow(/cannot be upgraded: it is desired ABSENT/);
      expect((await service.listActs(installed.id)).map(a => a.act)).toEqual([
        'INSTALL',
        'REMOVE',
      ]);
      // Removing opens no IQ record.
      expect(await service.listQualifications(installed.id)).toHaveLength(1);
    });

    it('a removal of a GMP-relevant product is signed too', async () => {
      const installed = await install();
      await expect(
        service.remove(installed.id, { signature: { confirmed: true } }, world.ctx()),
      ).rejects.toThrow(/removing it needs a justification/);
    });
  });

  describe('the audit trail', () => {
    it('records each act with the state before and after', async () => {
      const installed = await install();
      await service.upgrade(installed.id, { version: '1.1.0', signature: GMP_SIGNATURE }, world.ctx());
      const events = await service.listAuditEvents(installed.id);
      expect(events.map(e => e.eventType)).toEqual([
        'INSTALLATION_REQUESTED',
        'UPGRADE_REQUESTED',
      ]);
      expect(events[1].details).toEqual(
        expect.objectContaining({
          before: expect.objectContaining({ artifactRef: 'pharma/oee@1.0.0', revision: 1 }),
          after: expect.objectContaining({ artifactRef: 'pharma/oee@1.1.0', revision: 2 }),
          gmpRelevant: true,
        }),
      );
    });

    it('writes nothing when the installation moved underneath the act', async () => {
      const installed = await install();
      // Another writer gets there between this act's read and its write.
      await db('artifact_installations').where({ id: installed.id }).update({ revision: 7 });
      jest.spyOn(repository, 'getInstallation').mockResolvedValueOnce(installed);
      await expect(
        service.upgrade(installed.id, { version: '1.1.0', signature: GMP_SIGNATURE }, world.ctx()),
      ).rejects.toThrow(/changed while it was being updated/);
      expect(await service.listActs(installed.id)).toHaveLength(1);
      expect(await service.listAuditEvents(installed.id)).toHaveLength(1);
    });

    it('offers no way to change or remove a recorded act', () => {
      // The repository's only writes to the trails are inserts; the database
      // refuses the rest on PostgreSQL (migrations.postgres.test.ts).
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository));
      expect(methods.filter(m => /^(update|delete|remove)/i.test(m))).toEqual([]);
    });
  });
});
