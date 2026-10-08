/**
 * One provider pass (NXD-144), against a fake Docker and a fake Nexora.
 *
 * Pinned: PRESENT is applied when nothing runs, when another revision runs,
 * or when it stopped, and is otherwise left alone; what is reported is read
 * back from the container; ABSENT is a `down` that keeps volumes and deletes
 * the secrets file; a blocked pin changes nothing, but a removal still
 * happens; a missing secret, a failed apply and a foreign container are
 * reported FAILED; one failing installation does not stop the pass.
 */

import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  ObservedStateReport,
  ProviderDesiredInstallation,
} from '@internal/platform-common';
import { DIGEST, desiredItem } from './__testUtils__/fixtures';
import type { NexoraApi } from './api';
import { LABEL_CONFIG_HASH, LABEL_INSTALLATION, LABEL_REVISION } from './compose';
import type { ContainerStatus, Docker } from './docker';
import { observedState, reconcile } from './reconcile';

const PROJECT = 'nexora-basel-line-3-oee';

function container(item: ProviderDesiredInstallation, overrides: Partial<ContainerStatus> = {}): ContainerStatus {
  return {
    id: 'c1',
    image: 'sha256:local-image',
    state: 'running',
    health: 'healthy',
    labels: {
      [LABEL_INSTALLATION]: item.id,
      [LABEL_REVISION]: String(item.desired.revision),
      [LABEL_CONFIG_HASH]: item.desired.configHash,
    },
    publishers: [{ targetPort: 8080, publishedPort: 49153, protocol: 'tcp' }],
    ...overrides,
  };
}

