/**
 * The Docker Compose runtime provider (NXD-144). See `main.ts` to run it.
 */

export { createNexoraApi, NexoraApiError, type NexoraApi } from './api';
export { readConfig, type ProviderConfig } from './config';
export { projectName, renderProject, renderSecretsEnv } from './compose';
export { createDockerCli, parseInspect, type Docker, type ContainerStatus } from './docker';
export { reconcile, observedState, type ReconcileOutcome } from './reconcile';
export { createFileSecretResolver } from './secrets';
