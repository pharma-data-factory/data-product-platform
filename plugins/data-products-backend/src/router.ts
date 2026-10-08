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
import { mountConsumeRoutes } from './consume/router';
import { GithubActionsClient, publicCiStatus, unknownCiStatus } from './types';
import { resolveCiStatus } from './resolveCiStatus';
import { parseGithubUrl } from './resolveRepository';
import { parseEvidence, readZip, TEST_EVIDENCE_ARTIFACT } from './testEvidence';
import {
  findReleaseForVersion,
  MAX_RECORD_BYTES,
  MAX_MANIFEST_BYTES,
  parseReleaseRecord,
  RELEASE_MANIFEST_PATH,
  RELEASE_RECORD_ASSET,
} from './releaseRecord';

export interface RouterOptions {
  logger: LoggerService;
  catalog: CatalogService;
  httpAuth: HttpAuthService;
  github: GithubActionsClient;
  permissions?: PermissionsService;
  certificationOverlay?: FileCertificationOverlay;
  releaseOverlay?: FileReleaseOverlay;
  /** Optional map of product name / template → upstream base URL */
  consumeBaseUrls?: Record<string, string>;
  /** Origins a consume-base-url annotation may name (NXD-091). */
  consumeAllowedOrigins?: readonly string[];
}

