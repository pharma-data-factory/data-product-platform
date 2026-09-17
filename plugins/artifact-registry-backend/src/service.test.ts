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
    service = new ArtifactRegistryService(repository);
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
        service.submitArtifactVersion(version.id),
        service.submitArtifactVersion(version.id),
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
});
