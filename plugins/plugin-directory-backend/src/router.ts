import express from 'express';
import Router from 'express-promise-router';
import { NotAllowedError, NotFoundError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import {
  pluginDirectoryAdminPermission,
  pluginDirectoryReadPermission,
} from '@internal/platform-common';
import type { PluginDirectoryService } from './service';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: PluginDirectoryService;
}

async function authorize(
  permissions: PermissionsService | undefined,
  httpAuth: HttpAuthService,
  req: express.Request,
  permission: BasicPermission,
) {
  if (!permissions) {
    throw new NotAllowedError('Permission service is not configured');
  }
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const [decision] = await permissions.authorize([{ permission }], {
    credentials,
  });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
}

function respondError(
  res: express.Response,
  logger: LoggerService,
  error: unknown,
) {
  if (error instanceof NotAllowedError) {
    res.status(403).json({ error: { message: error.message } });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: { message: error.message } });
    return;
  }
  logger.error(String(error));
  res.status(500).json({
    error: {
      message: error instanceof Error ? error.message : 'Internal error',
    },
  });
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, service } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', plugin: 'plugin-directory', version: '0.1' });
  });

  router.get('/summary', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, pluginDirectoryReadPermission);
      res.json(service.summary());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/plugins', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, pluginDirectoryReadPermission);
      res.json(
        service.list({
          q: typeof req.query.q === 'string' ? req.query.q : undefined,
          type: typeof req.query.type === 'string' ? req.query.type : undefined,
          lifecycle:
            typeof req.query.lifecycle === 'string'
              ? req.query.lifecycle
              : undefined,
          validationStatus:
            typeof req.query.validationStatus === 'string'
              ? req.query.validationStatus
              : undefined,
        }),
      );
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/plugins/:id', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, pluginDirectoryReadPermission);
      void pluginDirectoryAdminPermission;
      const item = service.get(req.params.id);
      if (!item) {
        throw new NotFoundError(`Plugin '${req.params.id}' not found`);
      }
      res.json(item);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/plugins/:id/dependencies', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, pluginDirectoryReadPermission);
      const item = service.get(req.params.id);
      if (!item) {
        throw new NotFoundError(`Plugin '${req.params.id}' not found`);
      }
      res.json({ id: item.id, dependencies: item.dependencies ?? [] });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  return router;
}
