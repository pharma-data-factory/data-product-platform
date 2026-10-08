import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
/**
 * Artifact Registry rules.
 *
 * The invariants here are what make the registry trustworthy as the thing a
 * Product pins its dependencies against: one owner per namespace, one meaning
 * per coordinate, and nothing published merely by being registered.
 */

import knex, { Knex } from 'knex';
import {
  ARTIFACT_MANIFEST_API_VERSION,
  type ArtifactManifest,
} from '@internal/platform-common';
import { ArtifactRegistryRepository } from './repository';
import { ArtifactRegistryService } from './service';

const actor = 'user:default/publisher';
// NXD-146: segregation of duties needs three people for a full walk.
const reviewer = 'user:default/reviewer';
const certifier = 'user:default/certifier';

function manifest(overrides: {
  namespace?: string;
  name?: string;
  version?: string;
  kind?: string;
  spec?: Record<string, unknown>;
  displayName?: string;
  tags?: string[];
} = {}): unknown {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: overrides.kind ?? 'CONNECTOR',
    metadata: {
      namespace: overrides.namespace ?? 'acme',
      name: overrides.name ?? 'sap-odata',
      version: overrides.version ?? '1.0',
      ...(overrides.displayName ? { displayName: overrides.displayName } : {}),
      ...(overrides.tags ? { tags: overrides.tags } : {}),
    },
    ...(overrides.spec ? { spec: overrides.spec } : {}),
  };
}

/**
 * Asserts that a write was refused by the database, matching on the message.
 *
 * Deliberately not `expect(...).rejects.toThrow()`. better-sqlite3 is a native
 * module: its binding is loaded once per jest worker process, so the
 * `SqliteError` it raises carries the `Error` intrinsic of whichever module
 * realm loaded it first. When another suite in the same worker got there
 * first, `error instanceof Error` is false in this file and `toThrow` reports
 * "Received function did not throw" — even though the constraint fired and
 * the message is right there. Matching the message is realm-blind. See
 * NXD-016.
 */
async function expectRefusedByDatabase(
  // A knex query builder is a thenable, not a Promise; awaiting it here is
  // what executes the statement.
  write: PromiseLike<unknown>,
  pattern: RegExp,
): Promise<void> {
  let raised: unknown;
  let succeeded = false;
  try {
    await write;
    succeeded = true;
  } catch (error) {
    raised = error;
  }
  if (succeeded) {
    throw new Error(
      `Expected the database to refuse this write with ${pattern}, but it ` +
        `was accepted — the constraint is missing.`,
    );
  }
  expect(String((raised as { message?: unknown })?.message ?? raised)).toMatch(
    pattern,
  );
}

