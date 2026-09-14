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
  GithubFetchFailure,
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
      return unknownCiStatus(fetchFailureMessage(latest.reason));
    }
    if (!latest.value) {
      return unknownCiStatus(
        'No workflow run has been recorded for this repository yet.',
      );
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

/**
 * Keeps the reason a CI lookup failed instead of collapsing everything to
 * "Not available". The status stays UNKNOWN in every case — this only tells
 * an operator which of the causes they are looking at, which matters most
 * when the GitHub App is missing the Actions: Read-only permission.
 */
function fetchFailureMessage(reason: GithubFetchFailure): string {
  switch (reason) {
    case 'inaccessible':
      return 'GitHub denied access to Actions for this repository. The GitHub App needs the Actions: Read-only permission.';
    case 'not-found':
      return 'No CI workflow was found for this repository.';
    case 'unavailable':
    default:
      return 'GitHub Actions could not be reached.';
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}
