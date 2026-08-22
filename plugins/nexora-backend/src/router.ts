import express from 'express';
import Router from 'express-promise-router';
import { Config } from '@backstage/config';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  dataProductViewPermission,
  ProviderResult,
  unavailableResult,
} from '@internal/platform-common';
import { mockIndustrialProvider } from './fixtures';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  httpAuth?: HttpAuthService;
  permissions?: PermissionsService;
}

async function maybeProxy(
  config: Config,
  key: 'connectivity' | 'dataQuality' | 'contracts',
  path: string,
  entityRef: string,
): Promise<ProviderResult<unknown> | undefined> {
  const mode = config.getOptionalString('nexora.providers.mode') || 'mock';
  if (mode !== 'remote') {
    return undefined;
  }
  const baseUrl = config.getOptionalString(`nexora.providers.${key}.baseUrl`);
  if (!baseUrl) {
    return undefined;
  }
  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/${path}?entityRef=${encodeURIComponent(entityRef)}`,
  );
  if (!response.ok) {
    return unavailableResult('Remote industrial provider failed.', response.status);
  }
  return (await response.json()) as ProviderResult<unknown>;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, httpAuth, permissions } = options;
  const router = Router();
  router.use(express.json());

  const requireView = async (
    req: express.Request,
    res: express.Response,
  ): Promise<boolean> => {
    if (!httpAuth || !permissions) {
      res.status(403).json({ error: 'Not allowed' });
      return false;
    }
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const [decision] = await permissions.authorize(
        [{ permission: dataProductViewPermission }],
        { credentials },
      );
      if (decision.result !== AuthorizeResult.ALLOW) {
        res.status(403).json({ error: 'Not allowed' });
        return false;
      }
      return true;
    } catch {
      res.status(403).json({ error: 'Not allowed' });
      return false;
    }
  };

  const handle = (
    path: string,
    configKey: 'connectivity' | 'dataQuality' | 'contracts',
    mock: (entityRef: string) => ProviderResult<unknown>,
  ) => {
    router.get(`/${path}`, async (req, res) => {
      if (!(await requireView(req, res))) {
        return;
      }
      const entityRef = String(req.query.entityRef ?? '').trim();
      if (!entityRef) {
        res.status(400).json(unavailableResult('entityRef is required.', 400));
        return;
      }
      try {
        const remote = await maybeProxy(config, configKey, path, entityRef);
        res.json(remote ?? mock(entityRef));
      } catch (error) {
        logger.warn(
          `Nexora ${path} failed for ${entityRef}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        res.json(unavailableResult('Industrial provider is unavailable.'));
      }
    });
  };

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', provider: config.getOptionalString('nexora.providers.mode') || 'mock' });
  });

  handle('metrics', 'dataQuality', entityRef => mockIndustrialProvider.metrics(entityRef));
  handle('equipment-state', 'connectivity', entityRef => mockIndustrialProvider.state(entityRef));
  handle('connectivity', 'connectivity', entityRef => mockIndustrialProvider.connectivity(entityRef));
  handle('quality', 'dataQuality', entityRef => mockIndustrialProvider.quality(entityRef));
  handle('contracts', 'contracts', entityRef => mockIndustrialProvider.contract(entityRef));
  handle('capabilities', 'contracts', entityRef => mockIndustrialProvider.capabilities(entityRef));

  return router;
}
