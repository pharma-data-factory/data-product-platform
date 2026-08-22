import express from 'express';
import Router from 'express-promise-router';
import { InputError, NotAllowedError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  dataProductCertificationManagePermission,
  dataProductCreatePermission,
  dataProductViewPermission,
  goldenPathReleaseManagePermission,
  isGoldenPathLifecycle,
  LIFECYCLE_TRANSITIONS,
  loadGoldenPathReleases,
  releaseCatalogRows,
} from '@internal/platform-common';

import { CERTIFICATION_STATUSES, CertificationStatus } from './certification';
import { FileCertificationOverlay } from './certificationOverlay';
import { FileReleaseOverlay } from './releaseCatalog';
import { GithubActionsClient, publicCiStatus, unknownCiStatus } from './types';
import { resolveCiStatus } from './resolveCiStatus';

export interface RouterOptions {
  logger: LoggerService;
  catalog: CatalogService;
  httpAuth: HttpAuthService;
  github: GithubActionsClient;
  permissions?: PermissionsService;
  certificationOverlay?: FileCertificationOverlay;
  releaseOverlay?: FileReleaseOverlay;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, catalog, httpAuth, github, permissions, certificationOverlay, releaseOverlay } =
    options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ci-status', async (req, res) => {
    const entityRef = String(req.query.entityRef ?? '').trim();
    if (!entityRef) {
      res.json(publicCiStatus(unknownCiStatus('Not available')));
      return;
    }

    try {
      const credentials = await httpAuth.credentials(req);
      if (!permissions) {
        throw new NotAllowedError('Permission service is not configured');
      }
      const [decision] = await permissions.authorize(
        [{ permission: dataProductViewPermission }],
        { credentials },
      );
      if (decision.result !== AuthorizeResult.ALLOW) {
        throw new NotAllowedError();
      }
      const status = await resolveCiStatus({
        entityRef,
        catalog,
        credentials,
        github,
        logger,
      });
      res.json(publicCiStatus(status));
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: 'Not allowed' });
        return;
      }
      logger.warn(
        `CI status request failed for ${entityRef}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      res.json(publicCiStatus(unknownCiStatus('Not available')));
    }
  });

  router.post('/certification', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      if (!permissions) {
        throw new NotAllowedError('Permission service is not configured');
      }
      const [decision] = await permissions.authorize(
        [{ permission: dataProductCertificationManagePermission }],
        { credentials },
      );
      if (decision.result !== AuthorizeResult.ALLOW) {
        throw new NotAllowedError();
      }

      const entityRef = String(req.body?.entityRef ?? '').trim();
      const status = String(req.body?.status ?? '').trim();
      if (!entityRef) {
        throw new InputError('entityRef is required');
      }
      if (!CERTIFICATION_STATUSES.includes(status as CertificationStatus)) {
        throw new InputError(
          `status must be one of ${CERTIFICATION_STATUSES.join(', ')}`,
        );
      }
      if (!certificationOverlay) {
        throw new InputError('Certification overlay is not configured');
      }

      const entity = await catalog.getEntityByRef(entityRef, { credentials });
      if (!entity) {
        throw new InputError('entity not found');
      }
      const entityType = (entity.spec as { type?: string } | undefined)?.type;
      if (entity.kind !== 'Component' || entityType !== 'data-product') {
        throw new InputError(
          'certification applies to Data Product components only',
        );
      }

      const persisted = certificationOverlay.setStatus(
        entityRef,
        status as CertificationStatus,
      );
      try {
        await catalog.refreshEntity(entityRef, { credentials });
      } catch (refreshError) {
        logger.warn(
          `Certification overlay saved for ${entityRef}, catalog refresh deferred: ${
            refreshError instanceof Error
              ? refreshError.message
              : 'unknown error'
          }`,
        );
      }

      logger.info(
        `Technical certification ${persisted.status} persisted for ${entityRef}`,
      );

      res.json({
        ok: true,
        entityRef,
        status: persisted.status,
        persisted: true,
        source: 'catalog-annotation-overlay',
        disclaimer:
          'Technical platform certification only. This is not GxP or regulatory validation.',
      });
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: 'Not allowed' });
        return;
      }
      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.get('/releases', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      if (!permissions) {
        throw new NotAllowedError('Permission service is not configured');
      }
      const [decision] = await permissions.authorize(
        [{ permission: dataProductViewPermission }],
        { credentials },
      );
      if (decision.result !== AuthorizeResult.ALLOW) {
        throw new NotAllowedError();
      }
      const releases = releaseOverlay?.mergedReleases() ?? loadGoldenPathReleases();
      res.json({
        releases,
        rows: releaseCatalogRows(releases),
        disclaimer:
          'Technical platform release status only. This is not GxP or regulatory validation. Distribution is not entitlement.',
      });
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: 'Not allowed' });
        return;
      }
      throw error;
    }
  });

  router.post('/releases/transition', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      if (!permissions) {
        throw new NotAllowedError('Permission service is not configured');
      }

      const template = String(req.body?.template ?? '').trim();
      const version = String(req.body?.version ?? '').trim();
      const targetStatus = String(req.body?.targetStatus ?? '').trim();
      if (!template || !version) {
        throw new InputError('template and version are required');
      }
      if (!isGoldenPathLifecycle(targetStatus)) {
        throw new InputError('targetStatus is not a valid lifecycle state');
      }

      let permission = goldenPathReleaseManagePermission;
      if (targetStatus === 'TESTING') {
        permission = dataProductCreatePermission;
      } else if (targetStatus === 'CERTIFIED') {
        permission = dataProductCertificationManagePermission;
      }
      const [decision] = await permissions.authorize([{ permission }], {
        credentials,
      });
      if (decision.result !== AuthorizeResult.ALLOW) {
        throw new NotAllowedError();
      }

      if (!releaseOverlay) {
        throw new InputError('Release overlay is not configured');
      }
      const current = releaseOverlay
        .mergedReleases()
        .find(release => release.template === template && release.version === version);
      if (!current) {
        throw new InputError('release not found');
      }
      if (!LIFECYCLE_TRANSITIONS[current.status].includes(targetStatus)) {
        throw new InputError(
          `Cannot transition ${current.status} to ${targetStatus}`,
        );
      }

      const persisted = releaseOverlay.setStatus(template, version, targetStatus);
      logger.info(
        `Golden Path ${template}@${version} lifecycle ${current.status} → ${persisted.status}`,
      );
      res.json({
        ok: true,
        template,
        version,
        status: persisted.status,
        persisted: true,
        source: 'version-controlled-release-overlay',
        disclaimer:
          'Technical platform release status only. This is not GxP or regulatory validation.',
      });
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: 'Not allowed' });
        return;
      }
      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}
