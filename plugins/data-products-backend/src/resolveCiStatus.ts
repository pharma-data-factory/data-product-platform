import {
  BackstageCredentials,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';

import {
  mapGithubRunToPlatformStatus,
  toPublicRunFields,
} from './mapCiStatus';
import { resolveGithubRepository } from './resolveRepository';
import {
  DataProductCiStatus,
  GithubActionsClient,
  publicCiStatus,
  unknownCiStatus,
} from './types';

export async function resolveCiStatus(options: {
  entityRef: string;
  catalog: CatalogService;
  credentials: BackstageCredentials;
  github: GithubActionsClient;
  logger?: LoggerService;
}): Promise<DataProductCiStatus> {
  const { entityRef, catalog, credentials, github, logger } = options;

  try {
    const entity = await catalog.getEntityByRef(entityRef, { credentials });
    if (!entity) {
      return unknownCiStatus('Not available');
    }
    return await ciStatusForEntity({ entity, github, logger });
  } catch (error) {
    logger?.warn(
      `Failed to resolve CI status for ${entityRef}: ${errorMessage(error)}`,
    );
    return unknownCiStatus('Not available');
  }
}

export async function ciStatusForEntity(options: {
  entity: Entity;
  github: GithubActionsClient;
  logger?: LoggerService;
}): Promise<DataProductCiStatus> {
  const repo = resolveGithubRepository(options.entity);
  if (!repo) {
    return unknownCiStatus('Not available');
  }

  try {
    const latest = await options.github.getLatestRun(repo);
    if (!latest.ok) {
      return unknownCiStatus('Not available');
    }
    if (!latest.value) {
      return unknownCiStatus('Not available');
    }

    const run = latest.value;
    const status = mapGithubRunToPlatformStatus(run);
    const failedStages =
      status === 'FAILED'
        ? await options.github.getFailedStages(repo, run.id)
        : [];

    return publicCiStatus({
      status,
      ...toPublicRunFields(run),
      ...(failedStages.length > 0 ? { failedStages } : {}),
    });
  } catch (error) {
    options.logger?.warn(
      `GitHub CI lookup failed for ${repo.owner}/${repo.repo}: ${errorMessage(error)}`,
    );
    return unknownCiStatus('Not available');
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}