/** NXD-137. The manifest text, or why there is none to hand on. */
function releaseManifest(
  read: Awaited<ReturnType<NonNullable<GithubActionsClient['getFileAtRef']>>> | undefined,
): { manifest: string } | { manifestReason: string } {
  if (!read) {
    return { manifestReason: 'unavailable' };
  }
  if (!read.ok) {
    return { manifestReason: read.reason };
  }
  if (read.value === undefined) {
    return { manifestReason: 'no-manifest' };
  }
  if (Buffer.byteLength(read.value) > MAX_MANIFEST_BYTES) {
    return { manifestReason: 'manifest-too-large' };
  }
  return { manifest: read.value };
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const {
    logger,
    catalog,
    httpAuth,
    github,
    permissions,
    certificationOverlay,
    releaseOverlay,
    consumeBaseUrls = {},
    consumeAllowedOrigins = [],
  } = options;
  const router = Router();
  router.use(express.json());

  mountConsumeRoutes(router, {
    logger,
    catalog,
    httpAuth,
    permissions,
    baseUrls: consumeBaseUrls,
    allowedOrigins: consumeAllowedOrigins,
  });

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  /**
   * The Product Composer reads CI facts as a service; a person needs
   * data-product.view (NXD-123, NXD-133).
   */
  async function authorizeViewOrService(req: express.Request): Promise<void> {
    const credentials = await httpAuth.credentials(req, {
      allow: ['user', 'service'],
    });
    if (credentials.principal.type !== 'user') {
      return;
    }
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
  }

  /**
   * GET /ci-evidence?repoUrl=… (NXD-123)
   *
   * The test evidence of a product repository's newest completed CI run: the
   * `nexora-test-evidence` artifact a Golden Path's CI uploads (NXD-122),
   * parsed. Read by the Product Composer as a service, to record
   * per-requirement test executions; and by a person with data-product.view.
   * GitHub access stays here, where the Actions client already lives.
   */
  router.get('/ci-evidence', async (req, res) => {
    try {
      await authorizeViewOrService(req);
      const repo = parseGithubUrl(String(req.query.repoUrl ?? '').trim());
      if (!repo) {
        throw new InputError('repoUrl must be a GitHub repository URL');
      }
      if (!github.getLatestCompletedRun || !github.downloadArtifact) {
        res.json({ available: false, reason: 'unavailable' });
        return;
      }
      // NXD-151. Evidence is the default branch's, from a push: what was
      // merged. Before, the newest completed run of any branch was taken, so
      // a pull request's tests could be recorded as the version's evidence.
      // `branch` names another branch explicitly; its push runs only.
      const requested = typeof req.query.branch === 'string' ? req.query.branch.trim() : '';
      let branch = requested;
      if (!branch) {
        if (!github.getDefaultBranch) {
          res.json({ available: false, reason: 'unavailable' });
          return;
        }
        const found = await github.getDefaultBranch(repo);
        if (!found.ok) {
          res.json({ available: false, reason: found.reason });
          return;
        }
        branch = found.value;
      }
      const run = await github.getLatestCompletedRun(repo, { branch, event: 'push' });
      if (!run.ok) {
        res.json({ available: false, reason: run.reason });
        return;
      }
      if (!run.value) {
        res.json({ available: false, reason: 'no-completed-run' });
        return;
      }
      const runInfo = {
        id: run.value.id,
        url: run.value.htmlUrl,
        commit: run.value.headSha,
        branch: run.value.headBranch,
        event: run.value.event,
        conclusion: run.value.conclusion,
        completedAt: run.value.completedAt,
      };
      const zip = await github.downloadArtifact(
        repo,
        run.value.id,
        TEST_EVIDENCE_ARTIFACT,
      );
      if (!zip.ok) {
        res.json({ available: false, reason: zip.reason, run: runInfo });
        return;
      }
      if (!zip.value) {
        res.json({ available: false, reason: 'no-evidence-artifact', run: runInfo });
        return;
      }
      const { results, ignored } = parseEvidence(readZip(zip.value));
      res.json({ available: true, run: runInfo, results, ignored });
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: error.message || 'Not allowed' });
        return;
      }
      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      logger.warn(
        `ci-evidence failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(502).json({
        error: `The test evidence could not be read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  });

  /**
   * GET /ci-evidence/pull-requests?repoUrl=… (NXD-152)
   *
   * For each open pull request (at most ten, most recently updated first):
   * the newest completed `pull_request` run of `ci.yml` for its head branch,
   * and that run's test evidence, parsed. Read-only, for a preview of what
   * the pull request would verify: nothing here is ever recorded as a
   * version's evidence (NXD-151 keeps that to the default branch). A run
   * that tested an older head than the pull request now has is marked
   * `stale`.
   */
  router.get('/ci-evidence/pull-requests', async (req, res) => {
    try {
      await authorizeViewOrService(req);
      const repo = parseGithubUrl(String(req.query.repoUrl ?? '').trim());
      if (!repo) {
        throw new InputError('repoUrl must be a GitHub repository URL');
      }
      if (!github.listOpenPullRequests || !github.getLatestCompletedRun || !github.downloadArtifact) {
        res.json({ available: false, reason: 'unavailable', pullRequests: [] });
        return;
      }
      const prs = await github.listOpenPullRequests(repo, 10);
      if (!prs.ok) {
        res.json({ available: false, reason: prs.reason, pullRequests: [] });
        return;
      }
      const pullRequests = [];
      for (const pr of prs.value) {
        const base = {
          number: pr.number,
          title: pr.title,
          url: pr.htmlUrl,
          headRef: pr.headRef,
          headSha: pr.headSha,
          draft: pr.draft,
          ...(pr.author ? { author: pr.author } : {}),
        };
        const run = await github.getLatestCompletedRun(repo, {
          branch: pr.headRef,
          event: 'pull_request',
        });
        if (!run.ok || !run.value) {
          pullRequests.push({
            ...base,
            available: false,
            reason: run.ok ? 'no-completed-run' : run.reason,
          });
          continue;
        }
        const runInfo = {
          id: run.value.id,
          url: run.value.htmlUrl,
          commit: run.value.headSha,
          branch: run.value.headBranch,
          event: run.value.event,
          conclusion: run.value.conclusion,
          completedAt: run.value.completedAt,
        };
        const stale = Boolean(pr.headSha) && run.value.headSha !== pr.headSha;
        const zip = await github.downloadArtifact(repo, run.value.id, TEST_EVIDENCE_ARTIFACT);
        if (!zip.ok || !zip.value) {
          pullRequests.push({
            ...base,
            available: false,
            reason: zip.ok ? 'no-evidence-artifact' : zip.reason,
            run: runInfo,
            stale,
          });
          continue;
        }
        const { results } = parseEvidence(readZip(zip.value));
        pullRequests.push({ ...base, available: true, run: runInfo, stale, results });
      }
      res.json({ available: true, pullRequests });
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: error.message || 'Not allowed' });
        return;
      }
      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      logger.warn(
        `ci-evidence/pull-requests failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(502).json({
        error: `The pull request evidence could not be read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  });

  /**
   * GET /release-record?repoUrl=…&version=… (NXD-133)
   *
   * The release record a product repository's release workflow published for
   * a version (NXD-132): the GitHub Release tagged `v` + that version (`1.0`
   * and `1.0.0` alike), its `nexora-release.json`, and the commit the tag
   * actually points at, so the Composer can refuse a record whose commit is
   * not the tagged one. Read by the Composer as a service, and by a person
   * with data-product.view, like /ci-evidence.
   */
  router.get('/release-record', async (req, res) => {
    try {
      await authorizeViewOrService(req);
      const repo = parseGithubUrl(String(req.query.repoUrl ?? '').trim());
      if (!repo) {
        throw new InputError('repoUrl must be a GitHub repository URL');
      }
      const version = String(req.query.version ?? '').trim();
      if (!version) {
        throw new InputError('version is required');
      }
      if (
        !github.listReleases ||
        !github.downloadReleaseAsset ||
        !github.getCommitSha
      ) {
        res.json({ available: false, reason: 'unavailable' });
        return;
      }
      const releases = await github.listReleases(repo);
      if (!releases.ok) {
        res.json({ available: false, reason: releases.reason });
        return;
      }
      const lookup = findReleaseForVersion(releases.value, version);
      if (!lookup.found) {
        res.json({ available: false, reason: lookup.reason, tags: lookup.tags });
        return;
      }
      const { release } = lookup;
      const releaseInfo = {
        tag: release.tag,
        url: release.url,
        publishedAt: release.publishedAt,
      };
      const asset = release.assets.find(a => a.name === RELEASE_RECORD_ASSET);
      if (!asset) {
        res.json({
          available: false,
          reason: 'no-release-record',
          release: releaseInfo,
        });
        return;
      }
      if (asset.size > MAX_RECORD_BYTES) {
        res.json({
          available: false,
          reason: 'invalid-release-record',
          release: releaseInfo,
        });
        return;
      }
      const [bytes, tagCommit] = await Promise.all([
        github.downloadReleaseAsset(repo, asset.id),
        github.getCommitSha(repo, release.tag),
      ]);
      if (!bytes.ok) {
        res.json({ available: false, reason: bytes.reason, release: releaseInfo });
        return;
      }
      if (!tagCommit.ok) {
        res.json({
          available: false,
          reason: tagCommit.reason,
          release: releaseInfo,
        });
        return;
      }
      const parsed = parseReleaseRecord(bytes.value);
      if (!parsed.ok) {
        res.json({
          available: false,
          reason: 'invalid-release-record',
          problem: parsed.problem,
          release: releaseInfo,
        });
        return;
      }
      // NXD-137. The manifest the release was built from, read at the commit
      // the tag points at — not at the default branch, which may have moved.
      // Its absence does not hide the record: the provenance is still true.
      const manifest = github.getFileAtRef
        ? await github.getFileAtRef(repo, RELEASE_MANIFEST_PATH, tagCommit.value)
        : undefined;
      res.json({
        available: true,
        release: { ...releaseInfo, commit: tagCommit.value },
        record: parsed.record,
        ...releaseManifest(manifest),
      });
    } catch (error) {
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: error.message || 'Not allowed' });
        return;
      }
      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      logger.warn(
        `release-record failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(502).json({
        error: `The release record could not be read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
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
