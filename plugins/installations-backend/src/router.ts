/**
 * Installations HTTP surface (NXD-129 slice 1, NXD-139).
 *
 * Every person's route names the permission that guards it, and admits a
 * person only. The two provider routes under `/provider/targets/:targetId`
 * (NXD-129 slice 2, NXD-143) are the reverse: they admit a service principal
 * only, and only the one whose `externalAccess` subject is the target's
 * `providerSubject`. A service principal carries no catalog identity, so
 * the permission framework has nothing to decide for it; the binding on the
 * target is the authorization. Both halves are pinned by test.
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
  BackstageCredentials,
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import {
  AuthorizeResult,
  BasicPermission,
} from '@backstage/plugin-permission-common';
import {
  isArtifactSegment,
  installationManagePermission,
  installationReadPermission,
  installationTargetManagePermission,
  type RuntimeTarget,
} from '@internal/platform-common';
import type {
  ArtifactVersionReader,
  GmpClassifier,
  PinVerifier,
} from './clients';
import type { ActContext, InstallationsService } from './service';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: InstallationsService;
  readArtifactVersion: ArtifactVersionReader;
  classify: GmpClassifier;
  pinVerifier?: PinVerifier;
}

function respondError(res: express.Response, logger: LoggerService, error: unknown) {
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
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: String(error) });
    return;
  }
  if (error instanceof ConflictError) {
    res.status(409).json({ error: String(error) });
    return;
  }
  if (error instanceof ServiceUnavailableError) {
    logger.error(`Dependency unavailable: ${error.message}`);
    res.status(503).json({ error: String(error) });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, httpAuth, permissions, service } = options;
  const router = Router();

  async function authorize(
    req: express.Request,
    permission: BasicPermission,
  ): Promise<{ actor: string; credentials: BackstageCredentials }> {
    if (!permissions) {
      throw new NotAllowedError('Permission service is not configured');
    }
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const [decision] = await permissions.authorize([{ permission }], { credentials });
    if (decision.result !== AuthorizeResult.ALLOW) {
      throw new NotAllowedError();
    }
    return {
      actor: credentials.principal?.userEntityRef || 'unknown',
      credentials,
    };
  }

  /** Reads, classification and PIN check bound to the caller (NXD-128). */
  async function actContext(req: express.Request): Promise<ActContext> {
    const { actor, credentials } = await authorize(req, installationManagePermission);
    return {
      actor,
      readVersion: coordinate => options.readArtifactVersion(credentials, coordinate),
      classify: artifact => options.classify(credentials, artifact),
      verifyPin: pin => {
        if (!options.pinVerifier) {
          throw new NotAllowedError('Signing is not configured on this instance.');
        }
        return options.pinVerifier(credentials, pin);
      },
    };
  }

  /**
   * The provider of `targetId`, or a refusal. An unknown target and a target
   * bound to someone else are refused alike, so a token holder learns
   * nothing about targets that are not theirs.
   */
  async function authorizeProvider(
    req: express.Request,
    targetId: string,
  ): Promise<{ subject: string; credentials: BackstageCredentials; target: RuntimeTarget }> {
    const credentials = await httpAuth.credentials(req, { allow: ['service'] });
    const subject = credentials.principal.subject;
    const target = await service.findTarget(targetId);
    if (!target || !target.providerSubject || target.providerSubject !== subject) {
      throw new NotAllowedError(
        `"${subject}" is not the provider of runtime target ${targetId}`,
      );
    }
    return { subject, credentials, target };
  }

  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'installations', timestamp: new Date().toISOString() });
  });

  // ==========================================================================
  // RUNTIME TARGETS
  // ==========================================================================

  router.get('/targets', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      res.json({ items: await service.listTargets() });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.post('/targets', async (req, res) => {
    try {
      const { actor } = await authorize(req, installationTargetManagePermission);
      res.status(201).json(await service.registerTarget(req.body ?? {}, actor));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get('/targets/:id', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      res.json(await service.getTarget(req.params.id));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ==========================================================================
  // CLASSIFICATION
  // ==========================================================================

  /**
   * GET /artifacts/:namespace/:name/gmp-classification (NXD-141)
   *
   * What an act on this artifact will ask for, so the Install dialog shows a
   * signature or a confirmation before anyone types. The same classifier the
   * act uses, on the caller's behalf; the act classifies again and decides.
   */
  router.get('/artifacts/:namespace/:name/gmp-classification', async (req, res) => {
    try {
      const { credentials } = await authorize(req, installationReadPermission);
      const { namespace, name } = req.params;
      if (!isArtifactSegment(namespace) || !isArtifactSegment(name)) {
        throw new InputError(`Invalid artifact coordinate "${namespace}/${name}"`);
      }
      res.json(await options.classify(credentials, { namespace, name }));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ==========================================================================
  // INSTALLATIONS
  // ==========================================================================

  router.get('/installations', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      const targetId = typeof req.query.targetId === 'string' ? req.query.targetId : undefined;
      res.json({ items: await service.listInstallations({ targetId }) });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /** POST /installations — install: a new desired state, PRESENT. */
  router.post('/installations', async (req, res) => {
    try {
      const ctx = await actContext(req);
      res.status(201).json(await service.install(req.body ?? {}, ctx));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get('/installations/:id', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      res.json(await service.getInstallation(req.params.id));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /** POST /installations/:id/upgrade — another released version, or config. */
  router.post('/installations/:id/upgrade', async (req, res) => {
    try {
      const ctx = await actContext(req);
      res.json(await service.upgrade(req.params.id, req.body ?? {}, ctx));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /** POST /installations/:id/remove — desired state ABSENT; the record stays. */
  router.post('/installations/:id/remove', async (req, res) => {
    try {
      const ctx = await actContext(req);
      res.json(await service.remove(req.params.id, req.body ?? {}, ctx));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get('/installations/:id/acts', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      res.json({ items: await service.listActs(req.params.id) });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get('/installations/:id/audit', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      res.json({ items: await service.listAuditEvents(req.params.id) });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  router.get('/installations/:id/qualifications', async (req, res) => {
    try {
      await authorize(req, installationReadPermission);
      res.json({ items: await service.listQualifications(req.params.id) });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ==========================================================================
  // PROVIDER API (NXD-143) — service principal, bound to the target
  // ==========================================================================

  /** GET /provider/targets/:targetId/desired — what the provider is to make true. */
  router.get('/provider/targets/:targetId/desired', async (req, res) => {
    try {
      const { credentials, target } = await authorizeProvider(req, req.params.targetId);
      res.json(
        await service.desiredStateFor(target, coordinate =>
          options.readArtifactVersion(credentials, coordinate),
        ),
      );
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /** POST /provider/targets/:targetId/installations/:id/observed — what it found. */
  router.post('/provider/targets/:targetId/installations/:id/observed', async (req, res) => {
    try {
      const { subject, target } = await authorizeProvider(req, req.params.targetId);
      res.json(await service.reportObserved(target, req.params.id, req.body, subject));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  return router;
}
