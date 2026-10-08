/**
 * One pass of the Docker Compose provider (NXD-144): read the target's
 * desired state, make each installation so, and report what runs.
 *
 * - **PRESENT** is applied when nothing runs, when what runs answers another
 *   desired revision, or when it has stopped. A container that runs the
 *   current revision is left alone, healthy or not: the provider reports
 *   DEGRADED, it does not restart its way out of an unhealthy product.
 * - **ABSENT** is `docker compose down` without `-v`. The volumes stay, for
 *   a GMP installation and any other, until QA decides retention (the
 *   user's decision of 2026-10-08). The secrets file is deleted.
 * - **Blocked** (the pinned version is gone, NXD-143): nothing is applied;
 *   what runs is reported, with the reason. A removal still happens: taking
 *   a project down needs no version.
 * - **What is reported is read back from Docker** after the change: the
 *   container's labels give the revision and configuration hash it was
 *   created for, and the image's registry digests the digest it runs. An
 *   apply that failed leaves the old container, and the report says so.
 *
 * Each installation is reconciled on its own; one failure is reported and
 * the pass goes on.
 */

import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import type {
  InstallationObservedState,
  ObservedStateReport,
  ProviderDesiredInstallation,
  ProviderDesiredState,
} from '@internal/platform-common';
import type { NexoraApi } from './api';
import {
  LABEL_CONFIG_HASH,
  LABEL_INSTALLATION,
  LABEL_REVISION,
  SERVICE,
  UnresolvedSecretError,
  projectName,
  renderProject,
  renderSecretsEnv,
  type SecretResolver,
} from './compose';
import type { ContainerStatus, Docker } from './docker';

export interface ReconcileOptions {
  api: NexoraApi;
  docker: Docker;
  resolveSecret: SecretResolver;
  /** Where each project's Compose file is written. */
  workDir: string;
  /** An external Docker network every installation also joins. */
  network?: string;
  log?: (message: string) => void;
}

export interface ReconcileOutcome {
  installationId: string;
  project: string;
  action: 'applied' | 'removed' | 'unchanged' | 'blocked' | 'failed';
  report?: ObservedStateReport;
  error?: string;
}

const STOPPED_STATES = new Set(['exited', 'dead', 'created']);

function message(...parts: Array<string | undefined>): string | undefined {
  const text = parts.filter(Boolean).join('; ');
  return text || undefined;
}

/** What one container's Docker state means in the store's vocabulary. */
export function observedState(container: ContainerStatus): InstallationObservedState {
  switch (container.state) {
    case 'running':
      if (container.health === 'unhealthy') return 'DEGRADED';
      if (container.health === 'starting') return 'PENDING';
      return 'RUNNING';
    case 'restarting':
      return 'DEGRADED';
    case 'created':
      return 'PENDING';
    case 'exited':
    case 'dead':
    case 'paused':
      return 'STOPPED';
    default:
      return 'UNKNOWN';
  }
}

export async function reconcile(options: ReconcileOptions): Promise<ReconcileOutcome[]> {
  const state = await options.api.desired();
  const outcomes: ReconcileOutcome[] = [];
  for (const item of state.installations) {
    outcomes.push(await reconcileOne(item, state, options));
  }
  return outcomes;
}

