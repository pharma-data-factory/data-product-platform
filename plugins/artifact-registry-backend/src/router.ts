/**
 * Artifact Registry backend router.
 *
 * HTTP endpoints for publishers, Artifacts, their versions, and the five
 * lifecycle acts (submit / review / certify / publish / deprecate). Every
 * route names the permission that guards it at the point of use, so the
 * registry has no endpoint whose authorization has to be looked up elsewhere.
 */

import express from 'express';
import Router from 'express-promise-router';
import {
  AuthenticationError,
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
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
  artifactCertifyPermission,
  artifactCreatePermission,
  artifactDeprecatePermission,
  artifactPublishPermission,
  artifactReadPermission,
  artifactReviewPermission,
  artifactSubmitPermission,
  isArtifactKind,
  publisherManagePermission,
  type Artifact,
} from '@internal/platform-common';
import { ArtifactRegistryService, CreatePublisherRequest } from './service';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: ArtifactRegistryService;
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
  // The service throws NotFoundError for an unclaimed namespace and for an
  // unknown version id. Both are the caller naming something that does not
  // exist, so they must not surface as a 500.
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: String(error) });
    return;
  }
  // A transition asked for out of order, or a coordinate already registered:
  // the caller's request conflicts with the stored state, not a server fault.
  if (error instanceof ConflictError) {
    res.status(409).json({ error: String(error) });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, service } = options;
  const router = Router();
  router.use(express.json());

  /**
   * Loads the Artifact a coordinate names, or ends the response with 404.
   *
   * Returns undefined once it has responded, so callers stop rather than
   * carry on with a missing Artifact.
   */
  async function findArtifactOr404(
    req: express.Request,
    res: express.Response,
  ): Promise<Artifact | undefined> {
    const artifact = await service.getArtifactByCoordinate(
      req.params.namespace,
      req.params.name,
    );
    if (!artifact) {
      res.status(404).json({
        error: `Artifact ${req.params.namespace}/${req.params.name} not found`,
      });
      return undefined;
    }
    return artifact;
  }

  router.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'artifact-registry',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // PUBLISHERS
  // ==========================================================================

  router.post(
    '/publishers',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          publisherManagePermission,
        );
        const publisher = await service.createPublisher(
          req.body as CreatePublisherRequest,
          actor,
        );
        res.status(201).json(publisher);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /publishers/self-register
   * Publisher Self-Registration for DEVELOPER+ (P-EXT-S2).
   *
   * Any Developer can claim an unclaimed namespace as a COMMUNITY publisher.
   * The publisher starts with trustLevel='COMMUNITY' and externalPublisher=true.
   * PLATFORM_ADMIN promotes to PARTNER after review.
   * This enables the ecosystem flywheel: teams can publish without admin bottleneck.
   */
  router.post(
    '/publishers/self-register',
    async (req: express.Request, res: express.Response) => {
      try {
        // Requires artifact.create (DEVELOPER+) — lower bar than publisherManage
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          artifactCreatePermission,
        );
        const body = req.body as CreatePublisherRequest;
        // Self-registered publishers always start as COMMUNITY external publishers.
        // PLATFORM_ADMIN can later promote to PARTNER via the standard publisher update.
        const publisher = await service.createPublisher(
          {
            ...body,
            trustLevel: 'COMMUNITY',
            externalPublisher: true,
            // Self-registrant is automatically a member of their own publisher.
            memberGroups: [...(body.memberGroups ?? []), actor].filter(Boolean),
          },
          actor,
        );
        res.status(201).json({
          ...publisher,
          _notice:
            'Publisher registered as COMMUNITY. Artifacts can be submitted but not published ' +
            'until a PLATFORM_ADMIN promotes this publisher to PARTNER status.',
        });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/publishers',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, artifactReadPermission);
        res.json(await service.listPublishers());
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ==========================================================================
  // ARTIFACTS
  // ==========================================================================

  router.post(
    '/artifacts',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          artifactCreatePermission,
        );
        const result = await service.registerArtifactVersion(req.body, actor);
        res.status(201).json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/artifacts',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, artifactReadPermission);
        const kind = req.query.kind as string | undefined;
        // An unknown kind would otherwise filter to nothing and read as "no
        // such artifacts" rather than "no such kind".
        if (kind !== undefined && !isArtifactKind(kind)) {
          throw new InputError(`Unknown artifact kind "${kind}"`);
        }
        const filter = {
          kind,
          namespace: req.query.namespace as string | undefined,
        };
        // Opt-in rather than always embedded: a caller that only needs the
        // artifact list should not pay for every version's manifest.
        res.json(
          req.query.includeVersions === 'true'
            ? await service.listArtifactsWithVersions(filter)
            : await service.listArtifacts(filter),
        );
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/artifacts/:namespace/:name',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, artifactReadPermission);
        const artifact = await findArtifactOr404(req, res);
        if (artifact) {
          res.json(artifact);
        }
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/artifacts/:namespace/:name/versions',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, artifactReadPermission);
        const artifact = await findArtifactOr404(req, res);
        if (artifact) {
          res.json(await service.listArtifactVersions(artifact.id));
        }
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/artifacts/:namespace/:name/versions/:version',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, artifactReadPermission);
        const { namespace, name, version } = req.params;
        const resolved = await service.resolve({ namespace, name, version });
        if (!resolved) {
          res
            .status(404)
            .json({ error: `${namespace}/${name}@${version} not found` });
          return;
        }
        res.json(resolved);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ==========================================================================
  // VERSION LIFECYCLE
  // ==========================================================================

  /**
   * Registers one transition route.
   *
   * The five acts differ only in their permission and the service method they
   * call; writing each handler out by hand would invite the copy where the
   * permission and the act stop matching.
   */
  function transitionRoute(
    path: string,
    permission: BasicPermission,
    act: (id: string) => Promise<unknown>,
  ) {
    router.post(path, async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, permission);
        res.json(await act(req.params.id));
      } catch (err) {
        respondError(res, logger, err);
      }
    });
  }

  transitionRoute(
    '/artifact-versions/:id/submit',
    artifactSubmitPermission,
    id => service.submitArtifactVersion(id),
  );
  transitionRoute(
    '/artifact-versions/:id/review',
    artifactReviewPermission,
    id => service.reviewArtifactVersion(id),
  );
  // Phase 7 (P7-S2): certify and publish pass the actor so the service can
  // enforce per-namespace membership when publisher.memberGroups is set.
  router.post(
    '/artifact-versions/:id/certify',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, artifactCertifyPermission);
        res.json(await service.certifyArtifactVersion(req.params.id, actor));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );
  router.post(
    '/artifact-versions/:id/publish',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, artifactPublishPermission);
        res.json(await service.publishArtifactVersion(req.params.id, actor));
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );
  transitionRoute(
    '/artifact-versions/:id/deprecate',
    artifactDeprecatePermission,
    id => service.deprecateArtifactVersion(id),
  );

  // ── Policy Pack Resolver (W3-6) ────────────────────────────────────────────
  // POST /policies/resolve
  // Body: { policies: ["namespace/name@version", ...] }
  // Resolves POLICY_PACK artifacts and returns their obligations.
  router.post(
    '/policies/resolve',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, artifactReadPermission);
        const { policies } = req.body as { policies?: string[] };
        if (!Array.isArray(policies)) {
          res.status(400).json({ error: 'policies must be an array of strings' });
          return;
        }
        const { resolvePolicies } = await import('./policyResolver');
        const result = await resolvePolicies(policies, service);
        res.json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  return router;
}
