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
import type { InstallationIdentity } from './installation';
import { ArtifactRegistryService, CreatePublisherRequest } from './service';
// Static, not `await import('./policyResolver')`. The dynamic form destructured
// to `undefined` in the running backend — the plugin transpiles to CJS, where
// `await import()` of a CJS module yields `{ default: exports }` — so
// POST /policies/resolve answered 500 with "resolvePolicies is not a function"
// and, because the Composer's policy client fails open (NXD-045), the release
// gate silently resolved no obligations at all. Jest's interop hid it.
// Found by executing the path (closure Slice 3).
import { resolvePolicies } from './policyResolver';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: ArtifactRegistryService;
  /** Backstage config for federation (optional — federation disabled when absent). */
  config?: { getOptionalConfig?(key: string): unknown };
  /** Who this installation is. Absent in tests that do not exercise it. */
  installation?: InstallationIdentity;
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
 * Read authorization for a route that is called by something other than a
 * person: another backend plugin in this process, or another Nexora
 * installation over the network.
 *
 * `authorize` above admits only `user` credentials, which is right for the
 * routes a person drives. Two kinds of caller are not a person.
 *
 * **A sibling plugin.** `/policies/resolve`'s only caller is the Composer's
 * release gate, which authenticates with a plugin token. A plugin token is a
 * *service* principal, so the user-only check refused it and the Composer's
 * client — which fails open by design (NXD-045) — turned the refusal into "no
 * obligations". The effect was that 5-R1's Policy Pack enforcement never once
 * ran in the application: every gate check resolved nothing and reported
 * nothing, which reads exactly like a pass. Slice 2 found and fixed one cause
 * of that (`declaredPolicies` was never mapped on create); this was the
 * second, and it sat behind the first. Found by executing the path (closure
 * Slice 3).
 *
 * **A consuming installation.** The six read routes below are how a downstream
 * installation sees what an upstream one publishes. It presents a static
 * `backend.auth.externalAccess` token, which is also a service principal. See
 * NXD-087 and `TARGET_OPERATING_MODEL.md` §6.5.
 *
 * The refusal was a **403, not a 401** — Backstage answers a disallowed
 * *kind* of credential with `NotAllowedError` ("This endpoint does not allow
 * 'service' credentials"), and reserves 401 for a caller presenting none.
 * Both are refusals and both were fatal to the caller, so the distinction
 * never mattered until someone went looking by status code. It is stated here
 * because an earlier version of this comment said 401, and so did the T3 row
 * of `PHASE_CLOSURE_PLAN.md`; both were written from reading the code rather
 * than from calling the route.
 *
 * A service principal carries no catalog identity, so there is no
 * `PlatformRole` to resolve and the permission framework is not consulted for
 * it — possession of the token is the authorization, which is what Backstage
 * intends for backend-to-backend calls. What a service may therefore do is
 * decided entirely by which routes admit one: reads and the two write-once CI
 * routes in the Composer, never a registry write.
 */
async function authorizeReadOrService(
  permissions: PermissionsService | undefined,
  httpAuth: HttpAuthService,
  req: express.Request,
  permission: BasicPermission,
): Promise<string> {
  const credentials = await httpAuth.credentials(req, {
    allow: ['user', 'service'],
  });
  if (credentials.principal.type === 'service') {
    return credentials.principal.subject;
  }
  if (!permissions) {
    throw new NotAllowedError('Permission service is not configured');
  }
  const [decision] = await permissions.authorize([{ permission }], {
    credentials,
  });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
  return credentials.principal.userEntityRef || 'unknown';
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
  // The Nexora release gate could not be asked (NXD-146): not the caller's
  // fault, and not a pass either.
  if (error instanceof ServiceUnavailableError) {
    logger.error(`Dependency unavailable: ${error.message}`);
    res.status(503).json({ error: String(error) });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, service, config, installation } =
    options;
  const router = Router();

  /**
   * GET /installation — who this installation is and what it runs.
   *
   * The answer that did not exist. A federating peer needs it to attribute
   * content to an origin, and an operator needs it to tell a publishing
   * installation from a consuming one at a glance. Read permission: stating
   * your own name is not a privileged act.
   *
   * The peer that needs it is a service principal, and until NXD-087 this
   * route refused one — so the route written for a federating peer was the
   * one a federating peer could not call.
   *
   * Returns the resolved edition, so `capabilities` is the flattened set
   * including everything inherited through `extends` — not the edition's own
   * list, which is what `editionHasCapability` used to answer and why three of
   * the four shipped editions under-reported themselves.
   */
  router.get('/installation', async (req, res) => {
    try {
      await authorizeReadOrService(
        permissions,
        httpAuth,
        req,
        artifactReadPermission,
      );
      res.json(
        installation ?? {
          id: 'unknown',
          displayName: 'unknown',
          availableEditions: [],
        },
      );
    } catch (err) {
      respondError(res, logger, err);
    }
  });
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

  /**
   * PATCH /publishers/:id/promote — promote a publisher's trust level.
   * Only PLATFORM_ADMIN (publisherManagePermission) may do this.
   * Body: { trustLevel: 'PARTNER' | 'INTERNAL' | 'COMMUNITY', memberGroups?: string[] }
   * 7-R3: Publisher PARTNER promotion workflow.
   */
  router.patch(
    '/publishers/:id/promote',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, publisherManagePermission);
        const { trustLevel, memberGroups } = req.body as {
          trustLevel?: string;
          memberGroups?: string[];
        };
        if (!trustLevel) {
          res.status(400).json({ error: 'trustLevel is required' });
          return;
        }
        const updated = await service.promotePublisher(
          req.params.id,
          trustLevel as any,
          memberGroups,
        );
        res.json(updated);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/publishers',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorizeReadOrService(
          permissions,
          httpAuth,
          req,
          artifactReadPermission,
        );
        res.json(await service.listPublishers());
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ==========================================================================
  // ARTIFACTS
  // ==========================================================================

  /**
   * POST /artifacts/release-builds (NXD-137)
   * Registers a runnable product's release build as a DRAFT version: the
   * nexora.yaml text from the tagged commit and the image, digest, commit and
   * release. Called by the Product Composer on behalf of the person who
   * imported the release, so their artifact.create and the publisher's
   * namespace apply.
   */
  router.post(
    '/artifacts/release-builds',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          artifactCreatePermission,
        );
        const result = await service.registerReleaseBuild(
          (req.body ?? {}) as { manifest?: unknown; release?: never },
          actor,
        );
        res.status(result.alreadyRegistered ? 200 : 201).json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

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
        await authorizeReadOrService(
          permissions,
          httpAuth,
          req,
          artifactReadPermission,
        );
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
        const local = req.query.includeVersions === 'true'
          ? await service.listArtifactsWithVersions(filter)
          : await service.listArtifacts(filter);

        // Federation: merge remote artifacts when requested (7-R2 / A-3).
        if (req.query.includeFederated === 'true') {
          try {
            const { createFederationClient, loadFederationConfig } = await import('./federatedRegistry');
            const fedConfig = loadFederationConfig(config as any);
            if (fedConfig.enabled) {
              const fedClient = createFederationClient({ config: fedConfig, logger });
              const fedResult = await fedClient.searchFederated({ kind: filter.kind, namespace: filter.namespace });
              // Build a merged list: local coordinates take precedence
              const localCoords = new Set((local as Array<{ namespace: string; name: string }>)
                .map(a => `${a.namespace}/${a.name}`));
              const remoteOnly = fedResult.remote.filter(
                r => !localCoords.has(`${r.namespace}/${r.name}`),
              );
              const merged = [
                ...local,
                ...remoteOnly.map(r => ({
                  namespace: r.namespace,
                  name: r.name,
                  publisherTrustLevel: r.trustLevel,
                  externalPublisher: true,
                  versions: [{ version: r.version, lifecycle: r.lifecycle, certificationStatus: r.certificationStatus }],
                })),
              ];
              res.json(merged);
              return;
            }
          } catch { /* federation unavailable — fall through to local only */ }
        }

        res.json(local);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  router.get(
    '/artifacts/:namespace/:name',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorizeReadOrService(
          permissions,
          httpAuth,
          req,
          artifactReadPermission,
        );
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
        await authorizeReadOrService(
          permissions,
          httpAuth,
          req,
          artifactReadPermission,
        );
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
        await authorizeReadOrService(
          permissions,
          httpAuth,
          req,
          artifactReadPermission,
        );
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
  /**
   * Every lifecycle transition, with the actor.
   *
   * `authorize` has always returned the actor; this helper used to discard it,
   * so `submit`, `review` and `deprecate` reached the service with no idea who
   * had called them — and therefore resolved no namespace. P7-S2 passed the
   * actor for `certify` and `publish` only, which left a namespace restriction
   * that held for the last two acts of the lifecycle and not the first three.
   * A mutating registry operation that does not know who invoked it is a hole
   * in the audit trail. NXD-075.
   */
  function transitionRoute(
    path: string,
    permission: BasicPermission,
    act: (id: string, actor: string) => Promise<unknown>,
  ) {
    router.post(path, async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(permissions, httpAuth, req, permission);
        res.json(await act(req.params.id, actor));
      } catch (err) {
        respondError(res, logger, err);
      }
    });
  }

  /**
   * GET /artifact-versions/:id/transitions (NXD-146) — who moved the version
   * through its lifecycle, and when. Read permission, or a service.
   */
  router.get(
    '/artifact-versions/:id/transitions',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorizeReadOrService(permissions, httpAuth, req, artifactReadPermission);
        res.json({ items: await service.listTransitions(req.params.id) });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  transitionRoute(
    '/artifact-versions/:id/submit',
    artifactSubmitPermission,
    (id, actor) => service.submitArtifactVersion(id, actor),
  );
  transitionRoute(
    '/artifact-versions/:id/review',
    artifactReviewPermission,
    (id, actor) => service.reviewArtifactVersion(id, actor),
  );
  transitionRoute(
    '/artifact-versions/:id/certify',
    artifactCertifyPermission,
    (id, actor) => service.certifyArtifactVersion(id, actor),
  );
  transitionRoute(
    '/artifact-versions/:id/publish',
    artifactPublishPermission,
    (id, actor) => service.publishArtifactVersion(id, actor),
  );
  transitionRoute(
    '/artifact-versions/:id/deprecate',
    artifactDeprecatePermission,
    (id, actor) => service.deprecateArtifactVersion(id, actor),
  );

  // ── Policy Pack Resolver (W3-6) ────────────────────────────────────────────
  // POST /policies/resolve
  // Body: { policies: ["namespace/name@version", ...] }
  // Resolves POLICY_PACK artifacts and returns their obligations.
  router.post(
    '/policies/resolve',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorizeReadOrService(
          permissions,
          httpAuth,
          req,
          artifactReadPermission,
        );
        const { policies } = req.body as { policies?: string[] };
        if (!Array.isArray(policies)) {
          res.status(400).json({ error: 'policies must be an array of strings' });
          return;
        }
        const result = await resolvePolicies(policies, service);
        res.json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  return router;
}