async function reconcileOne(
  item: ProviderDesiredInstallation,
  state: ProviderDesiredState,
  options: ReconcileOptions,
): Promise<ReconcileOutcome> {
  const { docker, api } = options;
  const log = options.log ?? (() => {});
  const project = projectName(state.target.name, item.name);
  const dir = join(options.workDir, project);
  const { desired } = item;

  const send = async (
    action: ReconcileOutcome['action'],
    report: ObservedStateReport,
    error?: string,
  ): Promise<ReconcileOutcome> => {
    try {
      await api.report(item.id, report);
    } catch (reportError) {
      log(`${project}: report refused: ${String(reportError)}`);
      return { installationId: item.id, project, action: 'failed', report, error: String(reportError) };
    }
    return { installationId: item.id, project, action, report, ...(error ? { error } : {}) };
  };
  const failed = (reason: string) => {
    log(`${project}: ${reason}`);
    return send('failed', { state: 'FAILED', desiredRevision: desired.revision, message: reason }, reason);
  };

  try {
    let containers = await docker.ps(project, SERVICE);
    const foreign = containers.find(c => c.labels[LABEL_INSTALLATION] !== item.id);
    if (foreign) {
      return failed(
        `Compose project ${project} holds a container that is not installation ${item.id}; ` +
          'it is left alone',
      );
    }

    if (desired.state === 'ABSENT') {
      let action: ReconcileOutcome['action'] = 'unchanged';
      if (containers.length > 0) {
        await docker.down(project);
        action = 'removed';
        log(`${project}: removed; volumes kept`);
      }
      await rm(join(dir, 'secrets.env'), { force: true });
      const kept = (item.runtime?.storage ?? []).map(area => `${project}_${area.name}`);
      return send(action, {
        state: 'ABSENT',
        desiredRevision: desired.revision,
        ...(kept.length > 0 ? { message: `volumes kept: ${kept.join(', ')}` } : {}),
      });
    }

    if (item.blocked) {
      const observed = await observe(containers, item, options);
      return send('blocked', {
        ...(observed ?? { state: 'UNKNOWN', desiredRevision: desired.revision }),
        message: message(`not applied: ${item.blocked}`, observed?.message),
      });
    }

    const current = containers[0];
    const answersDesire =
      current && Number(current.labels[LABEL_REVISION]) === desired.revision;
    let action: ReconcileOutcome['action'] = 'unchanged';
    if (!current || !answersDesire || STOPPED_STATES.has(current.state)) {
      let rendered;
      try {
        rendered = await renderProject(item, state.target.id, options.resolveSecret, {
          network: options.network,
        });
      } catch (error) {
        if (error instanceof UnresolvedSecretError) return failed(error.message);
        throw error;
      }
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'compose.json'), `${JSON.stringify(rendered.compose, null, 2)}\n`);
      if (Object.keys(rendered.secrets).length > 0) {
        await writeFile(join(dir, 'secrets.env'), renderSecretsEnv(rendered.secrets), { mode: 0o600 });
      } else {
        await rm(join(dir, 'secrets.env'), { force: true });
      }
      try {
        await docker.up(project, dir);
      } catch (error) {
        return failed(`apply of revision ${desired.revision} failed: ${String((error as Error).message)}`);
      }
      action = 'applied';
      log(`${project}: applied revision ${desired.revision}`);
      containers = await docker.ps(project, SERVICE);
    }

    const observed = await observe(containers, item, options);
    if (!observed) return failed(`revision ${desired.revision} was applied but no container exists`);
    return send(action, observed);
  } catch (error) {
    return failed(String((error as Error).message ?? error));
  }
}

/** What runs, as Docker tells it; undefined when nothing does. */
async function observe(
  containers: ContainerStatus[],
  item: ProviderDesiredInstallation,
  options: ReconcileOptions,
): Promise<ObservedStateReport | undefined> {
  const container = containers.find(c => c.state === 'running') ?? containers[0];
  if (!container) return undefined;
  const revision = Number(container.labels[LABEL_REVISION]);
  const configHash = container.labels[LABEL_CONFIG_HASH];
  const digests = container.image ? await options.docker.repoDigests(container.image) : [];
  const prefix = `${item.desired.imageRepository}@`;
  const digest = digests.find(d => d.startsWith(prefix))?.slice(prefix.length);
  const ports = container.publishers
    .map(p => `${p.targetPort}/${p.protocol} on host port ${p.publishedPort}`)
    .join(', ');
  return {
    state: observedState(container),
    desiredRevision: Number.isInteger(revision) && revision > 0 ? revision : item.desired.revision,
    ...(digest && /^sha256:[0-9a-f]{64}$/.test(digest) ? { imageDigest: digest } : {}),
    ...(configHash && /^sha256:[0-9a-f]{64}$/.test(configHash) ? { configHash } : {}),
    ...(ports ? { message: ports } : {}),
  };
}
