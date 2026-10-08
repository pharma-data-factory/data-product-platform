/**
 * Every Golden Path skeleton goes through the real `fetch:template` (NXD-105).
 *
 * The OEE Golden Path had never completed a run. `content/app/main.py` held
 * the Python literal `"${{"`, which Nunjucks — configured by Backstage with
 * `${{` as its variable start — reads as an unterminated placeholder, so
 * every run stopped at *Fetch skeleton* with "[Line 56, Column 47] expected
 * variable end". It surfaced only when a user ran it with GitHub credentials
 * for the first time.
 *
 * The template tests could not see it: they substitute `${{ … }}` with a
 * regular expression, which renders the file happily. So this one does not
 * imitate the templater. It runs Backstage's own action, from the package the
 * scaffolder runs it from, against every local `fetch:template` step of every
 * template, with that step's own `copyWithoutTemplating`.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import yaml from 'yaml';
import { createFetchTemplateAction } from '@backstage/plugin-scaffolder-backend';
import {
  nexoraManifestSchemaValidator,
  validateArtifactManifest,
  validateRunnableManifestSections,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

type FetchStep = {
  template: string;
  templateFile: string;
  id: string;
  input: Record<string, any>;
};

function localFetchTemplateSteps(): FetchStep[] {
  const steps: FetchStep[] = [];
  for (const template of fs.readdirSync(TEMPLATES_DIR).sort()) {
    const templateFile = path.join(TEMPLATES_DIR, template, 'template.yaml');
    if (!fs.existsSync(templateFile)) {
      continue;
    }
    for (const doc of yaml.parseAllDocuments(
      fs.readFileSync(templateFile, 'utf8'),
    )) {
      for (const step of doc.toJSON()?.spec?.steps ?? []) {
        const url = step.input?.url;
        if (step.action === 'fetch:template' && url && !/^https?:/.test(url)) {
          steps.push({
            template,
            templateFile,
            id: step.id,
            input: step.input,
          });
        }
      }
    }
  }
  return steps;
}

/**
 * A template's own literals pass through as written; only what comes from the
 * form (`${{ … }}`) is replaced. NXD-118: `policyVersion: '1'` rendered as a
 * YAML number, and a placeholder for every value had hidden it, because a
 * placeholder is always a string.
 */
function renderValues(values: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === 'string' && !value.includes('${{')
        ? value
        : `test-${key}`,
    ]),
  );
}

/**
 * The Catalog refuses an entity whose annotation or label is not a string
 * ("Malformed envelope … must be string"), and it does so only after the
 * repository is published. Checked here, before anything is.
 */
function nonStringMetadata(workspacePath: string): string[] {
  const file = path.join(workspacePath, 'catalog-info.yaml');
  if (!fs.existsSync(file)) {
    return [];
  }
  const problems: string[] = [];
  for (const doc of yaml.parseAllDocuments(fs.readFileSync(file, 'utf8'))) {
    const entity = doc.toJSON();
    for (const field of ['annotations', 'labels'] as const) {
      for (const [key, value] of Object.entries(
        entity?.metadata?.[field] ?? {},
      )) {
        if (typeof value !== 'string') {
          problems.push(
            `${entity?.metadata?.name} ${field}.${key} = ${JSON.stringify(
              value,
            )}`,
          );
        }
      }
    }
  }
  return problems;
}

const logger: any = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn((): any => logger),
};

