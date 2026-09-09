/**
 * Product Composer backend router.
 *
 * HTTP endpoints for Product CRUD, version/component/contract management, and
 * traceability links. All routes are gated through the Backstage Permission
 * Framework (product.read / product.create / product.manage).
 */

import express from 'express';
import Router from 'express-promise-router';
import {
  AuthenticationError,
  InputError,
  NotAllowedError,
} from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import {
  AuthorizeResult,
  BasicPermission,
} from '@backstage/plugin-permission-common';
import {
  productCreatePermission,
  productManagePermission,
  productReadPermission,
} from '@internal/platform-common';
import { ComposerService } from './service';
import type { AvailableComponentSummary } from './llm-client';
import {
  CreateDataContractRequest,
  CreateProductBaselineRequest,
  CreateProductComponentRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTraceabilityLinkRequest,
  TransitionProductVersionRequest,
} from './types';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: ComposerService;
  llmEnabled?: boolean;
}

async function authorize(
  permissions: PermissionsService | undefined,
  httpAuth: HttpAuthService,
  req: express.Request,
  permission: BasicPermission,
): Promise<string> {
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
  return credentials.principal?.userEntityRef || 'unknown';
}

function respondError(
  res: express.Response,
  logger: LoggerService,
  error: unknown,
) {
  if (error instanceof AuthenticationError) {
    res.status(401).json({ error: error.message || 'Unauthorized' });
    return;
  }
  if (error instanceof NotAllowedError) {
    const message = error.message || 'Forbidden';
    if (message.includes('not configured')) {
      logger.error(`Authorization service misconfiguration: ${message}`);
      res.status(500).json({ error: 'Authorization service unavailable' });
      return;
    }
    res.status(403).json({ error: message });
    return;
  }
  if (error instanceof InputError) {
    res.status(400).json({ error: String(error) });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

function parsePagination(
  req: express.Request,
): { limit: number; offset: number } {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  return { limit, offset };
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, service, llmEnabled } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'composer',
      llmEnabled: llmEnabled ?? false,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // PRODUCTS
  // ============================================================================

  router.post('/products', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        productCreatePermission,
      );
      const product = await service.createProduct(
        req.body as CreateProductRequest,
        actor,
      );
      res.status(201).json(product);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get('/products', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, productReadPermission);
      const { limit, offset } = parsePagination(req);
      res.json(await service.listProducts(limit, offset));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get(
    '/products/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const product = await service.getProduct(req.params.id);
        if (!product) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }
        res.json(product);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.put('/products/:id', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        productManagePermission,
      );
      const product = await service.updateProduct(
        req.params.id,
        req.body as Partial<CreateProductRequest>,
        actor,
      );
      res.json(product);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get(
    '/products/:id/traceability',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.getProductTraceability(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // PRODUCT VERSIONS
  // ============================================================================

  router.post(
    '/products/:id/versions',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const version = await service.createProductVersion(
          req.params.id,
          req.body as CreateProductVersionRequest,
          actor,
        );
        res.status(201).json(version);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/products/:id/versions',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.listProductVersions(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // PRODUCT COMPONENTS
  // ============================================================================

  router.post(
    '/versions/:versionId/components',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const component = await service.addProductComponent(
          req.params.versionId,
          req.body as CreateProductComponentRequest,
          actor,
        );
        res.status(201).json(component);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:versionId/components',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.listProductComponents(req.params.versionId));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // DATA CONTRACTS
  // ============================================================================

  router.post(
    '/components/:id/contracts',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const contract = await service.addDataContract(
          req.params.id,
          req.body as CreateDataContractRequest,
          actor,
        );
        res.status(201).json(contract);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // TRACEABILITY LINKS
  // ============================================================================

  router.post(
    '/traceability-links',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const link = await service.createTraceabilityLink(
          req.body as CreateTraceabilityLinkRequest,
          actor,
        );
        res.status(201).json(link);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.delete(
    '/traceability-links/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        await service.deleteTraceabilityLink(req.params.id, actor);
        res.status(204).end();
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // VERSION TRANSITIONS & RELEASE GATE
  // ============================================================================

  router.post(
    '/versions/:versionId/transition',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const version = await service.transitionProductVersionStatus(
          req.params.versionId,
          req.body as TransitionProductVersionRequest,
          actor,
        );
        res.json(version);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:versionId/release-gate',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.checkReleaseGate(req.params.versionId));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // PRODUCT BASELINES
  // ============================================================================

  router.post(
    '/versions/:versionId/baselines',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const baseline = await service.createProductBaseline(
          req.params.versionId,
          req.body as CreateProductBaselineRequest,
          actor,
        );
        res.status(201).json(baseline);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:versionId/baselines',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.listProductBaselines(req.params.versionId));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/baselines/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const baseline = await service.getProductBaseline(req.params.id);
        if (!baseline) {
          res.status(404).json({ error: 'Baseline not found' });
          return;
        }
        res.json(baseline);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.post(
    '/baselines/:id/approve',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const baseline = await service.approveProductBaseline(
          req.params.id,
          actor,
        );
        res.json(baseline);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/baselines/:id/delta',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, productReadPermission);
        const delta = await service.computeProductBaselineDelta(req.params.id, actor);
        res.json(delta);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // AUDIT TRAIL & TRACEABILITY MATRIX
  // ============================================================================

  router.get(
    '/versions/:versionId/audit',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(
          await service.getEntityAuditTrail('PRODUCT_VERSION', req.params.versionId),
        );
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:versionId/traceability-matrix',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const version = await service.getProductVersion(req.params.versionId);
        if (!version) {
          res.status(404).json({ error: 'Version not found' });
          return;
        }
        const components = await service.listProductComponents(
          req.params.versionId,
        );
        const traceability = await service.getProductTraceability(
          version.productId,
        );
        const componentIds = new Set(components.map(c => c.id));
        const relevantLinks = traceability.links.filter(
          l => componentIds.has(l.sourceId) || componentIds.has(l.targetId),
        );
        res.json({
          versionId: req.params.versionId,
          components,
          links: relevantLinks,
        });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.post(
    '/ai/suggest-components',
    async (req: express.Request, res: express.Response) => {
      try {
        const credentials = await httpAuth.credentials(req, { allow: ['user'] });
        const actor = credentials.principal?.userEntityRef ?? 'unknown';

        const { productName, description, domain, existingSelections, availableComponents } =
          req.body as {
            productName?: string;
            description?: string;
            domain?: string;
            existingSelections?: string[];
            availableComponents?: AvailableComponentSummary[];
          };

        if (!productName || !description || !domain || !availableComponents) {
          res.status(400).json({
            error: 'Missing required fields: productName, description, domain, availableComponents',
          });
          return;
        }

        const suggestions = await service.suggestComponents(
          productName,
          description,
          domain,
          existingSelections ?? [],
          availableComponents,
          actor,
        );

        res.json({ suggestions });
      } catch (err) {
        if (err instanceof Error && err.message === 'AI suggestions are not enabled') {
          res.status(501).json({ error: 'AI suggestions are not enabled' });
          return;
        }
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // AI PRODUCT SPEC GENERATION
  // ============================================================================

  router.post(
    '/ai/generate-product-spec',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productCreatePermission,
        );
        const { ursBaselineId } = req.body as { ursBaselineId?: string };
        if (!ursBaselineId) {
          res.status(400).json({ error: 'Missing required field: ursBaselineId' });
          return;
        }
        const draft = await service.generateProductSpec(ursBaselineId, actor);
        res.status(201).json(draft);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not enabled')) {
          res.status(501).json({ error: err.message });
          return;
        }
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/ai/spec-drafts/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const draft = service.getSpecDraft(req.params.id);
        if (!draft) {
          res.status(404).json({ error: 'AI spec draft not found' });
          return;
        }
        res.json(draft);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.post(
    '/ai/spec-drafts/:id/apply',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productCreatePermission,
        );
        const product = await service.applySpecDraft(req.params.id, actor);
        res.json(product);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.post(
    '/ai/spec-drafts/:id/reject',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        await service.rejectSpecDraft(req.params.id, actor);
        res.status(204).end();
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  return router;
}