describe('ArtifactRegistryService', () => {
  let db: Knex;
  let service: ArtifactRegistryService;
  let releaseStatus: jest.Mock;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('select 1');
    const repository = await ArtifactRegistryRepository.create({
      getClient: () => db,
    });
    releaseStatus = jest.fn(async (c: { namespace: string; name: string; version: string }) => ({
      ...c,
      governed: false,
      released: false,
      productVersions: [],
    }));
    service = new ArtifactRegistryService(repository, undefined, releaseStatus);
    await service.createPublisher(
      { namespace: 'acme', displayName: 'Acme Industrial' },
      actor,
    );
  });

  afterEach(async () => {
    await db?.destroy();
  });

  describe('publishers', () => {
    it('owns a namespace exclusively', async () => {
      // Two publishers on one namespace would make provenance meaningless.
      await expect(
        service.createPublisher(
          { namespace: 'acme', displayName: 'Someone Else' },
          actor,
        ),
      ).rejects.toThrow(/already owned/i);
    });

    it('treats a namespace differing only in case as taken', async () => {
      await expect(
        service.createPublisher(
          { namespace: 'ACME', displayName: 'Shouting Acme' },
          actor,
        ),
      ).rejects.toThrow(/namespace/i);
    });

    it('rejects a namespace that is not a valid segment', async () => {
      for (const namespace of ['', 'Acme Corp', 'acme_corp', '-acme', 'a/b']) {
        await expect(
          service.createPublisher({ namespace, displayName: 'X' }, actor),
        ).rejects.toThrow(/namespace/i);
      }
    });

    it('requires a display name', async () => {
      await expect(
        service.createPublisher(
          { namespace: 'other', displayName: '  ' },
          actor,
        ),
      ).rejects.toThrow(/displayName/i);
    });
  });

  describe('registration', () => {
    it('creates the artifact on first version and reuses it afterwards', async () => {
      const first = await service.registerArtifactVersion(manifest(), actor);
      expect(first.artifactCreated).toBe(true);
      expect(first.artifact.kind).toBe('CONNECTOR');
      expect(first.version.version).toBe('1.0');

      const second = await service.registerArtifactVersion(
        manifest({ version: '1.1' }),
        actor,
      );
      expect(second.artifactCreated).toBe(false);
      expect(second.artifact.id).toBe(first.artifact.id);

      const versions = await service.listArtifactVersions(first.artifact.id);
      expect(versions.map(v => v.version)).toEqual(['1.0', '1.1']);
    });

    it('starts every version in DRAFT', async () => {
      // Registering content must never be the same act as publishing it.
      const { version } = await service.registerArtifactVersion(
        manifest(),
        actor,
      );
      expect(version.lifecycle).toBe('DRAFT');
    });

    it('refuses an invalid manifest with all of its problems', async () => {
      await expect(
        service.registerArtifactVersion(
          { apiVersion: 'wrong', kind: 'NOPE', metadata: {} },
          actor,
        ),
      ).rejects.toThrow(/Invalid artifact manifest/);
    });

    describe('runtime, interfaces and config (NXD-130)', () => {
      const runnable = {
        runtime: {
          kind: 'container',
          image: { repository: 'ghcr.io/acme/sap-odata' },
          ports: [{ name: 'http', containerPort: 8080 }],
          health: { type: 'http', port: 'http', path: '/health' },
        },
        interfaces: [
          { name: 'orders', type: 'api', direction: 'provides', port: 'http' },
        ],
        config: [{ key: 'SAP_URL', type: 'url', required: true }],
      };

      it('registers a manifest that says how it runs, and keeps it', async () => {
        const { version } = await service.registerArtifactVersion(
          manifest({ spec: runnable }),
          actor,
        );
        expect(version.manifest?.spec?.runtime).toEqual(runnable.runtime);
      });

      it('refuses malformed sections at the gate, naming every field', async () => {
        const broken = {
          ...runnable,
          runtime: {
            ...runnable.runtime,
            image: { repository: 'ghcr.io/acme/sap-odata:1.0' },
            restart: 'always',
          },
          interfaces: [
            { name: 'orders', type: 'api', direction: 'provides', port: 'grpc' },
          ],
          config: [{ key: 'SAP_TOKEN', type: 'secret', required: true, defaultValue: 'x' }],
        };
        const refusal = service.registerArtifactVersion(
          manifest({ spec: broken }),
          actor,
        );
        await expect(refusal).rejects.toThrow(/spec\.runtime\.image\.repository/);
        await expect(refusal).rejects.toThrow(/spec\.runtime\.restart is not a known field/);
        await expect(refusal).rejects.toThrow(/spec\.interfaces\[0\]\.port "grpc" names no port/);
        await expect(refusal).rejects.toThrow(/spec\.config\[0\]\.defaultValue is not allowed here/);
      });

      it('refuses runtime on a kind that does not run', async () => {
        await expect(
          service.registerArtifactVersion(
            manifest({ kind: 'POLICY_PACK', spec: { runtime: runnable.runtime } }),
            actor,
          ),
        ).rejects.toThrow(/spec\.runtime is only meaningful for kinds DATA_PRODUCT, CONNECTOR/);
      });
    });

    it('refuses a namespace no publisher owns', async () => {
      await expect(
        service.registerArtifactVersion(
          manifest({ namespace: 'unclaimed' }),
          actor,
        ),
      ).rejects.toThrow(/No publisher owns namespace "unclaimed"/);
    });

    it('refuses to re-register the same coordinate', async () => {
      // A Product pinning acme/sap-odata@1.0 has to keep meaning one thing.
      await service.registerArtifactVersion(manifest(), actor);
      await expect(
        service.registerArtifactVersion(manifest(), actor),
      ).rejects.toThrow(/acme\/sap-odata@1\.0 is already registered/);
    });

    it('refuses to change an artifact kind between versions', async () => {
      await service.registerArtifactVersion(manifest(), actor);
      await expect(
        service.registerArtifactVersion(
          manifest({ version: '2.0', kind: 'TEMPLATE' }),
          actor,
        ),
      ).rejects.toThrow(/is a CONNECTOR; manifest declares TEMPLATE/);
    });

    it('stores the manifest verbatim with the version', async () => {
      const source = manifest({
        spec: { sourceRef: 'github.com/acme/sap-odata', brokerUrl: 'tcp://x' },
      }) as ArtifactManifest;
      const { version } = await service.registerArtifactVersion(source, actor);
      expect(version.manifest).toEqual(source);
      expect(version.sourceRef).toBe('github.com/acme/sap-odata');
    });

    it('defaults the display name to the artifact name', async () => {
      const { artifact } = await service.registerArtifactVersion(
        manifest(),
        actor,
      );
      expect(artifact.displayName).toBe('sap-odata');
    });
  });

  describe('dependencies', () => {
    it('accepts a dependency that is already registered', async () => {
      await service.registerArtifactVersion(
        manifest({ name: 'base', version: '1.0', kind: 'COMPONENT' }),
        actor,
      );
      const { version } = await service.registerArtifactVersion(
        manifest({ spec: { dependencies: ['acme/base@1.0'] } }),
        actor,
      );
      expect(version.dependencies).toEqual(['acme/base@1.0']);
    });

    it('refuses a dependency on a version that does not exist', async () => {
      // An unresolvable dependency is not reproducible, and Phase 4 impact
      // analysis has to be able to walk the graph without dead coordinates.
      await service.registerArtifactVersion(
        manifest({ name: 'base', version: '1.0', kind: 'COMPONENT' }),
        actor,
      );
      await expect(
        service.registerArtifactVersion(
          manifest({ spec: { dependencies: ['acme/base@9.9'] } }),
          actor,
        ),
      ).rejects.toThrow(/Unresolvable artifact dependencies: acme\/base@9\.9/);
    });

    it('refuses a dependency range at the manifest boundary', async () => {
      await expect(
        service.registerArtifactVersion(
          manifest({ spec: { dependencies: ['acme/base@^1.0'] } }),
          actor,
        ),
      ).rejects.toThrow(/Invalid artifact manifest/);
    });
  });

  describe('resolution', () => {
    it('resolves a registered coordinate and nothing else', async () => {
      await service.registerArtifactVersion(manifest(), actor);

      expect(await service.resolveRef('acme/sap-odata@1.0')).toBeDefined();
      expect(await service.resolveRef('acme/sap-odata@2.0')).toBeUndefined();
      expect(await service.resolveRef('acme/absent@1.0')).toBeUndefined();
      expect(await service.resolveRef('not-a-ref')).toBeUndefined();
    });

    it('lists artifacts filtered by kind and namespace', async () => {
      await service.registerArtifactVersion(manifest(), actor);
      await service.registerArtifactVersion(
        manifest({ name: 'uns', kind: 'COMPONENT' }),
        actor,
      );

      expect((await service.listArtifacts()).map(a => a.name)).toEqual([
        'sap-odata',
        'uns',
      ]);
      expect(
        (await service.listArtifacts({ kind: 'COMPONENT' })).map(a => a.name),
      ).toEqual(['uns']);
      expect(await service.listArtifacts({ namespace: 'other' })).toEqual([]);
    });
  });

  describe('database-level identity', () => {
    it('rejects a duplicate coordinate written behind the service', async () => {
      const { artifact } = await service.registerArtifactVersion(
        manifest(),
        actor,
      );
      await expectRefusedByDatabase(
        db('artifacts').insert({
          id: 'forced',
          namespace: 'ACME',
          name: 'SAP-ODATA',
          kind: 'CONNECTOR',
          display_name: 'x',
          publisher_id: artifact.publisherId,
          tags: '[]',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        }),
        /unique/i,
      );
    });

    it('rejects a duplicate version written behind the service', async () => {
      const { artifact } = await service.registerArtifactVersion(
        manifest(),
        actor,
      );
      await expectRefusedByDatabase(
        db('artifact_versions').insert({
          id: 'forced',
          artifact_id: artifact.id,
          version: '1.0',
          lifecycle: 'DRAFT',
          dependencies: '[]',
          created_by: actor,
          created_at: new Date(),
          revision: 1,
        }),
        /unique/i,
      );
    });
  });

  describe('concurrent transitions', () => {
    // Each transition reads the version, checks the precondition and writes,
    // so the precondition is only binding if the write is guarded on the
    // revision it was checked against.
    it('lets one of two racing submissions win and tells the other to re-read', async () => {
      const { version } = await service.registerArtifactVersion(
        manifest(),
        actor,
      );

      const outcomes = await Promise.allSettled([
        service.submitArtifactVersion(version.id, actor),
        service.submitArtifactVersion(version.id, actor),
      ]);

      expect(outcomes.map(o => o.status).sort()).toEqual([
        'fulfilled',
        'rejected',
      ]);
      const rejected = outcomes.find(o => o.status === 'rejected');
      expect((rejected as PromiseRejectedResult).reason.message).toMatch(
        /changed while it was being updated/,
      );

      // The winner's write stands, and the revision advanced exactly once.
      const stored = await service.getArtifactVersionById(version.id);
      expect([stored?.lifecycle, stored?.revision]).toEqual(['TESTING', 2]);
    });
  });

  // NXD-075. P7-S2 wired the namespace check to certify and publish only, with
  // an optional `actor` and an `if (actor)` guard — so submit, review and
  // deprecate reached the service with no actor and resolved no namespace. A
  // restriction that holds for the last two acts of a lifecycle and not the
  // first three is not a restriction.
  describe('every lifecycle transition resolves the namespace', () => {
    const member = 'user:default/acme-release-manager';
    const outsider = 'user:default/someone-else';

    /** A publisher that has restricted who may act, and one version in it. */
    async function restrictedNamespace() {
      await service.createPublisher(
        {
          namespace: 'locked',
          displayName: 'Locked Namespace',
          memberGroups: [member, reviewer, certifier],
        },
        actor,
      );
      const { version } = await service.registerArtifactVersion(
        manifest({ namespace: 'locked', name: 'thing' }),
        member,
      );
      return version;
    }

    it('refuses each of the five transitions to a non-member', async () => {
      const version = await restrictedNamespace();

      // Walked in order by the member, with the outsider refused at each step.
      // A single-step test would pass against the old code for certify and
      // publish and tell us nothing about the other three.
      // Each step by the member whose turn it is (NXD-146 keeps the
      // submitter from reviewing or certifying).
      const steps: Array<[string, string, (actor: string) => Promise<unknown>]> = [
        ['submit', member, a => service.submitArtifactVersion(version.id, a)],
        ['review', reviewer, a => service.reviewArtifactVersion(version.id, a)],
        ['certify', certifier, a => service.certifyArtifactVersion(version.id, a)],
        ['publish', member, a => service.publishArtifactVersion(version.id, a)],
        ['deprecate', member, a => service.deprecateArtifactVersion(version.id, a)],
      ];

      for (const [name, insider, act] of steps) {
        await expect(act(outsider)).rejects.toThrow(
          new RegExp(`is not a member of publisher "locked".*cannot ${name}`),
        );
        // The member may proceed, which is what makes the refusal a
        // restriction rather than a block.
        await expect(act(insider)).resolves.toBeDefined();
      }

      const stored = await service.getArtifactVersionById(version.id);
      expect(stored?.lifecycle).toBe('DEPRECATED');
    });

    it('lets anyone authorised act when the publisher declares no members', async () => {
      // `acme` is created in beforeEach with no memberGroups. An unrestricted
      // namespace must stay unrestricted — the check is opt-in.
      const { version } = await service.registerArtifactVersion(
        manifest(),
        actor,
      );
      await expect(
        service.submitArtifactVersion(version.id, outsider),
      ).resolves.toBeDefined();
    });
  });

  /**
   * NXD-137, on the data of the NXD-135 live run: the nexora.yaml read from
   * oee-e2e-test-20261005-d at tag v1.0.0, and the image GHCR answered for it.
   */
  describe('release builds (NXD-137)', () => {
    const LIVE_MANIFEST = readFileSync(
      join(__dirname, '__fixtures__', 'oee-e2e-test-20261005-d.nexora.yaml'),
      'utf8',
    );
    const LIVE_BUILD = {
      imageRepository: 'ghcr.io/pharma-data-factory/oee-e2e-test-20261005-d',
      imageDigest:
        'sha256:6e696d5fc0b22f352bd5980c906f34d3af9c72e9a34ba70adc99453f752fd810',
      commitSha: '431fd71d0fcb5c9c56773f58fb451435db8f1c87',
      releaseUrl:
        'https://github.com/pharma-data-factory/oee-e2e-test-20261005-d/releases/tag/v1.0.0',
    };

    beforeEach(async () => {
      await service.createPublisher(
        { namespace: 'pharma-data-factory', displayName: 'Pharma Data Factory' },
        actor,
      );
    });

    const register = () =>
      service.registerReleaseBuild({ manifest: LIVE_MANIFEST, release: LIVE_BUILD }, actor);

    it('registers the live build as a DRAFT version carrying its digest', async () => {
      const result = await register();
      expect(result.alreadyRegistered).toBe(false);
      expect(result.artifact).toMatchObject({
        namespace: 'pharma-data-factory',
        name: 'oee-e2e-test-20261005-d',
        kind: 'DATA_PRODUCT',
      });
      expect(result.version).toMatchObject({ version: '1.0.0', lifecycle: 'DRAFT' });
      const stored = await service.resolveRef(
        'pharma-data-factory/oee-e2e-test-20261005-d@1.0.0',
      );
      expect(stored?.releaseBuild).toEqual(LIVE_BUILD);
      expect(stored?.manifest?.spec?.runtime?.image.repository).toBe(
        LIVE_BUILD.imageRepository,
      );
    });

    it('answers the same build again as already registered', async () => {
      const first = await register();
      const second = await register();
      expect(second.alreadyRegistered).toBe(true);
      expect(second.version.id).toBe(first.version.id);
    });

    it('refuses a different image under the same version', async () => {
      await register();
      await expect(
        service.registerReleaseBuild(
          {
            manifest: LIVE_MANIFEST,
            release: { ...LIVE_BUILD, imageDigest: `sha256:${'0'.repeat(64)}` },
          },
          actor,
        ),
      ).rejects.toThrow(/already registered as sha256:6e696d5f.*bump metadata\.version/);
    });

    it('refuses a build of an image the manifest does not run', async () => {
      await expect(
        service.registerReleaseBuild(
          {
            manifest: LIVE_MANIFEST,
            release: { ...LIVE_BUILD, imageRepository: 'ghcr.io/someone/else' },
          },
          actor,
        ),
      ).rejects.toThrow(/Invalid release build: .*is not the manifest's spec\.runtime\.image\.repository/);
    });

    it('refuses text that is not a manifest', async () => {
      await expect(
        service.registerReleaseBuild({ manifest: '', release: LIVE_BUILD }, actor),
      ).rejects.toThrow(/nexora\.yaml text/);
      await expect(
        service.registerReleaseBuild({ manifest: 'a: [', release: LIVE_BUILD }, actor),
      ).rejects.toThrow(/not YAML/);
    });

    async function walkToTesting(id: string) {
      await service.submitArtifactVersion(id, actor);
      await service.reviewArtifactVersion(id, reviewer);
    }

    it('walks submit, review, certify and publish for a version with a build', async () => {
      const { version } = await register();
      await walkToTesting(version.id);
      await service.certifyArtifactVersion(version.id, certifier);
      const released = await service.publishArtifactVersion(version.id, actor);
      expect(released.lifecycle).toBe('RELEASED');
    });

    it('refuses to certify a runnable version registered without a build (R8)', async () => {
      const { version } = await service.registerArtifactVersion(parseYaml(LIVE_MANIFEST), actor);
      await walkToTesting(version.id);
      await expect(service.certifyArtifactVersion(version.id, certifier)).rejects.toThrow(
        /declares spec\.runtime but has no recorded release build/,
      );
    });

    it('refuses to publish one certified before the rule existed (R8)', async () => {
      const { version } = await service.registerArtifactVersion(parseYaml(LIVE_MANIFEST), actor);
      await walkToTesting(version.id);
      // Certified under the old rules: written behind the service.
      await db('artifact_versions')
        .where({ id: version.id })
        .update({ lifecycle: 'CERTIFIED', certification_status: 'CERTIFIED' });
      await expect(service.publishArtifactVersion(version.id, actor)).rejects.toThrow(
        /cannot be published: it declares spec\.runtime/,
      );
    });

    it('leaves versions that do not run alone', async () => {
      const { version } = await service.registerArtifactVersion(manifest(), actor);
      await walkToTesting(version.id);
      await service.certifyArtifactVersion(version.id, certifier);
      expect((await service.publishArtifactVersion(version.id, actor)).lifecycle).toBe(
        'RELEASED',
      );
    });
  });

  // NXD-146. The NXD-137 findings: one person walked a version from submit
  // to publish, a COMMUNITY publisher published, and publish never asked
  // whether the governing product was released.
  describe('registry governance (NXD-146)', () => {
    async function submitted() {
      const { version } = await service.registerArtifactVersion(manifest(), actor);
      await service.submitArtifactVersion(version.id, actor);
      return version.id;
    }

    async function certified() {
      const id = await submitted();
      await service.reviewArtifactVersion(id, reviewer);
      await service.certifyArtifactVersion(id, certifier);
      return id;
    }

    it('keeps the submitter from reviewing or certifying, and the reviewer from certifying', async () => {
      const id = await submitted();
      await expect(service.reviewArtifactVersion(id, actor)).rejects.toThrow(
        /submitted artifact version .* cannot review it: segregation of duties/,
      );
      await service.reviewArtifactVersion(id, reviewer);
      await expect(service.certifyArtifactVersion(id, actor)).rejects.toThrow(
        /submitted .* cannot certify it/,
      );
      await expect(service.certifyArtifactVersion(id, reviewer)).rejects.toThrow(
        /reviewed artifact version .* cannot certify it/,
      );
      await service.certifyArtifactVersion(id, certifier);
      // The submitter may publish what someone else certified.
      expect((await service.publishArtifactVersion(id, actor)).lifecycle).toBe('RELEASED');
    });

    it('treats the creator as the submitter of a version submitted before transitions were recorded', async () => {
      const { version } = await service.registerArtifactVersion(manifest(), actor);
      await db('artifact_versions').where({ id: version.id }).update({ lifecycle: 'TESTING' });
      await expect(service.reviewArtifactVersion(version.id, actor)).rejects.toThrow(
        /segregation of duties/,
      );
    });

    it('records every transition with its actor, in order', async () => {
      const id = await certified();
      await service.publishArtifactVersion(id, actor);
      await service.deprecateArtifactVersion(id, actor);
      const transitions = await service.listTransitions(id);
      expect(transitions.map(t => [t.act, t.actor, t.fromLifecycle, t.toLifecycle])).toEqual([
        ['SUBMIT', actor, 'DRAFT', 'TESTING'],
        ['REVIEW', reviewer, 'TESTING', 'TESTING'],
        ['CERTIFY', certifier, 'TESTING', 'CERTIFIED'],
        ['PUBLISH', actor, 'CERTIFIED', 'RELEASED'],
        ['DEPRECATE', actor, 'RELEASED', 'DEPRECATED'],
      ]);
      expect(transitions[1]).toEqual(
        expect.objectContaining({ toCertificationStatus: 'TESTED' }),
      );
      expect(transitions[3].details).toEqual({
        releaseGate: { governed: false, releasedProductVersions: [] },
      });
      expect(transitions[0].occurredAt).toBeInstanceOf(Date);
    });

    it('records nothing for a refused transition', async () => {
      const id = await submitted();
      await expect(service.reviewArtifactVersion(id, actor)).rejects.toThrow();
      expect((await service.listTransitions(id)).map(t => t.act)).toEqual(['SUBMIT']);
    });

    it('refuses certify and publish to a COMMUNITY publisher until it is promoted', async () => {
      await service.createPublisher(
        { namespace: 'hobby', displayName: 'Hobby', trustLevel: 'COMMUNITY' },
        actor,
      );
      const { version } = await service.registerArtifactVersion(
        manifest({ namespace: 'hobby', name: 'thing' }),
        actor,
      );
      await service.submitArtifactVersion(version.id, actor);
      await service.reviewArtifactVersion(version.id, reviewer);
      await expect(service.certifyArtifactVersion(version.id, certifier)).rejects.toThrow(
        /publisher "hobby" is COMMUNITY.*promote it to PARTNER/,
      );
    });

    it('publishes a governed version only once its product version is RELEASED', async () => {
      const id = await certified();
      releaseStatus.mockResolvedValueOnce({
        namespace: 'acme',
        name: 'x',
        version: '1.0.0',
        governed: true,
        released: false,
        productVersions: [
          { id: 'pv-1', productId: 'p-1', productName: 'OEE', version: '1.0', status: 'APPROVED' },
        ],
      });
      await expect(service.publishArtifactVersion(id, actor)).rejects.toThrow(
        /a Composer product governs it.*OEE 1\.0 is APPROVED.*Release the product version first/,
      );
      releaseStatus.mockResolvedValueOnce({
        namespace: 'acme',
        name: 'x',
        version: '1.0.0',
        governed: true,
        released: false,
        productVersions: [],
      });
      await expect(service.publishArtifactVersion(id, actor)).rejects.toThrow(
        /no product version is registered as this version/,
      );
      releaseStatus.mockResolvedValueOnce({
        namespace: 'acme',
        name: 'x',
        version: '1.0.0',
        governed: true,
        released: true,
        productVersions: [
          { id: 'pv-1', productId: 'p-1', productName: 'OEE', version: '1.0', status: 'RELEASED' },
        ],
      });
      expect((await service.publishArtifactVersion(id, actor)).lifecycle).toBe('RELEASED');
      const publish = (await service.listTransitions(id)).find(t => t.act === 'PUBLISH');
      expect(publish?.details).toEqual({
        releaseGate: { governed: true, releasedProductVersions: ['pv-1'] },
      });
    });

    it('publishes nothing when the release gate cannot be asked', async () => {
      const id = await certified();
      releaseStatus.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
      await expect(service.publishArtifactVersion(id, actor)).rejects.toThrow(
        /release gate did not answer \(connect ECONNREFUSED\)/,
      );
      const repository = await ArtifactRegistryRepository.create({ getClient: () => db });
      const ungated = new ArtifactRegistryService(repository);
      await expect(ungated.publishArtifactVersion(id, actor)).rejects.toThrow(
        /release gate cannot be asked on this instance/,
      );
      expect((await service.getArtifactVersionById(id))?.lifecycle).toBe('CERTIFIED');
    });
  });
});
