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
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
  NotImplementedError,
  ServiceUnavailableError,
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
import type { PublishReadiness } from './scm-publish-readiness';
import type { PinVerifier } from './pin-verifier';
import type { ReleaseRegistrar } from './release-registrar';
import type { AvailableComponentSummary } from './llm-client';
import {
  BindUrsBaselineRequest,
  CreateDataContractRequest,
  CreateProductDependencyRequest,
  CreateSubscriptionRequest,
  CreateProductBaselineRequest,
  CreateProductComponentRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTraceabilityLinkRequest,
  TransitionProductVersionRequest,
} from './types';

export interface RouterOptions {
  /** NXD-128. Verifies a signer's PIN in the URS Composer. */
  pinVerifier?: PinVerifier;
  /** NXD-137. Registers release builds in the Artifact Registry. */
  releaseRegistrar?: ReleaseRegistrar;
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: ComposerService;
  llmEnabled?: boolean;
  /** NXD-099. Whether a Golden Path could publish a repository here. */
  publishReadiness?: PublishReadiness;
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

/**
 * Authenticates a non-human caller and returns the service it is.
 *
 * Phase 5 closure (Slice 3). Every other route in this plugin admits only
 * `user` credentials, which is correct for them — they are all actions a
 * person takes. Release provenance is the one thing a person must *not* be
 * able to assert: the value of the record is that the system which produced
 * the artifact is the system that named it.
 *
 * This is Backstage's own external-access mechanism, configured rather than
 * invented — `backend.auth.externalAccess` with a static token, which
 * `httpAuth` then presents as a service principal. No new credential type and
 * no new dependency; the mechanism was always available and simply unused
 * here, so this route is the first in the repository to accept one.
 *
 * Permission-framework authorization is deliberately *not* applied. The
 * platform's permissions resolve a `PlatformRole` from catalog group
 * membership, and a service principal has no catalog identity to resolve — so
 * asking the policy about it would compare against an empty role set and deny.
 * Possession of the external-access token is the authorization here, which is
 * the model Backstage intends for external callers.
 */
async function authorizeService(
  httpAuth: HttpAuthService,
  req: express.Request,
): Promise<string> {
  const credentials = await httpAuth.credentials(req, { allow: ['service'] });
  return credentials.principal?.subject || 'external:unknown';
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
  // A duplicate version label is the caller asking for something that already
  // exists, not a server fault. Without this it fell through to a 500.
  if (error instanceof ConflictError) {
    res.status(409).json({ error: String(error) });
    return;
  }
  // Same reasoning for the opposite case: asking for something that is not
  // there is a 404, not a fault. Found by exercising /contracts/resolve
  // against a coordinate that does not exist — it answered 500, which reads
  // as "the platform is broken" rather than "no such contract".
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: String(error) });
    return;
  }
  // A capability this deployment does not offer. The AI endpoints are off by
  // default (`composer.ai.enabled: false`), and a caller hitting one was
  // told "Internal server error" — which reads as a fault to be reported
  // rather than a feature to be switched on. 501 says "won't", and unlike a
  // 500 it is not worth paging anyone about, so it is not logged as an error.
  if (error instanceof NotImplementedError) {
    res.status(501).json({ error: String(error) });
    return;
  }
  // A dependency that was meant to be here and is not. 503 says "can't, for
  // now" — distinct from 501 because nobody chose this, and logged because
  // an operator has to act on it. Same reasoning the NotAllowedError branch
  // above already applies to a misconfigured permission service.
  if (error instanceof ServiceUnavailableError) {
    logger.error(`Dependency unavailable: ${error.message}`);
    res.status(503).json({ error: String(error) });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

function parsePagination(
  req: express.Request,
): { limit: number; offset: number } {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  return { limit, offset };
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, service, llmEnabled, publishReadiness } =
    options;
  const router = Router();

  /** A PIN check bound to the caller's own credentials (NXD-128). */
  const pinVerifierFor = async (req: express.Request) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    return (pin: string) => {
      if (!options.pinVerifier) {
        throw new NotAllowedError('Signing is not configured on this instance.');
      }
      return options.pinVerifier(credentials, pin);
    };
  };
  /** Release-build registration bound to the caller's credentials (NXD-137). */
  const registrarFor = async (req: express.Request) => {
    if (!options.releaseRegistrar) {
      return undefined;
    }
    const registrar = options.releaseRegistrar;
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    return (request: Parameters<ReleaseRegistrar>[1]) => registrar(credentials, request);
  };
  router.use(express.json());

  router.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'composer',
      llmEnabled: llmEnabled ?? false,
      timestamp: new Date().toISOString(),
    });
  });

  // NXD-099. Asked by the frontend before a Golden Path is started, so a
  // missing credential is said up front rather than discovered at the fourth
  // step of a run. Any signed-in user: it names the configured organisation,
  // which is not public, and nothing more.
  router.get('/scm/publish-readiness', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      res.json(
        publishReadiness ?? {
          ready: false,
          reason: 'NO_SCM_TARGET',
          message: 'Publish readiness is not known for this installation.',
        },
      );
    } catch (error) {
      respondError(res, logger, error);
    }
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

  /**
   * GET /urs-baselines/:id/gmp-classification (NXD-119)
   *
   * Which products depend on a URS baseline, how GxP-relevant each is, and
   * who created the versions bound to it. Read by the Validation Expert to
   * decide which signatures a validation decision needs, as a service, and by
   * a person with product.read.
   */
  router.get(
    '/urs-baselines/:id/gmp-classification',
    async (req: express.Request, res: express.Response) => {
      try {
        const credentials = await httpAuth.credentials(req, {
          allow: ['user', 'service'],
        });
        if (credentials.principal.type === 'user') {
          await authorize(permissions, httpAuth, req, productReadPermission);
        }
        res.json(await service.getUrsBaselineGmpClassification(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /versions/:id/test-evidence (NXD-124)
   * Newest execution of each test case per bound requirement. Read by the
   * Validation Expert's product evidence review, as a service, and by a
   * person with product.read.
   */
  router.get(
    '/versions/:id/test-evidence',
    async (req: express.Request, res: express.Response) => {
      try {
        const credentials = await httpAuth.credentials(req, {
          allow: ['user', 'service'],
        });
        if (credentials.principal.type === 'user') {
          await authorize(permissions, httpAuth, req, productReadPermission);
        }
        res.json(await service.getVersionTestEvidence(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /artifacts/:namespace/:name/gmp-classification (NXD-139)
   *
   * Whether the products governing a registry artifact are GMP-relevant.
   * Read by the installations store, on behalf of the person installing, to
   * decide whether the act is an electronic signature; by a service or by a
   * person with product.read.
   */
  router.get(
    '/artifacts/:namespace/:name/gmp-classification',
    async (req: express.Request, res: express.Response) => {
      try {
        const credentials = await httpAuth.credentials(req, {
          allow: ['user', 'service'],
        });
        if (credentials.principal.type === 'user') {
          await authorize(permissions, httpAuth, req, productReadPermission);
        }
        res.json(
          await service.getArtifactGmpClassification(
            req.params.namespace,
            req.params.name,
          ),
        );
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /artifacts/:namespace/:name/versions/:version/release-status (NXD-146)
   *
   * Whether a product version registered as this registry version is
   * RELEASED. Read by the Artifact Registry before it publishes, as a
   * service; by a person with product.read.
   */
  router.get(
    '/artifacts/:namespace/:name/versions/:version/release-status',
    async (req: express.Request, res: express.Response) => {
      try {
        const credentials = await httpAuth.credentials(req, {
          allow: ['user', 'service'],
        });
        if (credentials.principal.type === 'user') {
          await authorize(permissions, httpAuth, req, productReadPermission);
        }
        const { namespace, name, version } = req.params;
        res.json(await service.getArtifactReleaseStatus(namespace, name, version));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /** GET /products/:id/signatures (NXD-128): approvals and releases as attested. */
  router.get(
    '/products/:id/signatures',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json({ items: await service.listProductSignatures(req.params.id) });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get('/products', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, productReadPermission);
      const { limit, offset } = parsePagination(req);
      res.json(await service.listProducts(limit, offset));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * The product that claims a Catalog entity.
   *
   * Declared before `/products/:id` because Express matches in order and
   * `by-entity-ref` would otherwise be read as a product id.
   *
   * The ref goes in the query string rather than the path: it contains a `/`
   * (`component:default/oee-data-product`), and a path parameter carrying an
   * encoded slash is decoded differently by proxies and by Express itself.
   *
   * This is the reverse of the link Step 2 writes, and the reason the
   * `/data-products` page can find its governance without guessing at a name.
   * 404 rather than an empty body when nothing claims it: most Catalog entities
   * are not Nexora products, and the caller has to be able to tell "no product"
   * from "a product with no fields".
   */
  router.get(
    '/products/by-entity-ref',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const ref = String(req.query.ref ?? '');
        const product = await service.getProductByCatalogEntityRef(ref);
        if (!product) {
          res.status(404).json({ error: 'No product claims this entity' });
          return;
        }
        res.json(product);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

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

  router.get(
    '/components/:id/contracts',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.listDataContracts(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /contracts/resolve?ref=namespace/name@version
   *
   * Resolves a contract from its coordinate alone — the point of Slice 1. A
   * consumer in another Product holds the ref and nothing else.
   *
   * Registered before `/contracts/:id` deliberately: Express matches in
   * declaration order, so the parameterised route would otherwise swallow
   * "resolve" as an id.
   */
  router.get(
    '/contracts/resolve',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const ref = String(req.query.ref ?? '');
        res.json(await service.getDataContractByRef(ref));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/contracts/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const contract = await service.getDataContract(req.params.id);
        if (!contract) {
          res.status(404).json({ error: `DataContract ${req.params.id} not found` });
          return;
        }
        res.json(contract);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // PRODUCT DEPENDENCIES (Phase 4, P4-S3)
  // ============================================================================

  router.post(
    '/versions/:id/dependencies',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const dep = await service.addProductDependency(
          req.params.id,
          req.body as CreateProductDependencyRequest,
          actor,
        );
        res.status(201).json(dep);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:id/dependencies',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.listProductDependencies(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ── Subscription Push via SSE (6-R2) ──────────────────────────────────────
  // GET /subscribe/notifications?consumer=X
  // Server-Sent Events stream for upgrade notifications.
  // The client opens this connection once; whenever the server calls
  // dispatchUpgradeNotifications() it sends an event on the stream.
  // No external dependency needed — standard HTTP chunked transfer.

  // SSE client registry is owned by the service (injected at construction).
  const sseClients = service.sseClients as Map<string, Set<express.Response>>;

  router.get(
    '/subscribe/notifications',
    async (req: express.Request, res: express.Response) => {
      const consumerRef = String(req.query.consumer ?? '').trim();
      if (!consumerRef) {
        res.status(400).json({ error: 'consumer query param required' });
        return;
      }
      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
      res.flushHeaders();

      if (!sseClients.has(consumerRef)) sseClients.set(consumerRef, new Set());
      sseClients.get(consumerRef)!.add(res);

      // Heartbeat every 30s to keep the connection alive through proxies
      const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);

      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.get(consumerRef)?.delete(res);
        if (sseClients.get(consumerRef)?.size === 0) sseClients.delete(consumerRef);
      });
    },
  );

  // ── Schema Snapshots (A-2) ────────────────────────────────────────────────
  router.post('/contracts/:id/snapshot', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const actor = (credentials as any).principal?.userEntityRef ?? 'unknown';
      const result = await service.captureSchemaSnapshot(req.params.id, actor);
      res.status(201).json(result);
    } catch (err) { respondError(res, logger, err); }
  });
  router.get('/contracts/:id/snapshots', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, productReadPermission);
      res.json(await service.listSchemaSnapshots(req.params.id));
    } catch (err) { respondError(res, logger, err); }
  });

  // ── Upgrade Notifications (W2-1) ──────────────────────────────────────────
  // POST /contracts/:id/notify   — producer dispatches upgrade to all subscribers
  // GET  /notifications          — my notifications (consumer polls)
  // PATCH /notifications/:id/read — mark read

  router.post('/contracts/:id/notify', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const actor = (credentials as any).principal?.userEntityRef ?? 'unknown';
      const { newVersion, summary, breaking } = req.body as {
        newVersion?: string; summary?: string; breaking?: boolean;
      };
      if (!newVersion?.trim()) { res.status(400).json({ error: 'newVersion required' }); return; }
      const result = await service.dispatchUpgradeNotifications({
        contractId: req.params.id,
        newVersion: newVersion.trim(),
        summary: String(summary ?? `New version ${newVersion} available`),
        breaking: Boolean(breaking),
        actor,
      });
      res.json(result);
    } catch (err) { respondError(res, logger, err); }
  });

  router.get('/notifications', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const consumerRef = String(req.query.consumer ?? (credentials as any).principal?.userEntityRef ?? '').trim();
      const unreadOnly = String(req.query.unread ?? 'false') === 'true';
      if (!consumerRef) { res.status(400).json({ error: 'consumer required' }); return; }
      res.json(await service.listMyUpgradeNotifications(consumerRef, unreadOnly));
    } catch (err) { respondError(res, logger, err); }
  });

  router.patch('/notifications/:id/read', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      await service.markUpgradeNotificationRead(req.params.id);
      res.status(204).end();
    } catch (err) { respondError(res, logger, err); }
  });

  // ── Contract Subscriptions (P-EXT-S4) ─────────────────────────────────────
  // POST /subscriptions           — subscribe to a contract
  // GET  /contracts/:id/subscribers — list all subscribers of a contract
  // GET  /subscriptions?consumer=  — my subscriptions
  // PATCH /subscriptions/:id/status — cancel / pause

  router.post('/subscriptions', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const actor = (credentials as any).principal?.userEntityRef ?? 'unknown';
      const sub = await service.subscribeToContract(req.body as CreateSubscriptionRequest, actor);
      res.status(201).json(sub);
    } catch (err) { respondError(res, logger, err); }
  });

  router.get('/contracts/:id/subscribers', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, productReadPermission);
      res.json(await service.listContractSubscribers(req.params.id));
    } catch (err) { respondError(res, logger, err); }
  });

  router.get('/subscriptions', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const consumerRef = String(req.query.consumer ?? (credentials as any).principal?.userEntityRef ?? '').trim();
      if (!consumerRef) { res.status(400).json({ error: 'consumer query param required' }); return; }
      res.json(await service.listMySubscriptions(consumerRef));
    } catch (err) { respondError(res, logger, err); }
  });

  router.patch('/subscriptions/:id/status', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const actor = (credentials as any).principal?.userEntityRef ?? 'unknown';
      await service.updateSubscriptionStatus(req.params.id, String(req.body?.status ?? ''), actor);
      res.status(204).end();
    } catch (err) { respondError(res, logger, err); }
  });

  // ── Contract compatibility (Phase 4, P4-S5) ────────────────────────────────
  // GET /contracts/:id/compatibility/:nextId
  // Returns a compatibility report for replacing :id with :nextId.
  router.get(
    '/contracts/:id/compatibility/:nextId',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const report = await service.checkContractCompatibility(
          req.params.id,
          req.params.nextId,
        );
        res.json(report);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:id/lineage',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.getDataLineage(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.delete(
    '/dependencies/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        await service.removeProductDependency(req.params.id, actor);
        res.status(204).end();
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // PRODUCT REQUIREMENTS (Slice 1a / 1b)
  // ============================================================================

  /**
   * Bind this version to an approved URS baseline and snapshot its
   * requirements. `product.manage` — stating what a product implements is a
   * governance act on the product, the same authority that approves a version.
   */
  router.post(
    '/versions/:versionId/urs-baseline',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productManagePermission,
        );
        const body = (req.body ?? {}) as BindUrsBaselineRequest;
        const result = await service.bindUrsBaseline(
          req.params.versionId,
          String(body.ursBaselineId ?? ''),
          actor,
        );
        res.status(201).json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:versionId/requirements',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json({
          items: await service.listProductRequirements(req.params.versionId),
        });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // Stage 3 — functional specifications (MVP1 item 11).
  router.get(
    '/versions/:versionId/functional-specifications',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json({
          items: await service.listFunctionalSpecifications(
            req.params.versionId,
          ),
        });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // Deriving writes rows, so it is a create, not a read.
  router.post(
    '/versions/:versionId/functional-specifications/derive',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          productCreatePermission,
        );
        const created = await service.deriveFunctionalSpecifications(
          req.params.versionId,
          actor,
        );
        // 200, not 201: the call is idempotent and a second run legitimately
        // creates nothing. `derived` says how many rows this run wrote.
        res.json({ derived: created.length, items: created });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // The chain G-7 named as missing: URS ↔ FS ↔ Component, resolved.
  router.get(
    '/versions/:versionId/functional-spec-trace',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json({
          items: await service.getFunctionalSpecTrace(req.params.versionId),
        });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/versions/:versionId/requirement-coverage',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.getRequirementCoverage(req.params.versionId));
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
        // NXD-128: approval and release are signed acts for a GMP product.
        const version = await service.signedVersionTransition(
          req.params.versionId,
          req.body as TransitionProductVersionRequest,
          actor,
          await pinVerifierFor(req),
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
        const baseline = await service.signedBaselineApproval(
          req.params.id,
          (req.body ?? {}).signature,
          actor,
          await pinVerifierFor(req),
        );
        res.json(baseline);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /baselines/:id/provenance — CI records what it built.
   *
   * Phase 5 closure (Slice 3): the link from CI evidence to ProductBaseline
   * that the phase names and that nothing implemented. Service credentials
   * only — see `authorizeService`.
   */
  router.post(
    '/baselines/:id/provenance',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorizeService(httpAuth, req);
        const body = (req.body ?? {}) as {
          releaseCommitSha?: unknown;
          artifactDigest?: unknown;
        };
        const baseline = await service.recordBaselineProvenance(
          req.params.id,
          body,
          actor,
        );
        res.json(baseline);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /test-executions — CI records what it verified.
   *
   * MVP1-B (Slice B-4b), audit items 2 and 3. Same shape and the same
   * authorization as `/baselines/:id/provenance`: a service principal
   * holding the external-access token, no permission object. The reasoning
   * is unchanged and is written out on `authorizeService` — a service
   * principal has no catalog identity, so asking the permission policy about
   * it would compare against an empty role set and deny.
   *
   * 201, not 200. Provenance is write-once and answers 200 because a re-post
   * may be a no-op; a test execution is always a new row, so the status code
   * should say a resource was created.
   */
  /**
   * POST /versions/:id/test-evidence/import (NXD-123)
   * Read the newest completed CI run's test evidence from the product's
   * repository and record it as test executions of this version's
   * requirements. A person with product.manage presses the button; the
   * evidence comes from CI, not from them.
   */
  router.post(
    '/versions/:id/test-evidence/import',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, productManagePermission);
        res.status(201).json(await service.importTestEvidence(req.params.id, actor));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /versions/:id/pull-request-evidence (NXD-152)
   * What each open pull request's CI run would verify of this version's
   * requirements, and whether the gate's coverage part would then pass.
   * Read-only; nothing is recorded.
   */
  router.get(
    '/versions/:id/pull-request-evidence',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.previewPullRequestEvidence(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /versions/:id/ai-builds (NXD-153)
   * Assign bound requirements of a DRAFT version to the AI build in the
   * product's repository: recorded, then dispatched. Body: optional
   * `requirementRefs` (default all bound) and `note`. product.manage.
   */
  router.post(
    '/versions/:id/ai-builds',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, productManagePermission);
        res
          .status(201)
          .json(await service.issueAiBuildAssignment(req.params.id, req.body ?? {}, actor));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /** GET /versions/:id/ai-builds (NXD-153): the version's assignments, newest first. */
  router.get(
    '/versions/:id/ai-builds',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json({ items: await service.listAiBuildAssignments(req.params.id) });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /ai-builds/:id/refresh (NXD-153)
   * Record what GitHub shows of the assignment: run, pull request, merge.
   * product.manage, because it writes the outcome and its audit events.
   */
  router.post(
    '/ai-builds/:id/refresh',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, productManagePermission);
        res.json(await service.refreshAiBuildAssignment(req.params.id, actor));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /versions/:id/release-provenance/import (NXD-133)
   * Read the release record the product's release workflow published for
   * this version and write its commit and image digest to the approved
   * baseline. A person with product.manage presses the button; the values
   * come from GitHub, not from them, which is why this is not the
   * service-only `/baselines/:id/provenance`.
   */
  router.post(
    '/versions/:id/release-provenance/import',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, productManagePermission);
        res.json(
          await service.importReleaseProvenance(req.params.id, actor, await registrarFor(req)),
        );
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.post(
    '/test-executions',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorizeService(httpAuth, req);
        const result = await service.ingestTestExecution(
          (req.body ?? {}) as Record<string, unknown>,
          actor,
        );
        res.status(201).json(result);
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

  // ── Evidence package ───────────────────────────────────────────────────────
  /**
   * GET /versions/:versionId/evidence-package
   *
   * Everything the platform can attest about one version, in one document:
   * requirements, coverage across both axes, functional specifications and
   * their trace, components, contracts, traceability, baselines with CI
   * provenance, the release gate with its blockers, and the merged audit
   * trail — plus an explicit statement of what it does not prove.
   *
   * Read permission, not manage: assembling an attestation changes nothing.
   * Every part was already readable through some fifteen separate endpoints;
   * what was missing is that they arrive together.
   */
  router.get(
    '/versions/:versionId/evidence-package',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.buildEvidencePackage(req.params.versionId));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ── Multi-hop Lineage DAG (W3-1) ───────────────────────────────────────────
  /** GET /versions/:id/lineage/dag?depth=N — full multi-hop lineage graph */
  router.get('/versions/:id/lineage/dag', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, productReadPermission);
      const depth = Math.min(parseInt(String(req.query.depth ?? '5'), 10) || 5, 10);
      res.json(await service.getFullLineageDAG(req.params.id, depth));
    } catch (err) { respondError(res, logger, err); }
  });

  // ── Revalidation Scope (W2-3) ──────────────────────────────────────────────
  /** GET /versions/:id/revalidation-scope — what needs retesting after baseline change? */
  router.get('/versions/:id/revalidation-scope', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, productReadPermission);
      const scope = await service.getRevalidationScope(req.params.id);
      if (!scope) {
        res.status(404).json({ error: 'No approved baseline found for this version' });
        return;
      }
      res.json(scope);
    } catch (err) { respondError(res, logger, err); }
  });

  // ── Change Impact Analysis (P-EXT-S3) ─────────────────────────────────────

  /** GET /contracts/:id/impact — which product versions depend on this contract? */
  router.get(
    '/contracts/:id/impact',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        res.json(await service.getContractChangeImpact(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /** GET /impact/artifact?name=<name> — which versions are affected by this artifact changing? */
  router.get(
    '/impact/artifact',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const name = String(req.query.name ?? '').trim();
        if (!name) {
          res.status(400).json({ error: 'name query parameter is required' });
          return;
        }
        res.json(await service.getArtifactChangeImpact(name));
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
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/ai/spec-drafts/:id',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, productReadPermission);
        const draft = await service.getSpecDraft(req.params.id);
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

  // ── Governed AI Data Analyst (Phase 6, P6-S2) ──────────────────────────────
  // POST /ai/analyze-product
  // Answers a governance-bounded question about a data product using only
  // the product descriptor passed by the caller. Requires DEVELOPER or above.
  router.post(
    '/ai/analyze-product',
    async (req: express.Request, res: express.Response) => {
      try {
        const credentials = await httpAuth.credentials(req, { allow: ['user'] });
        const actor = (credentials as { principal?: { userEntityRef?: string } }).principal
          ?.userEntityRef ?? 'unknown';
        const { question, productContext } = req.body as {
          question?: string;
          productContext?: Record<string, unknown>;
        };
        if (!question?.trim()) {
          res.status(400).json({ error: 'question is required' });
          return;
        }
        if (!productContext || typeof productContext !== 'object') {
          res.status(400).json({ error: 'productContext is required' });
          return;
        }
        const answer = await service.analyzeProduct(question, productContext, actor);
        res.json({ answer });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  return router;
}
