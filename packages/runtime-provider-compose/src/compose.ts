/**
 * What the provider writes for one installation (NXD-144): a Compose project
 * of one service, and the environment it runs with. Pure, so the rules are
 * tested without Docker.
 *
 * - **The image is pinned by digest**, `repository@sha256:…`, from the
 *   desired state, which took it from the release build (NXD-137). A tag is
 *   never used: a tag can move, a digest cannot.
 * - **Each storage area is a named volume of the project** (NXD-142), so two
 *   installations never share one, and `docker compose down` without `-v`,
 *   the only way this provider takes a project down, keeps it.
 * - **Each port is published on an ephemeral host port**: two installations
 *   of one product on one host cannot collide. Which port Docker chose is
 *   observed and reported, not decided here.
 * - **Labels carry the desire the container answers**: installation id,
 *   desired revision and configuration hash. The provider reads them back
 *   from the running container, so what it reports is what runs, not what it
 *   last meant to run.
 */

import {
  computeInstallationConfigHash,
  isSecretReference,
  type ProviderDesiredInstallation,
} from '@internal/platform-common';

export const LABEL_INSTALLATION = 'org.nexora.installation-id';
export const LABEL_REVISION = 'org.nexora.desired-revision';
export const LABEL_CONFIG_HASH = 'org.nexora.config-hash';
export const LABEL_TARGET = 'org.nexora.target-id';

/** The one service of every project. */
export const SERVICE = 'app';

/** Compose project names: lowercase, digits, `-` and `_`. */
export function projectName(targetName: string, installationName: string): string {
  return `nexora-${targetName}-${installationName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

/** Reads a secret by reference from the target's secret store. */
export type SecretResolver = (secretRef: string) => Promise<string | undefined>;

export interface RenderedProject {
  /** The Compose file, as JSON (a YAML document Compose reads as such). */
  compose: Record<string, unknown>;
  /** Plain configuration values, defaults applied. */
  environment: Record<string, string>;
  /** Secret values, for an env file the provider writes with mode 0600. */
  secrets: Record<string, string>;
  configHash: string;
}

export class UnresolvedSecretError extends Error {}

/**
 * Renders one PRESENT installation. Throws `UnresolvedSecretError` naming
 * the reference, never a value, when the target's store has no such secret.
 */
export async function renderProject(
  item: ProviderDesiredInstallation,
  targetId: string,
  resolveSecret: SecretResolver,
  options: { network?: string } = {},
): Promise<RenderedProject> {
  const { desired } = item;
  const environment: Record<string, string> = {};
  // Defaults first: the stored configuration holds only what the installer
  // chose (NXD-139), and a key left out takes its manifest default.
  for (const entry of item.configSchema ?? []) {
    if (entry.type !== 'secret' && entry.defaultValue !== undefined) {
      environment[entry.key] = entry.defaultValue;
    }
  }
  const secrets: Record<string, string> = {};
  for (const [key, value] of Object.entries(desired.config)) {
    if (isSecretReference(value)) {
      const resolved = await resolveSecret(value.secretRef);
      if (resolved === undefined) {
        throw new UnresolvedSecretError(
          `config.${key} refers to secret "${value.secretRef}", which this target's secret store does not hold`,
        );
      }
      secrets[key] = resolved;
    } else {
      environment[key] = value;
    }
  }

  // The hash of the configuration as stored, the form the IQ compares
  // (NXD-139); defaults and resolved secrets are not part of it.
  const configHash = computeInstallationConfigHash(desired.config);
  const runtime = item.runtime;
  const volumes = Object.fromEntries((runtime?.storage ?? []).map(area => [area.name, {}]));

  const service: Record<string, unknown> = {
    image: `${desired.imageRepository}@${desired.imageDigest}`,
    restart: 'unless-stopped',
    labels: {
      [LABEL_INSTALLATION]: item.id,
      [LABEL_REVISION]: String(desired.revision),
      [LABEL_CONFIG_HASH]: configHash,
      [LABEL_TARGET]: targetId,
    },
    environment,
    ...(Object.keys(secrets).length > 0 ? { env_file: ['secrets.env'] } : {}),
    ...(runtime?.ports?.length
      ? {
          ports: runtime.ports.map(port =>
            port.protocol === 'udp' ? `${port.containerPort}/udp` : String(port.containerPort),
          ),
        }
      : {}),
    ...(runtime?.storage?.length
      ? { volumes: runtime.storage.map(area => `${area.name}:${area.mountPath}`) }
      : {}),
    ...(runtime?.resources?.limits
      ? {
          deploy: {
            resources: {
              limits: {
                ...(runtime.resources.limits.cpu ? { cpus: cpus(runtime.resources.limits.cpu) } : {}),
                ...(runtime.resources.limits.memory
                  ? { memory: memory(runtime.resources.limits.memory) }
                  : {}),
              },
            },
          },
        }
      : {}),
    ...(options.network ? { networks: ['default', options.network] } : {}),
  };

  return {
    compose: {
      services: { [SERVICE]: service },
      ...(Object.keys(volumes).length > 0 ? { volumes } : {}),
      ...(options.network ? { networks: { [options.network]: { external: true } } } : {}),
    },
    environment,
    secrets,
    configHash,
  };
}

/** Kubernetes CPU quantity (`500m`, `1.5`) to Compose's decimal string. */
function cpus(quantity: string): string {
  return quantity.endsWith('m') ? String(Number(quantity.slice(0, -1)) / 1000) : quantity;
}

/** Kubernetes memory quantity (`512Mi`, `2Gi`) to Compose's byte units. */
function memory(quantity: string): string {
  const match = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|K|M|G|T)?$/.exec(quantity);
  if (!match) return quantity;
  const unit = (match[2] ?? '').replace('i', '').toLowerCase();
  return `${match[1]}${unit}`;
}

/** The env file of secret values: `KEY=value`, one per line. */
export function renderSecretsEnv(secrets: Record<string, string>): string {
  return Object.entries(secrets)
    .map(([key, value]) => `${key}=${value.replace(/\r?\n/g, '')}`)
    .join('\n')
    .concat('\n');
}
