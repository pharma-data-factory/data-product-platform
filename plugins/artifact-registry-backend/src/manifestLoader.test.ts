/**
 * The manifest loader, against a real repository.
 *
 * Two things are being proved. First that a directory of files becomes
 * registry content with the same rules an HTTP caller would meet — nothing
 * published, nothing registered into an unowned namespace. Second that the
 * loader is safe to run on every backend start: idempotent, non-fatal on bad
 * content, and unable to take startup down.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import knex, { Knex } from 'knex';
import { ARTIFACT_MANIFEST_API_VERSION } from '@internal/platform-common';
import { ArtifactRegistryRepository } from './repository';
import { ArtifactRegistryService } from './service';
import {
  loadManifestsFromDisk,
  resolveManifestDirectory,
  validatePublisherManifest,
  MANIFEST_LOADER_ACTOR,
  PUBLISHER_MANIFEST_KIND,
} from './manifestLoader';

function recordingLogger() {
  const info: string[] = [];
  const warn: string[] = [];
  return {
    info: (message: string) => void info.push(message),
    warn: (message: string) => void warn.push(message),
    infos: info,
    warnings: warn,
  };
}

const PUBLISHER_YAML = `
apiVersion: ${ARTIFACT_MANIFEST_API_VERSION}
kind: ${PUBLISHER_MANIFEST_KIND}
metadata:
  namespace: acme
  displayName: Acme Industrial
spec:
  memberGroups:
    - group:default/acme
`;

function artifactYaml(options: {
  name: string;
  version?: string;
  kind?: string;
  dependencies?: string[];
}): string {
  const deps = options.dependencies?.length
    ? `\n  dependencies:\n${options.dependencies
        .map(d => `    - ${d}`)
        .join('\n')}`
    : '';
  return `
apiVersion: ${ARTIFACT_MANIFEST_API_VERSION}
kind: ${options.kind ?? 'CONNECTOR'}
metadata:
  namespace: acme
  name: ${options.name}
  version: "${options.version ?? '1.0.0'}"
  displayName: "${options.name}"
spec:
  sourceRef: "template:default/${options.name}"${deps}
`;
}

describe('loadManifestsFromDisk', () => {
  let db: Knex;
  let service: ArtifactRegistryService;
  let directory: string;

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
    directory = await mkdtemp(join(tmpdir(), 'nexora-manifests-'));
  });

  afterEach(async () => {
    await db?.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  const load = () =>
    loadManifestsFromDisk({ directory, service, logger: recordingLogger() });

  it('creates the publisher and registers the artifacts it owns', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(
      join(directory, 'one.yaml'),
      artifactYaml({ name: 'one' }),
    );
    await writeFile(
      join(directory, 'two.yaml'),
      artifactYaml({ name: 'two' }),
    );

    const result = await load();

    expect(result.failures).toEqual([]);
    expect(result.publishersCreated).toBe(1);
    expect(result.versionsRegistered).toBe(2);
    expect(await service.listArtifacts()).toHaveLength(2);
  });

  it('registers every version as DRAFT, so loading cannot publish', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'one.yaml'), artifactYaml({ name: 'one' }));

    await load();

    const version = await service.resolve({
      namespace: 'acme',
      name: 'one',
      version: '1.0.0',
    });
    expect(version?.lifecycle).toBe('DRAFT');
    expect(version?.certificationStatus).toBeUndefined();
  });

  it('attributes what it created to the loader, not to a person', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'one.yaml'), artifactYaml({ name: 'one' }));

    await load();

    const publisher = await service.getPublisherByNamespace('acme');
    expect(publisher?.createdBy).toBe(MANIFEST_LOADER_ACTOR);
  });

  it('is idempotent: a second load registers nothing new and raises nothing', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'one.yaml'), artifactYaml({ name: 'one' }));
    await writeFile(join(directory, 'two.yaml'), artifactYaml({ name: 'two' }));

    await load();
    const second = await load();

    expect(second.failures).toEqual([]);
    expect(second.versionsRegistered).toBe(0);
    expect(second.versionsSkipped).toBe(2);
    expect(second.publishersCreated).toBe(0);
    expect(second.publishersSkipped).toBe(1);
    expect(await service.listArtifacts()).toHaveLength(2);
  });

  it('adds a new version of an existing artifact on a later load', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'one.yaml'), artifactYaml({ name: 'one' }));
    await load();

    await writeFile(
      join(directory, 'one-1.1.yaml'),
      artifactYaml({ name: 'one', version: '1.1.0' }),
    );
    const second = await load();

    expect(second.versionsRegistered).toBe(1);
    expect(second.versionsSkipped).toBe(1);
    const artifact = await service.getArtifactByCoordinate('acme', 'one');
    expect(await service.listArtifactVersions(artifact!.id)).toHaveLength(2);
  });

  it('reports a malformed manifest and still loads the rest', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'good.yaml'), artifactYaml({ name: 'good' }));
    await writeFile(
      join(directory, 'bad.yaml'),
      `apiVersion: ${ARTIFACT_MANIFEST_API_VERSION}\nkind: NOT_A_KIND\nmetadata:\n  namespace: acme\n  name: bad\n  version: "1.0.0"\n`,
    );

    const result = await load();

    expect(result.versionsRegistered).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].path).toContain('bad.yaml');
    expect(result.failures[0].reason).toContain('NOT_A_KIND');
  });

  it('reports unparseable YAML without throwing', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'broken.yaml'), 'this: [is: not: yaml');

    const result = await load();

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].path).toContain('broken.yaml');
  });

  it('refuses an artifact whose namespace no publisher owns', async () => {
    // No publisher.yaml — the service must not invent an owner.
    await writeFile(join(directory, 'one.yaml'), artifactYaml({ name: 'one' }));

    const result = await load();

    expect(result.versionsRegistered).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toContain('No publisher owns namespace');
  });

  it('loads a dependency and its dependent regardless of file order', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    // "a-dependent" sorts before "z-base", so the dependent is attempted
    // first and has to be retried once its dependency exists.
    await writeFile(
      join(directory, 'a-dependent.yaml'),
      artifactYaml({
        name: 'a-dependent',
        dependencies: ['acme/z-base@1.0.0'],
      }),
    );
    await writeFile(
      join(directory, 'z-base.yaml'),
      artifactYaml({ name: 'z-base' }),
    );

    const result = await load();

    expect(result.failures).toEqual([]);
    expect(result.versionsRegistered).toBe(2);
  });

  it('reports a dependency that resolves to nothing', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(
      join(directory, 'one.yaml'),
      artifactYaml({ name: 'one', dependencies: ['acme/absent@9.0.0'] }),
    );

    const result = await load();

    expect(result.versionsRegistered).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toContain('Unresolvable');
  });

  it('descends into namespace subdirectories', async () => {
    const nested = join(directory, 'acme');
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(nested, 'one.yaml'), artifactYaml({ name: 'one' }));

    const result = await load();

    expect(result.publishersCreated).toBe(1);
    expect(result.versionsRegistered).toBe(1);
  });

  it('treats a missing directory as nothing to do', async () => {
    const logger = recordingLogger();
    const result = await loadManifestsFromDisk({
      directory: join(directory, 'does-not-exist'),
      service,
      logger,
    });

    expect(result.failures).toEqual([]);
    expect(result.versionsRegistered).toBe(0);
    expect(logger.infos.join(' ')).toContain('does not exist');
  });

  it('ignores files that are not YAML', async () => {
    await writeFile(join(directory, 'publisher.yaml'), PUBLISHER_YAML);
    await writeFile(join(directory, 'README.md'), '# not a manifest');

    const result = await load();

    expect(result.failures).toEqual([]);
    expect(result.versionsRegistered).toBe(0);
  });
});

describe('resolveManifestDirectory', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'nexora-root-'));
    await mkdir(join(root, 'catalog', 'artifacts'), { recursive: true });
    await mkdir(join(root, 'packages', 'backend'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('finds a repo-relative directory when started from the repo root', () => {
    expect(resolveManifestDirectory('catalog/artifacts', root)).toBe(
      join(root, 'catalog', 'artifacts'),
    );
  });

  it('finds the same directory when started from packages/backend', () => {
    // This is the case that matters: `backstage-cli package start` runs the
    // backend with its own package as the working directory.
    expect(
      resolveManifestDirectory(
        'catalog/artifacts',
        join(root, 'packages', 'backend'),
      ),
    ).toBe(join(root, 'catalog', 'artifacts'));
  });

  it('returns an absolute path untouched', () => {
    expect(resolveManifestDirectory('/srv/manifests', root)).toBe(
      '/srv/manifests',
    );
  });

  it('falls back to the working directory when nothing matches', () => {
    expect(resolveManifestDirectory('nowhere/at/all', root)).toBe(
      join(root, 'nowhere', 'at', 'all'),
    );
  });
});

describe('validatePublisherManifest', () => {
  const valid = {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: PUBLISHER_MANIFEST_KIND,
    metadata: { namespace: 'acme', displayName: 'Acme Industrial' },
  };

  it('accepts a well-formed declaration', () => {
    expect(validatePublisherManifest(valid)).toEqual([]);
  });

  it('refuses a namespace that is not a coordinate segment', () => {
    expect(
      validatePublisherManifest({
        ...valid,
        metadata: { ...valid.metadata, namespace: 'Acme Corp' },
      }),
    ).toEqual([expect.stringContaining('metadata.namespace')]);
  });

  it('requires a display name', () => {
    expect(
      validatePublisherManifest({
        ...valid,
        metadata: { namespace: 'acme' },
      }),
    ).toEqual(['metadata.displayName is required']);
  });

  it('refuses an unsupported apiVersion', () => {
    expect(
      validatePublisherManifest({ ...valid, apiVersion: 'v1' }),
    ).toEqual([expect.stringContaining('Unsupported apiVersion')]);
  });

  it('refuses member groups that are not strings', () => {
    expect(
      validatePublisherManifest({ ...valid, spec: { memberGroups: [1, 2] } }),
    ).toEqual(['spec.memberGroups must be a list of strings']);
  });
});
