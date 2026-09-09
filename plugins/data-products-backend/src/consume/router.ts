import express from 'express';
import { InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import {
  dataProductConsumePermission,
  dataProductViewPermission,
  dataProductViewQualityPermission,
  dataProductViewValidationPermission,
} from '@internal/platform-common';
import {
  descriptorFromEntity,
  isDataProductComponent,
} from '@internal/data-product-consumption/node';
import { fixtureQuery, fixtureStreamEvent, resolveBaseUrl } from './fixtures';

export interface ConsumeRouterOptions {
  logger: LoggerService;
  catalog: CatalogService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  /** Map of product name or template id → base URL */
  baseUrls: Record<string, string>;
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
  const [decision] = await permissions.authorize([{ permission }], { credentials });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
  return credentials;
}

async function loadProduct(
  catalog: CatalogService,
  httpAuth: HttpAuthService,
  req: express.Request,
  entityRef: string,
) {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const entity = await catalog.getEntityByRef(entityRef, { credentials });
  if (!entity || !isDataProductComponent(entity)) {
    throw new NotFoundError(`Data Product ${entityRef} not found`);
  }
  return entity;
}

export function mountConsumeRoutes(
  router: express.Router,
  options: ConsumeRouterOptions,
) {
  const { logger, catalog, httpAuth, permissions, baseUrls } = options;

  router.get('/consume/products/:entityRef', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, dataProductViewPermission);
      const entityRef = decodeURIComponent(req.params.entityRef);
      const entity = await loadProduct(catalog, httpAuth, req, entityRef);
      res.json(descriptorFromEntity(entity));
    } catch (error) {
      respond(res, logger, error);
    }
  });

  router.get('/consume/query', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, dataProductConsumePermission);
      const entityRef = String(req.query.entityRef ?? '').trim();
      if (!entityRef) throw new InputError('entityRef required');
      const entity = await loadProduct(catalog, httpAuth, req, entityRef);
      const context = {
        site: String(req.query.site ?? ''),
        area: String(req.query.area ?? ''),
        line: String(req.query.line ?? ''),
        equipment: String(req.query.equipment ?? ''),
      };
      const baseUrl = resolveBaseUrl(baseUrls, entity);
      if (baseUrl) {
        const path =
          entity.metadata.annotations?.['dataprod.platform/consume-rest-path'] ??
          '/api/v1';
        try {
          const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!upstream.ok) {
            res.json({
              source: 'unavailable',
              detail: `Upstream HTTP ${upstream.status}`,
              columns: [],
              rows: [],
            });
            return;
          }
          const body = (await upstream.json()) as unknown;
          let rows: Record<string, unknown>[];
          if (Array.isArray(body)) {
            rows = body as Record<string, unknown>[];
          } else if (Array.isArray((body as { items?: unknown[] }).items)) {
            rows = (body as { items: unknown[] }).items as Record<
              string,
              unknown
            >[];
          } else {
            rows = [body as Record<string, unknown>];
          }
          const columns = Object.keys(rows[0] ?? {}).map(id => ({ id }));
          res.json({ source: 'upstream', columns, rows, total: rows.length });
          return;
        } catch (cause) {
          logger.warn(`Upstream query failed for ${entityRef}: ${String(cause)}`);
          res.json({
            source: 'unavailable',
            detail: 'UPSTREAM_UNAVAILABLE',
            columns: [],
            rows: [],
          });
          return;
        }
      }
      res.json(fixtureQuery(entity, context));
    } catch (error) {
      respond(res, logger, error);
    }
  });

  router.get('/consume/stream-poll', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, dataProductConsumePermission);
      const entityRef = String(req.query.entityRef ?? '').trim();
      if (!entityRef) throw new InputError('entityRef required');
      const entity = await loadProduct(catalog, httpAuth, req, entityRef);
      const context = {
        equipment: String(req.query.equipment ?? ''),
        site: String(req.query.site ?? ''),
      };
      res.json({ items: [fixtureStreamEvent(entity, context)] });
    } catch (error) {
      respond(res, logger, error);
    }
  });

  router.get('/consume/stream', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, dataProductConsumePermission);
      const entityRef = String(req.query.entityRef ?? '').trim();
      if (!entityRef) throw new InputError('entityRef required');
      const entity = await loadProduct(catalog, httpAuth, req, entityRef);
      const context = {
        equipment: String(req.query.equipment ?? ''),
        site: String(req.query.site ?? ''),
      };

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const send = () => {
        const event = fixtureStreamEvent(entity, context);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };
      send();
      const timer = setInterval(send, 2000);
      req.on('close', () => clearInterval(timer));
    } catch (error) {
      respond(res, logger, error);
    }
  });

  router.get('/consume/quality/:entityRef', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, dataProductViewQualityPermission);
      const entity = await loadProduct(
        catalog,
        httpAuth,
        req,
        decodeURIComponent(req.params.entityRef),
      );
      const d = descriptorFromEntity(entity);
      res.json(d.quality);
    } catch (error) {
      respond(res, logger, error);
    }
  });

  router.get('/consume/validation/:entityRef', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, dataProductViewValidationPermission);
      const entity = await loadProduct(
        catalog,
        httpAuth,
        req,
        decodeURIComponent(req.params.entityRef),
      );
      const d = descriptorFromEntity(entity);
      res.json(d.validation);
    } catch (error) {
      respond(res, logger, error);
    }
  });
}

function respond(res: express.Response, logger: LoggerService, error: unknown) {
  if (error instanceof NotAllowedError) {
    res.status(403).json({ error: error.message || 'Forbidden', code: 'FORBIDDEN' });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
    return;
  }
  if (error instanceof InputError) {
    res.status(400).json({ error: error.message, code: 'UNKNOWN' });
    return;
  }
  logger.error(String(error));
  res.status(500).json({ error: 'Internal Server Error', code: 'UNKNOWN' });
}
