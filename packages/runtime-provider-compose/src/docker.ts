/**
 * The provider's only contact with the host: the `docker` CLI, through
 * `execFile` (no shell, so no value is ever interpreted). Behind an
 * interface so the reconciler is tested without Docker.
 */

import { execFile } from 'child_process';
import { mkdir } from 'fs/promises';

export interface ContainerStatus {
  id: string;
  /** The local image id the container was created from. */
  image: string;
  /** `running`, `exited`, `restarting`, `created`, `paused`, `dead`. */
  state: string;
  /** `healthy`, `unhealthy`, `starting`, or empty without a HEALTHCHECK. */
  health: string;
  labels: Record<string, string>;
  /** Published ports: container port to host port. */
  publishers: Array<{ targetPort: number; publishedPort: number; protocol: string }>;
}

export interface Docker {
  /**
   * `docker compose up -d` of the project in `dir`; pulls what is missing,
   * with the registry logins of `dockerConfig` when given (NXD-147).
   */
  up(project: string, dir: string, dockerConfig?: string): Promise<void>;
  /**
   * `docker login` into an isolated client configuration directory, never
   * the host user's: the target's credentials stay the target's (NXD-147).
   * The password goes over stdin, never onto a command line.
   */
  login(dockerConfig: string, registry: string, username: string, password: string): Promise<void>;
  /** `docker compose down`, never `-v`: the project's volumes are kept. */
  down(project: string): Promise<void>;
  /** The project's containers of `service`, running or not. */
  ps(project: string, service: string): Promise<ContainerStatus[]>;
  /** The registry digests (`repo@sha256:…`) of a local image id. */
  repoDigests(imageId: string): Promise<string[]>;
}

export class DockerCommandError extends Error {}

function run(
  args: string[],
  cwd?: string,
  options: { env?: NodeJS.ProcessEnv; stdin?: string } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'docker',
      args,
      {
        cwd,
        maxBuffer: 16 * 1024 * 1024,
        timeout: 10 * 60 * 1000,
        ...(options.env ? { env: { ...process.env, ...options.env } } : {}),
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = String(stderr || error.message).trim().split('\n').slice(-5).join(' ');
          reject(new DockerCommandError(`docker ${args.slice(0, 3).join(' ')}: ${detail}`));
          return;
        }
        resolve(String(stdout));
      },
    );
    if (options.stdin !== undefined) {
      child.stdin?.end(options.stdin);
    }
  });
}

/** `docker inspect` output to the facts the reconciler reads. */
export function parseInspect(output: string): ContainerStatus[] {
  const rows: any[] = JSON.parse(output.trim() || '[]');
  return rows.map(row => {
    const ports = (row.NetworkSettings?.Ports ?? {}) as Record<
      string,
      Array<{ HostPort?: string }> | null
    >;
    const publishers = Object.entries(ports).flatMap(([key, bindings]) => {
      const [port, protocol = 'tcp'] = key.split('/');
      return (bindings ?? [])
        .map(binding => Number(binding.HostPort))
        .filter(published => published > 0)
        .map(publishedPort => ({ targetPort: Number(port), publishedPort, protocol }));
    });
    // IPv4 and IPv6 bindings publish the same port twice.
    const unique = publishers.filter(
      (p, i) =>
        publishers.findIndex(
          q => q.targetPort === p.targetPort && q.protocol === p.protocol && q.publishedPort === p.publishedPort,
        ) === i,
    );
    return {
      id: String(row.Id ?? ''),
      image: String(row.Image ?? ''),
      state: String(row.State?.Status ?? '').toLowerCase(),
      health: String(row.State?.Health?.Status ?? '').toLowerCase(),
      labels: (row.Config?.Labels ?? {}) as Record<string, string>,
      publishers: unique,
    };
  });
}

export function createDockerCli(): Docker {
  return {
    async up(project, dir, dockerConfig) {
      await run(
        ['compose', '-p', project, '-f', 'compose.json', 'up', '-d', '--remove-orphans', '--quiet-pull'],
        dir,
        dockerConfig ? { env: { DOCKER_CONFIG: dockerConfig } } : {},
      );
    },
    async login(dockerConfig, registry, username, password) {
      await mkdir(dockerConfig, { recursive: true, mode: 0o700 });
      await run(['--config', dockerConfig, 'login', registry, '-u', username, '--password-stdin'], undefined, {
        stdin: password,
      });
    },
    async down(project) {
      await run(['compose', '-p', project, 'down', '--remove-orphans']);
    },
    async ps(project, service) {
      // By label, not `docker compose ps`: that needs the Compose file, and a
      // removed installation's project may have none left.
      const ids = (
        await run([
          'ps', '-aq',
          '--filter', `label=com.docker.compose.project=${project}`,
          '--filter', `label=com.docker.compose.service=${service}`,
        ])
      )
        .split('\n')
        .map(id => id.trim())
        .filter(Boolean);
      if (ids.length === 0) return [];
      return parseInspect(await run(['inspect', ...ids]));
    },
    async repoDigests(imageId) {
      const digests = await run(['image', 'inspect', '--format', '{{json .RepoDigests}}', imageId]);
      const parsed = JSON.parse(digests.trim() || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    },
  };
}