describe('reconcile', () => {
  let workDir: string;
  let running: Map<string, ContainerStatus[]>;
  let calls: string[];
  let reports: Array<{ id: string; report: ObservedStateReport }>;
  let items: ProviderDesiredInstallation[];
  let docker: Docker;
  let upFails: string | undefined;
  let loginFails: string | undefined;
  let registryCredentials: Array<{ registry: string; username?: string; secretRef: string }> | undefined;
  let logins: Array<{ dockerConfig: string; registry: string; username: string; password: string }>;
  let upConfigs: Array<string | undefined>;

  const api: NexoraApi = {
    desired: async () => ({
      target: {
        id: 'target-1',
        name: 'basel-line-3',
        providerKind: 'docker-compose',
        ...(registryCredentials ? { registryCredentials } : {}),
      },
      installations: items,
      generatedAt: new Date().toISOString(),
    }),
    report: async (id, report) => {
      reports.push({ id, report });
      return {} as never;
    },
  };

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'nexora-provider-'));
    running = new Map();
    calls = [];
    reports = [];
    upFails = undefined;
    loginFails = undefined;
    registryCredentials = undefined;
    logins = [];
    upConfigs = [];
    docker = {
      login: async (dockerConfig, registry, username, password) => {
        calls.push(`login ${registry}`);
        if (loginFails) throw new Error(loginFails);
        logins.push({ dockerConfig, registry, username, password });
      },
      up: async (project, dir, dockerConfig) => {
        calls.push(`up ${project}`);
        upConfigs.push(dockerConfig);
        if (upFails) throw new Error(upFails);
        const compose = JSON.parse(await readFile(join(dir, 'compose.json'), 'utf8'));
        const labels = compose.services.app.labels;
        running.set(project, [
          {
            id: 'new',
            image: 'sha256:local-image',
            state: 'running',
            health: 'starting',
            labels,
            publishers: [],
          },
        ]);
      },
      down: async project => {
        calls.push(`down ${project}`);
        running.delete(project);
      },
      ps: async project => running.get(project) ?? [],
      repoDigests: async () => [`ghcr.io/pharma/oee@${DIGEST}`, `mirror.local/oee@sha256:${'9'.repeat(64)}`],
    };
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  const pass = () =>
    reconcile({
      api,
      docker,
      workDir,
      resolveSecret: async ref =>
        ({ 'mqtt/password': 's3cret', 'ghcr/pull-token': 'ghp_pull' } as Record<string, string>)[ref],
    });

  it('applies a PRESENT installation nothing runs for, and reports what started', async () => {
    items = [desiredItem()];
    const [outcome] = await pass();
    expect(outcome.action).toBe('applied');
    expect(calls).toEqual([`up ${PROJECT}`]);
    expect(reports).toEqual([
      {
        id: 'inst-1',
        report: {
          state: 'PENDING',
          desiredRevision: 3,
          imageDigest: DIGEST,
          configHash: items[0].desired.configHash,
        },
      },
    ]);
    const secretsFile = join(workDir, PROJECT, 'secrets.env');
    expect(await readFile(secretsFile, 'utf8')).toBe('MQTT_PASSWORD=s3cret\n');
    expect((await stat(secretsFile)).mode & 0o777).toBe(0o600);
  });

  it('leaves the current revision alone, healthy or not, and reports it', async () => {
    items = [desiredItem()];
    running.set(PROJECT, [container(items[0])]);
    const [outcome] = await pass();
    expect(outcome.action).toBe('unchanged');
    expect(calls).toEqual([]);
    expect(reports[0].report).toEqual({
      state: 'RUNNING',
      desiredRevision: 3,
      imageDigest: DIGEST,
      configHash: items[0].desired.configHash,
      message: '8080/tcp on host port 49153',
    });

    reports = [];
    running.set(PROJECT, [container(items[0], { health: 'unhealthy' })]);
    await pass();
    expect(calls).toEqual([]);
    expect(reports[0].report.state).toBe('DEGRADED');
  });

  it('re-applies when another revision runs, or the container stopped', async () => {
    items = [desiredItem()];
    running.set(PROJECT, [container(items[0], { labels: { ...container(items[0]).labels, [LABEL_REVISION]: '2' } })]);
    expect((await pass())[0].action).toBe('applied');
    running.set(PROJECT, [container(items[0], { state: 'exited', health: '' })]);
    expect((await pass())[0].action).toBe('applied');
    expect(calls).toEqual([`up ${PROJECT}`, `up ${PROJECT}`]);
  });

  it('takes an ABSENT installation down, keeping volumes and deleting the secrets file', async () => {
    items = [desiredItem()];
    await pass();
    items = [desiredItem({}, { state: 'ABSENT', revision: 4 })];
    const [outcome] = await pass();
    expect(outcome.action).toBe('removed');
    expect(calls).toEqual([`up ${PROJECT}`, `down ${PROJECT}`]);
    expect(reports[1].report).toEqual({
      state: 'ABSENT',
      desiredRevision: 4,
      message: `volumes kept: ${PROJECT}_data`,
    });
    await expect(stat(join(workDir, PROJECT, 'secrets.env'))).rejects.toThrow();
    // Already gone: nothing to do, still reported.
    expect((await pass())[0].action).toBe('unchanged');
    expect(calls).toHaveLength(2);
  });

  it('applies nothing for a blocked pin, but still removes', async () => {
    items = [desiredItem({ blocked: 'pharma/oee@1.0.0 is pinned as version ver-1, but the registry no longer has it' })];
    running.set(PROJECT, [container(items[0])]);
    const [outcome] = await pass();
    expect(outcome.action).toBe('blocked');
    expect(calls).toEqual([]);
    expect(reports[0].report).toEqual(
      expect.objectContaining({ state: 'RUNNING', message: expect.stringMatching(/^not applied: .*no longer has it; 8080/) }),
    );

    items = [desiredItem({ blocked: 'gone' }, { state: 'ABSENT', revision: 4 })];
    expect((await pass())[0].action).toBe('removed');
  });

  it('reports FAILED for a missing secret, a failed apply and a foreign container', async () => {
    items = [desiredItem({}, { config: { MQTT_PASSWORD: { secretRef: 'nope' } } })];
    await pass();
    expect(reports[0].report).toEqual({
      state: 'FAILED',
      desiredRevision: 3,
      message: expect.stringMatching(/secret "nope"/),
    });
    expect(calls).toEqual([]);

    items = [desiredItem()];
    upFails = 'pull access denied for ghcr.io/pharma/oee';
    await pass();
    expect(reports[1].report).toEqual({
      state: 'FAILED',
      desiredRevision: 3,
      message: 'apply of revision 3 failed: pull access denied for ghcr.io/pharma/oee',
    });

    upFails = undefined;
    running.set(PROJECT, [container(items[0], { labels: { [LABEL_INSTALLATION]: 'someone-else' } })]);
    await pass();
    expect(reports[2].report.message).toMatch(/not installation inst-1; it is left alone/);
    expect(calls).toEqual([`up ${PROJECT}`]);
  });

  it('goes on after one installation fails', async () => {
    items = [
      desiredItem({ id: 'a', name: 'first' }, { config: { MQTT_PASSWORD: { secretRef: 'nope' } } }),
      desiredItem({ id: 'b', name: 'second' }),
    ];
    const outcomes = await pass();
    expect(outcomes.map(o => o.action)).toEqual(['failed', 'applied']);
  });

  it('does not report a digest of another repository', async () => {
    items = [desiredItem()];
    running.set(PROJECT, [container(items[0])]);
    docker.repoDigests = async () => [`mirror.local/oee@${DIGEST}`];
    await pass();
    expect(reports[0].report.imageDigest).toBeUndefined();
  });

  describe('private registries (NXD-147)', () => {
    it('logs in with the target’s credential for the image’s registry, in an isolated config', async () => {
      items = [desiredItem()];
      registryCredentials = [
        { registry: 'docker.io', secretRef: 'nope' },
        { registry: 'ghcr.io', username: 'schmeckm', secretRef: 'ghcr/pull-token' },
      ];
      expect((await pass())[0].action).toBe('applied');
      expect(calls).toEqual(['login ghcr.io', `up ${PROJECT}`]);
      expect(logins).toEqual([
        {
          dockerConfig: join(workDir, '.docker', 'basel-line-3'),
          registry: 'ghcr.io',
          username: 'schmeckm',
          password: 'ghp_pull',
        },
      ]);
      expect(upConfigs).toEqual([join(workDir, '.docker', 'basel-line-3')]);
    });

    it('pulls with the host’s own config when the target names no credential for the registry', async () => {
      items = [desiredItem()];
      registryCredentials = [{ registry: 'registry.example.com', secretRef: 'ghcr/pull-token' }];
      await pass();
      expect(calls).toEqual([`up ${PROJECT}`]);
      expect(upConfigs).toEqual([undefined]);
    });

    it('reports FAILED, naming the reference, when the secret is missing or the login is refused', async () => {
      items = [desiredItem()];
      registryCredentials = [{ registry: 'ghcr.io', secretRef: 'ghcr/other' }];
      await pass();
      expect(reports[0].report).toEqual({
        state: 'FAILED',
        desiredRevision: 3,
        message: expect.stringMatching(/registry credential for ghcr\.io refers to secret "ghcr\/other"/),
      });

      registryCredentials = [{ registry: 'ghcr.io', secretRef: 'ghcr/pull-token' }];
      loginFails = 'unauthorized: denied';
      await pass();
      expect(reports[1].report.message).toBe(
        'login to ghcr.io with secret "ghcr/pull-token" failed: unauthorized: denied',
      );
      expect(reports[1].report.message).not.toContain('ghp_pull');
      expect(calls).toEqual(['login ghcr.io']);
    });
  });
});

describe('observedState', () => {
  it.each([
    ['running', '', 'RUNNING'],
    ['running', 'healthy', 'RUNNING'],
    ['running', 'starting', 'PENDING'],
    ['running', 'unhealthy', 'DEGRADED'],
    ['restarting', '', 'DEGRADED'],
    ['created', '', 'PENDING'],
    ['exited', '', 'STOPPED'],
    ['removing', '', 'UNKNOWN'],
  ])('%s/%s is %s', (state, health, expected) => {
    expect(observedState({ id: 'c', image: '', state, health, labels: {}, publishers: [] })).toBe(expected);
  });
});