describe('Golden Path skeletons render through the real fetch:template (NXD-105, NXD-118)', () => {
  const steps = localFetchTemplateSteps();

  // Only parseRepoUrl reads integrations, and only when a template calls it;
  // a template that does will fail here loudly rather than pass silently.
  const action = createFetchTemplateAction({
    reader: {} as any,
    integrations: { byHost: () => undefined, byUrl: () => undefined } as any,
  });

  it('finds the templates it is meant to check', () => {
    expect(steps.map(s => s.template)).toEqual(
      expect.arrayContaining(['oee-data-product', 'mqtt-temperature-product']),
    );
  });

  it.each(steps.map(s => [`${s.template} · ${s.id}`, s] as const))(
    '%s',
    async (_label, step) => {
      const workspacePath = fs.mkdtempSync(
        path.join(os.tmpdir(), 'nexora-render-'),
      );
      try {
        await action.handler({
          input: {
            // Placeholder values: this checks that every file parses as a
            // template, not what a particular product renders to.
            ...step.input,
            values: renderValues(step.input.values),
          },
          workspacePath,
          logger,
          templateInfo: { baseUrl: pathToFileURL(step.templateFile).href },
          output: jest.fn(),
          createTemporaryDirectory: async () =>
            fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-render-tmp-')),
          checkpoint: async ({ fn }: { fn: () => any }) => fn(),
          getInitiatorCredentials: async () => ({}),
        } as any);

        expect(fs.readdirSync(workspacePath).length).toBeGreaterThan(0);
        expect(nonStringMetadata(workspacePath)).toEqual([]);
      } finally {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    },
    60000,
  );
});

/**
 * The OEE Golden Path ships the canonical manifest (NXD-130, NXD-131). The run
 * above renders placeholders and so proves only that the file parses; this one
 * renders what a real Create would, and holds the result to the same three
 * checks the platform applies: the published schema, the hand-written
 * validator, and the registry's gate. A manifest that fails here would be
 * refused the first time the product is registered.
 */
describe('the OEE Golden Path renders a manifest the registry accepts (NXD-131)', () => {
  const step = localFetchTemplateSteps().find(
    s => s.template === 'oee-data-product',
  )!;

  // Every form-supplied value, named. A value the template gains later fails
  // the run below until it is added here, rather than rendering as undefined.
  const FORM: Record<string, unknown> = {
    name: 'oee-line-1',
    title: 'oee-line-1',
    description: 'OEE for filling line 1',
    owner: 'group:default/team-a',
    domain: 'manufacturing',
    site: 'basel',
    area: 'filling',
    line: 'line-1',
    equipmentId: 'filler-01',
    defaultWindow: 'HOUR',
    machineStateTopic: 'pharma/oee/+/state',
    counterTopic: 'pharma/oee/+/count',
    mqttTopic: 'pharma/oee/+/+',
    contextUrlRef: 'SOURCE_API_URL',
    system: 'data-platform',
    ursBaselineId: 'unbound',
    // Mixed case on purpose: an OCI repository and a coordinate segment are
    // lowercase, a GitHub organisation need not be.
    destination: {
      host: 'github.com',
      owner: 'Pharma-Data-Factory',
      repo: 'oee-line-1',
    },
  };

  let workspacePath: string;
  let manifest: any;
  let entity: any;

  beforeAll(async () => {
    const values = Object.fromEntries(
      Object.entries(step.input.values).map(([key, value]) => {
        if (typeof value === 'string' && !value.includes('${{')) {
          return [key, value];
        }
        if (!(key in FORM)) {
          throw new Error(`templateRendering: no realistic value for "${key}"`);
        }
        return [key, FORM[key]];
      }),
    );
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-oee-'));
    const action = createFetchTemplateAction({
      reader: {} as any,
      integrations: { byHost: () => undefined, byUrl: () => undefined } as any,
    });
    await action.handler({
      input: { ...step.input, values },
      workspacePath,
      logger,
      templateInfo: { baseUrl: pathToFileURL(step.templateFile).href },
      output: jest.fn(),
      createTemporaryDirectory: async () =>
        fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-oee-tmp-')),
      checkpoint: async ({ fn }: { fn: () => any }) => fn(),
      getInitiatorCredentials: async () => ({}),
    } as any);
    manifest = yaml.parse(
      fs.readFileSync(path.join(workspacePath, 'nexora.yaml'), 'utf8'),
    );
    entity = yaml
      .parseAllDocuments(
        fs.readFileSync(path.join(workspacePath, 'catalog-info.yaml'), 'utf8'),
      )[0]
      .toJSON();
  }, 60000);

  afterAll(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('no longer ships the unread dataproduct.yaml', () => {
    expect(fs.existsSync(path.join(workspacePath, 'dataproduct.yaml'))).toBe(
      false,
    );
  });

  it('is valid against the published schema', () => {
    const validate = nexoraManifestSchemaValidator();
    const valid = validate(manifest);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it('passes validateArtifactManifest and the registry gate', () => {
    expect(validateArtifactManifest(manifest)).toEqual([]);
    expect(validateRunnableManifestSections(manifest)).toEqual([]);
  });

  it('agrees with catalog-info.yaml on identity', () => {
    expect(manifest.metadata.name).toBe(entity.metadata.name);
    expect(manifest.metadata.version).toBe(
      entity.metadata.annotations['dataprod.platform/version'],
    );
    expect(manifest.metadata.description).toBe(entity.metadata.description);
    expect(manifest.metadata.displayName).toBe(entity.metadata.title);
  });

  it('names a portable, lowercase image and namespace from the organisation', () => {
    expect(manifest.metadata.namespace).toBe('pharma-data-factory');
    expect(manifest.spec.runtime.image.repository).toBe(
      'ghcr.io/pharma-data-factory/oee-line-1',
    );
  });

  it('serves on the port the image exposes and the health route it probes', () => {
    const dockerfile = fs.readFileSync(
      path.join(workspacePath, 'Dockerfile'),
      'utf8',
    );
    const [port] = manifest.spec.runtime.ports;
    expect(dockerfile).toMatch(new RegExp(`EXPOSE ${port.containerPort}\\b`));
    expect(dockerfile).toContain(
      `127.0.0.1:${port.containerPort}${manifest.spec.runtime.health.path}`,
    );
  });

  it('declares as storage the directory the image keeps its database in', () => {
    const dockerfile = fs.readFileSync(
      path.join(workspacePath, 'Dockerfile'),
      'utf8',
    );
    const compose = yaml.parse(
      fs.readFileSync(path.join(workspacePath, 'docker-compose.yml'), 'utf8'),
    );
    const [service] = Object.values<any>(compose.services);
    const database = /ENV TIMESERIES_SQLITE_PATH=(\S+)/.exec(dockerfile)?.[1];
    const mountPaths: string[] = manifest.spec.runtime.storage.map(
      (area: any) => area.mountPath,
    );
    // A database outside every declared area is lost on the first upgrade.
    expect(database).toBeDefined();
    expect(
      mountPaths.some(mount => database!.startsWith(`${mount}/`)),
    ).toBe(true);
    // The hand-written Compose file mounts the same directories.
    expect(
      (service.volumes as string[]).map(volume => volume.split(':')[1]).sort(),
    ).toEqual([...mountPaths].sort());
  });

  it('points every interface document at a file that exists', () => {
    const paths: string[] = manifest.spec.interfaces
      .filter((iface: any) => iface.document)
      .map((iface: any) => iface.document.path);
    expect(paths.length).toBeGreaterThan(0);
    expect(
      paths.filter(file => !fs.existsSync(path.join(workspacePath, file))),
    ).toEqual([]);
  });

  it('declares every variable the Compose file passes, except the internal ones', () => {
    const compose = yaml.parse(
      fs.readFileSync(path.join(workspacePath, 'docker-compose.yml'), 'utf8'),
    );
    const [service] = Object.values<any>(compose.services);
    // Set from the manifest itself, or a path inside the image: not something
    // an installation chooses.
    const internal = [
      'SERVICE_NAME',
      'SERVICE_VERSION',
      'TIMESERIES_SQLITE_PATH',
    ];
    const passed = Object.keys(service.environment).filter(
      key => !internal.includes(key),
    );
    const declared = manifest.spec.config.map((entry: any) => entry.key);
    expect([...declared].sort()).toEqual([...passed].sort());
  });

  /**
   * NXD-132. The release workflow is copied, not templated, so every GitHub
   * expression must arrive intact; and it may hold no Nexora credential,
   * because Nexora pulls the release record (NXD-123's model).
   */
  describe('.github/workflows/release.yml (NXD-132)', () => {
    let text: string;
    let workflow: any;
    let ci: any;
    beforeAll(() => {
      text = fs.readFileSync(
        path.join(workspacePath, '.github/workflows/release.yml'),
        'utf8',
      );
      workflow = yaml.parse(text);
      ci = yaml.parse(
        fs.readFileSync(
          path.join(workspacePath, '.github/workflows/ci.yml'),
          'utf8',
        ),
      );
    });

    const steps = () => workflow.jobs.release.steps as any[];
    const stepNamed = (name: string) => steps().find(s => s.name === name);

    it('arrives uninterpreted by the template engine', () => {
      expect(text).toContain('${{ steps.build.outputs.digest }}');
      expect(text).toContain('${{ github.token }}');
    });

    it('runs on a version tag, after the same gate as every pull request', () => {
      expect(workflow.on.push.tags).toEqual(['v*']);
      expect(workflow.jobs['quality-gate'].uses).toBe(
        './.github/workflows/ci.yml',
      );
      expect(ci.on).toHaveProperty('workflow_call');
      expect(workflow.jobs.release.needs).toBe('quality-gate');
    });

    it('asks for no more than it uses, and for no secret but its own token', () => {
      expect(workflow.permissions).toEqual({ contents: 'read' });
      expect(workflow.jobs.release.permissions).toEqual({
        contents: 'write',
        packages: 'write',
      });
      const secrets = text.match(/secrets\.[A-Za-z_]+/g) ?? [];
      expect([...new Set(secrets)]).toEqual(['secrets.GITHUB_TOKEN']);
    });

    it('checks the tag against the manifest before it builds anything', () => {
      const names = steps().map(s => s.name);
      expect(names.indexOf('Check the tag against nexora.yaml')).toBeLessThan(
        names.indexOf('Build and push'),
      );
      expect(stepNamed('Check the tag against nexora.yaml').run).toContain(
        'scripts/nexora_release.py check',
      );
      expect(
        fs.existsSync(path.join(workspacePath, 'scripts/nexora_release.py')),
      ).toBe(true);
    });

    it('pushes the image with an SBOM and provenance, tagged with the version', () => {
      const build = stepNamed('Build and push');
      expect(build.uses).toMatch(/^docker\/build-push-action@/);
      expect(build.with.push).toBe(true);
      expect(build.with.sbom).toBe(true);
      expect(build.with.provenance).toBe('mode=max');
      expect(build.with.tags).toContain(
        '${{ steps.manifest.outputs.repository }}:${{ steps.manifest.outputs.version }}',
      );
      // NXD-126: attestations need a Buildx builder, set up before the build.
      const names = steps().map(s => s.name);
      expect(names.indexOf('Set up Docker Buildx')).toBeLessThan(
        names.indexOf('Build and push'),
      );
    });

    it('publishes nexora-release.json on a GitHub Release for that tag', () => {
      expect(stepNamed('Write the release record').run).toContain(
        '> nexora-release.json',
      );
      const publish = stepNamed('Publish the GitHub Release').run;
      expect(publish).toContain(
        'gh release create "$GITHUB_REF_NAME" nexora-release.json',
      );
      expect(publish).toContain('--verify-tag');
    });

    it('passes step outputs through env, never into a run script', () => {
      for (const s of steps().filter(x => x.run)) {
        expect([s.name, /\$\{\{/.test(s.run)]).toEqual([s.name, false]);
      }
    });

    it('lists the release and OpenAPI coverage tests in the gate, and they exist', () => {
      const command = ci.jobs['quality-gate'].with['unit-tests'] as string;
      for (const file of [
        'tests/test_release.py',
        'tests/test_openapi_coverage.py',
      ]) {
        expect(command).toContain(file);
        expect(fs.existsSync(path.join(workspacePath, file))).toBe(true);
      }
      expect(ci.jobs['quality-gate'].with['lint-command']).toContain('scripts');
    });
  });

  describe('contracts/asyncapi.yaml', () => {
    let doc: any;
    beforeAll(() => {
      doc = yaml.parse(
        fs.readFileSync(
          path.join(workspacePath, 'contracts/asyncapi.yaml'),
          'utf8',
        ),
      );
    });

    it('is AsyncAPI 3, which is what its `address` and `operations` mean', () => {
      expect(doc.asyncapi).toMatch(/^3\.\d+\.\d+$/);
      expect(doc.operations).toBeDefined();
    });

    it('resolves every $ref inside the document', () => {
      const refs: string[] = [];
      const walk = (node: unknown) => {
        if (Array.isArray(node)) node.forEach(walk);
        else if (node && typeof node === 'object') {
          for (const [key, value] of Object.entries(node)) {
            if (key === '$ref' && typeof value === 'string') refs.push(value);
            else walk(value);
          }
        }
      };
      walk(doc);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        const target = ref
          .replace(/^#\//, '')
          .split('/')
          .reduce((node: any, key) => node?.[key], doc);
        expect([ref, target !== undefined]).toEqual([ref, true]);
      }
    });

    it('receives what the manifest says the product consumes, and sends nothing', () => {
      const actions = Object.values<any>(doc.operations).map(op => op.action);
      const consumedEvents = manifest.spec.interfaces.filter(
        (i: any) => i.type === 'event' && i.direction === 'consumes',
      );
      expect(actions.every(action => action === 'receive')).toBe(true);
      expect(actions).toHaveLength(consumedEvents.length);
      const provided = manifest.spec.interfaces.filter(
        (i: any) => i.type === 'event' && i.direction === 'provides',
      );
      expect(provided).toEqual([]);
    });

    it('carries the topics chosen at Create as channel addresses', () => {
      expect(doc.channels.machineState.address).toBe(FORM.machineStateTopic);
      expect(doc.channels.counters.address).toBe(FORM.counterTopic);
    });
  });
});

/**
 * NXD-149 (supplier track S4). Every data-product Golden Path ships what the
 * OEE one does: a manifest the registry accepts, with runtime, health and
 * storage; the release workflow and its script, verbatim; and the test
 * evidence hooks. Before this only OEE could be released, built and
 * installed. The OEE-specific checks (AsyncAPI, OpenAPI coverage, the
 * release workflow line by line) stay above; the release files here are
 * held to being OEE's, byte for byte, so those checks cover them too.
 */
describe.each([
  {
    template: 'mqtt-temperature-product',
    database: 'SQLITE_PATH' as string | undefined,
    internal: ['SERVICE_NAME', 'SERVICE_VERSION', 'SQLITE_PATH'],
    declaredOnly: [] as string[],
  },
  {
    template: 'rest-equipment-product',
    database: 'SQLITE_PATH',
    internal: ['SERVICE_NAME', 'SERVICE_VERSION', 'SQLITE_PATH'],
    declaredOnly: [] as string[],
  },
  {
    template: 'machine-state-consumer',
    database: 'SQLITE_PATH',
    internal: ['SERVICE_NAME', 'SERVICE_VERSION', 'SQLITE_PATH'],
    declaredOnly: [] as string[],
  },
  {
    template: 'aas-data-product',
    // NXD-150: it keeps assets in memory; no code reads a database path.
    database: undefined,
    // Passed by the development Compose file, read by no code: not
    // offered as configuration.
    internal: ['SERVICE_NAME', 'SERVICE_VERSION', 'HOST', 'PORT', 'AAS_SQLITE_PATH', 'AAS_PERSISTENCE'],
    declaredOnly: [] as string[],
  },
])('the $template Golden Path is releasable and runnable (NXD-149)', ({
  template,
  database,
  internal,
  declaredOnly,
}) => {
  const step = localFetchTemplateSteps().find(s => s.template === template)!;
  const FORM: Record<string, unknown> = {
    name: 'line-1-product',
    title: 'line-1-product',
    description: 'Data product for line 1',
    owner: 'group:default/team-a',
    domain: 'manufacturing',
    mqttTopic: 'pharma/temperature/+',
    topicPattern: 'pharma/+/+/+/+/machine/state',
    unsComponent: 'unified-namespace',
    assetSource: 'mqtt',
    restEndpoint: '/api/v1/assets/{assetId}',
    system: 'data-platform',
    ursBaselineId: 'unbound',
    destination: {
      host: 'github.com',
      owner: 'Pharma-Data-Factory',
      repo: 'line-1-product',
    },
  };
  const OEE = path.join(TEMPLATES_DIR, 'oee-data-product', 'content');

  let workspacePath: string;
  let manifest: any;
  let entity: any;
  let service: any;
  const read = (file: string) =>
    fs.readFileSync(path.join(workspacePath, file), 'utf8');

  beforeAll(async () => {
    const values = Object.fromEntries(
      Object.entries(step.input.values).map(([key, value]) => {
        if (typeof value === 'string' && !value.includes('${{')) {
          return [key, value];
        }
        if (!(key in FORM)) {
          throw new Error(`templateRendering: no realistic value for "${key}"`);
        }
        return [key, FORM[key]];
      }),
    );
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), `nexora-${template}-`));
    await createFetchTemplateAction({
      reader: {} as any,
      integrations: { byHost: () => undefined, byUrl: () => undefined } as any,
    }).handler({
      input: { ...step.input, values },
      workspacePath,
      logger,
      templateInfo: { baseUrl: pathToFileURL(step.templateFile).href },
      output: jest.fn(),
      createTemporaryDirectory: async () =>
        fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-s4-tmp-')),
      checkpoint: async ({ fn }: { fn: () => any }) => fn(),
      getInitiatorCredentials: async () => ({}),
    } as any);
    manifest = yaml.parse(read('nexora.yaml'));
    entity = yaml.parseAllDocuments(read('catalog-info.yaml'))[0].toJSON();
    // The product's own service: the one Compose builds from this repository.
    service = Object.values<any>(yaml.parse(read('docker-compose.yml')).services).find(
      (s: any) => s.build,
    );
  }, 60000);

  afterAll(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('renders a manifest the schema, the validator and the registry gate accept', () => {
    const validate = nexoraManifestSchemaValidator();
    const valid = validate(manifest);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
    expect(validateArtifactManifest(manifest)).toEqual([]);
    expect(validateRunnableManifestSections(manifest)).toEqual([]);
  });

  it('agrees with catalog-info.yaml, and names a lowercase image of the organisation', () => {
    expect(manifest.metadata.name).toBe(entity.metadata.name);
    expect(manifest.metadata.version).toBe(
      entity.metadata.annotations['dataprod.platform/version'],
    );
    expect(manifest.metadata.namespace).toBe('pharma-data-factory');
    expect(manifest.spec.runtime.image.repository).toBe(
      'ghcr.io/pharma-data-factory/line-1-product',
    );
  });

  it('probes, in its image, the port and health route the manifest declares', () => {
    const dockerfile = read('Dockerfile');
    const [port] = manifest.spec.runtime.ports;
    expect(dockerfile).toMatch(new RegExp(`EXPOSE ${port.containerPort}\\b`));
    expect(dockerfile).toMatch(/HEALTHCHECK /);
    expect(dockerfile).toMatch(
      new RegExp(`(127\\.0\\.0\\.1|localhost):${port.containerPort}${manifest.spec.runtime.health.path}['"]`),
    );
  });

  // Storage exactly where the product keeps a database, and nowhere else: a
  // product without one declares none rather than an area nothing writes to
  // (NXD-150). The development Compose file may mount more.
  it('declares storage where its database lives, and only there', () => {
    const mountPaths: string[] = (manifest.spec.runtime.storage ?? []).map(
      (area: any) => area.mountPath,
    );
    const databases = (database ? [String(service.environment[database])] : []).map(
      file => path.posix.resolve('/app', file),
    );
    const covered = databases.filter(db =>
      mountPaths.some(mount => db.startsWith(`${mount}/`)),
    );
    expect(covered).toEqual(databases);
    expect(mountPaths.length).toBe(databases.length);
    const namedVolumes = (service.volumes as string[])
      .filter(volume => !volume.startsWith('.') && !volume.startsWith('/'))
      .map(volume => volume.split(':')[1]);
    expect(mountPaths.filter(mount => !namedVolumes.includes(mount))).toEqual([]);
  });

  it('declares every variable the Compose file passes, except the internal ones', () => {
    const passed = Object.keys(service.environment).filter(key => !internal.includes(key));
    const declared: string[] = manifest.spec.config.map((entry: any) => entry.key);
    expect(declared.filter(key => !declaredOnly.includes(key)).sort()).toEqual(passed.sort());
  });

  it('points every interface document at a file that exists', () => {
    const missing = manifest.spec.interfaces
      .filter((iface: any) => iface.document)
      .map((iface: any) => iface.document.path)
      .filter((file: string) => !fs.existsSync(path.join(workspacePath, file)));
    expect(missing).toEqual([]);
  });

  it('ships OEE’s release workflow, script and test verbatim, uninterpreted', () => {
    for (const file of [
      '.github/workflows/release.yml',
      'scripts/nexora_release.py',
      'tests/test_release.py',
    ]) {
      expect([file, read(file) === fs.readFileSync(path.join(OEE, file), 'utf8')]).toEqual([
        file,
        true,
      ]);
    }
  });

  it('runs the release test in a CI gate the release workflow can call', () => {
    const ci = yaml.parse(read('.github/workflows/ci.yml'));
    expect(ci.on).toHaveProperty('workflow_call');
    const commands = JSON.stringify(ci.jobs);
    // `pytest tests/` runs it as well as naming it does.
    expect(/tests\/test_release\.py|pytest tests\//.test(commands)).toBe(true);
    // GitHub expressions arrive intact (NXD-149 found aas's rendered empty).
    expect(read('.github/workflows/ci.yml')).not.toMatch(/tags: :|if \[ "" /);
  });

  it('writes test evidence with the OEE hooks, and keeps it out of git', () => {
    const hooks = (text: string) => text.slice(text.indexOf('# Test evidence for Nexora (NXD-122).'));
    expect(hooks(read('tests/conftest.py'))).toBe(
      hooks(fs.readFileSync(path.join(OEE, 'tests/conftest.py'), 'utf8')),
    );
    expect(read('.gitignore')).toMatch(/^test-evidence\/$/m);
    const workflows = ['ci.yml', 'data-product-quality.yml']
      .map(file => path.join('.github/workflows', file))
      .filter(file => fs.existsSync(path.join(workspacePath, file)))
      .map(read)
      .join('\n');
    expect(workflows).toContain('name: nexora-test-evidence');
  });
});
