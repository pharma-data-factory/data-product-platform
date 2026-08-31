import express from 'express';
import Router from 'express-promise-router';
import { NotAllowedError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { aasManagePermission, aasReadPermission } from '@internal/platform-common';
import {
  AasConflictError,
  AasNotFoundError,
  AasValidationError,
  MemoryAasRepository,
} from './repository';

export interface AasRouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions: PermissionsService;
  repository: MemoryAasRepository;
}

async function authorize(
  req: express.Request,
  options: AasRouterOptions,
  permission: typeof aasReadPermission | typeof aasManagePermission,
) {
  const credentials = await options.httpAuth.credentials(req, { allow: ['user'] });
  const decision = await options.permissions.authorize([{ permission }], {
    credentials,
  });
  if (decision[0]?.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError('Not allowed to access Asset Administration Shell');
  }
  const principal = credentials.principal as { userEntityRef?: string };
  return principal.userEntityRef ?? 'user:default/unknown';
}

function sendError(res: express.Response, error: unknown) {
  if (error instanceof AasNotFoundError) {
    res.status(404).json({ detail: error.message });
    return;
  }
  if (error instanceof AasConflictError) {
    res.status(409).json({ detail: error.message });
    return;
  }
  if (error instanceof AasValidationError) {
    res.status(400).json({ detail: error.message });
    return;
  }
  throw error;
}

export async function createAasRouter(
  options: AasRouterOptions,
): Promise<express.Router> {
  const { repository } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'aas-foundation',
      persistence: 'in-memory',
      prototype: true,
    });
  });

  router.get('/assets', async (req, res) => {
    await authorize(req, options, aasReadPermission);
    res.json(repository.listAssets());
  });

  router.post('/assets', async (req, res) => {
    try {
      const actor = await authorize(req, options, aasManagePermission);
      res.status(201).json(repository.createAsset(req.body, actor));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/assets/:assetId', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(repository.getAsset(req.params.assetId));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.put('/assets/:assetId', async (req, res) => {
    try {
      const actor = await authorize(req, options, aasManagePermission);
      res.json(repository.updateAsset(req.params.assetId, req.body, actor));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/assets/:assetId/deactivate', async (req, res) => {
    try {
      const actor = await authorize(req, options, aasManagePermission);
      res.json(
        repository.updateAsset(req.params.assetId, { active: false }, actor),
      );
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/assets/:assetId/submodels', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(repository.getAsset(req.params.assetId).submodels);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/assets/:assetId/properties', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(repository.getAsset(req.params.assetId).properties);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/assets/:assetId/properties', async (req, res) => {
    try {
      const actor = await authorize(req, options, aasManagePermission);
      res.status(201).json(repository.addProperty(req.params.assetId, req.body, actor));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/assets/:assetId/properties/:propertyId', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(repository.getProperty(req.params.assetId, req.params.propertyId));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/assets/:assetId/properties/:propertyId/endpoint', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      const resolved = repository.resolveProperty(
        req.params.assetId,
        req.params.propertyId,
      );
      if (!resolved.connectivity) {
        res.status(404).json({ detail: 'No operational endpoint mapped' });
        return;
      }
      res.json(resolved.connectivity);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/assets/:assetId/relationships', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(repository.getAsset(req.params.assetId).relationships);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/resolve/assets/:assetId', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(repository.getAsset(req.params.assetId));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/resolve/assets/:assetId/properties/:propertyId', async (req, res) => {
    try {
      await authorize(req, options, aasReadPermission);
      res.json(
        repository.resolveProperty(req.params.assetId, req.params.propertyId),
      );
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/audit', async (req, res) => {
    await authorize(req, options, aasReadPermission);
    res.json(repository.listAudit(String(req.query.assetId ?? '') || undefined));
  });

  return router;
}
