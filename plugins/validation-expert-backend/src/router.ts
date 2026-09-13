import express from 'express';
import Router from 'express-promise-router';
import {
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
} from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import {
  requirementReadPermission,
  traceabilityReadPermission,
  validationReadPermission,
  validationReviewPermission,
  validationRunStartPermission,
  validationTestExecutePermission,
} from '@internal/platform-common';
import type { ValidationExpertService } from './service';
import type { ExecutorIdentity, ProtocolType } from './types';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  userInfo?: UserInfoService;
  permissions?: PermissionsService;
  service: ValidationExpertService;
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
  // allowLimitedAccess: cookies + on-behalf-of plugin tokens
  const credentials = await httpAuth.credentials(req, {
    allow: ['user'],
    allowLimitedAccess: true,
  });
  const [decision] = await permissions.authorize([{ permission }], { credentials });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
  return credentials;
}

async function resolveExecutor(
  httpAuth: HttpAuthService,
  userInfo: UserInfoService | undefined,
  req: express.Request,
): Promise<ExecutorIdentity> {
  const credentials = await httpAuth.credentials(req, {
    allow: ['user'],
    allowLimitedAccess: true,
  });
  const userEntityRef = (credentials as { principal?: { userEntityRef?: string } })
    .principal?.userEntityRef;
  if (!userEntityRef) {
    throw new NotAllowedError('Authenticated user required');
  }
  let displayName: string | undefined;
  if (userInfo) {
    try {
      const info = await userInfo.getUserInfo(credentials);
      displayName = info?.userEntityRef;
    } catch {
      // optional
    }
  }
  return {
    userEntityRef,
    displayName,
    identityProvider: userEntityRef.includes('guest') ? 'guest' : 'github',
  };
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, httpAuth, userInfo, permissions, service } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', plugin: 'validation-expert', version: '0.1' });
  });

  router.get('/overview', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json(service.getOverview());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/requirements', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, requirementReadPermission);
      const includeRejected = String(req.query.includeRejected ?? 'true') === 'true';
      const items = service.getRequirements().filter(item => includeRejected || !item.rejected);
      res.json({ items });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/requirements/:id', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, requirementReadPermission);
      const item = service.getRequirement(req.params.id);
      if (!item) {
        throw new NotFoundError(`Requirement ${req.params.id} not found`);
      }
      const trace = service.getTraceability().find(row => row.ursId === item.id);
      res.json({ item, trace });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/traceability', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, traceabilityReadPermission);
      res.json({ items: service.getTraceability() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/risks', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json({
        items: service.getRisks(),
        riskAcceptanceAvailable: false,
        note: 'Risk acceptance is not available in Validation Expert v0.1',
      });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/protocols/:type', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const type = req.params.type.toUpperCase() as ProtocolType;
      if (!['IQ', 'OQ', 'UAT'].includes(type)) {
        throw new InputError('type must be IQ, OQ, or UAT');
      }
      const tests = service.getProtocol(type);
      res.json({
        type,
        total: tests.length,
        ready: tests.filter(test => test.status === 'NOT_EXECUTED').length,
        manual: tests.filter(test => test.executionType === 'MANUAL').length,
        external: tests.filter(test => test.executionType === 'EXTERNAL').length,
        automated: tests.filter(test =>
          test.executionType.startsWith('AUTOMATED'),
        ).length,
        tests,
      });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/runs', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const contextId = String(req.query.contextId ?? '').trim();
      if (contextId) {
        res.json({ items: await service.listRunsForContext(contextId) });
        return;
      }
      res.json({ items: await service.listRuns() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/runs/:runId', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const run = await service.getRun(req.params.runId);
      if (!run) {
        throw new NotFoundError(`Run ${req.params.runId} not found`);
      }
      res.json(run);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/runs', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationRunStartPermission);
      const executor = await resolveExecutor(httpAuth, userInfo, req);
      const type = String(req.body?.type ?? '').toUpperCase() as ProtocolType;
      const contextId = String(req.body?.contextId ?? '').trim() || undefined;
      const candidate =
        typeof req.body?.candidate === 'string'
          ? req.body.candidate.trim()
          : undefined;
      if (!['IQ', 'OQ', 'UAT'].includes(type)) {
        throw new InputError('type must be IQ, OQ, or UAT');
      }
      if (!contextId) {
        throw new ConflictError(
          'contextId is required: runs are created from a validation context with an assigned product/version',
        );
      }
      const run = await service.createRun({
        candidate,
        type,
        createdBy: executor,
        contextId,
      });
      res.status(201).json({ runId: run.id, status: run.status, run });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/runs/:runId/execute-automated', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationRunStartPermission);
      const executor = await resolveExecutor(httpAuth, userInfo, req);
      const run = await service.executeAutomated(req.params.runId, executor);
      res.json(run);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/runs/:runId/tests/:testId/start', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationTestExecutePermission);
      const executor = await resolveExecutor(httpAuth, userInfo, req);
      const execution = await service.startTest(
        req.params.runId,
        req.params.testId,
        executor,
      );
      res.json(execution);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/runs/:runId/tests/:testId/result', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationTestExecutePermission);
      const executor = await resolveExecutor(httpAuth, userInfo, req);
      const status = String(req.body?.status ?? '').toUpperCase();
      if (!['PASS', 'FAIL', 'BLOCKED'].includes(status)) {
        throw new InputError('status must be PASS, FAIL, or BLOCKED');
      }
      const actualResult = String(req.body?.actualResult ?? '').trim();
      if (!actualResult) {
        throw new InputError('actualResult is required');
      }
      const execution = await service.recordManualResult({
        runId: req.params.runId,
        testId: req.params.testId,
        status: status as 'PASS' | 'FAIL' | 'BLOCKED',
        actualResult,
        comment: req.body?.comment ? String(req.body.comment) : undefined,
        evidenceReference: req.body?.evidenceReference
          ? String(req.body.evidenceReference)
          : undefined,
        executor,
      });
      res.json(execution);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/findings', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json({ items: await service.getFindings() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/evidence', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const evidenceType = String(req.query.evidenceType ?? '').trim();
      const items = await service.getEvidence();
      res.json({
        items: evidenceType
          ? items.filter(item => item.evidenceType === evidenceType)
          : items,
      });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * POST /evidence/technical
   * Register technical CI Quality Gate metadata (no IQ/OQ run required).
   * Not GxP / Part 11 validation evidence.
   */
  router.post('/evidence/technical', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor =
        (credentials as { principal?: { userEntityRef?: string } }).principal
          ?.userEntityRef ??
        String(req.body?.createdBy ?? '').trim() ??
        'unknown';
      const evidenceType = String(req.body?.evidenceType ?? '').trim();
      const reference = String(req.body?.reference ?? '').trim();
      const idempotencyKey = String(req.body?.idempotencyKey ?? '').trim();
      const candidate =
        typeof req.body?.candidate === 'string'
          ? req.body.candidate.trim()
          : undefined;
      if (!evidenceType || !reference || !idempotencyKey) {
        res.status(400).json({
          error: 'evidenceType, reference, and idempotencyKey are required',
        });
        return;
      }
      const result = await service.registerTechnicalEvidence({
        evidenceType,
        reference,
        createdBy: String(req.body?.createdBy ?? actor).trim() || actor,
        candidate: candidate || undefined,
        idempotencyKey,
      });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  // ============================================================================
  // URS → Validation integration contexts
  // ============================================================================

  /** GET /contexts — list validation contexts (each anchored to an approved URS baseline). */
  router.get('/contexts', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json({ items: await service.listContexts() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /** GET /contexts/:id — fetch a single validation context. */
  router.get('/contexts/:id', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const context = await service.getContext(req.params.id);
      if (!context) {
        res.status(404).json({ error: 'Validation context not found' });
        return;
      }
      res.json(context);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * GET /contexts/:id/requirements
   * Read-through of pinned URS baseline requirement content for this context.
   * Does not mutate URS; Markdown workbench path remains unchanged.
   */
  router.get('/contexts/:id/requirements', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReadPermission,
      );
      const payload = await service.getContextRequirements(
        req.params.id,
        credentials,
      );
      res.json(payload);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * GET /contexts/:id/runs
   * List validation runs anchored to this Validation Context.
   */
  router.get('/contexts/:id/runs', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json({ items: await service.listRunsForContext(req.params.id) });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * GET /contexts/:id/coverage
   * Traceability-lite: covered / uncovered context requirement IDs from linked
   * run executions (protocol join) and findings. Not a GxP claim.
   */
  router.get('/contexts/:id/coverage', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json(await service.getContextCoverage(req.params.id));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * POST /contexts/from-urs
   * Create (or return existing) a validation context from an APPROVED URS
   * baseline. Body: { requirementSetId, baselineId }.
   * Entry gate is enforced in the service/resolver: only APPROVED baselines
   * resolve; DRAFT / SUBMITTED(IN_REVIEW) / REJECTED are denied.
   */
  router.post('/contexts/from-urs', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      const requirementSetId = String(req.body?.requirementSetId ?? '').trim();
      const baselineId = String(req.body?.baselineId ?? '').trim();
      if (!requirementSetId || !baselineId) {
        res
          .status(400)
          .json({ error: 'requirementSetId and baselineId are required' });
        return;
      }
      const { context, created } = await service.createContextFromApprovedUrs(
        { requirementSetId, baselineId },
        actor || 'unknown',
        credentials,
      );
      res.status(created ? 201 : 200).json({ context, created });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * POST /contexts/:id/assign-product
   * Assign a Product Composer solution (product + version + baseline) to a
   * validation context. Validated server-side against the Product Composer
   * contract; WAITING_FOR_SOLUTION → READY_FOR_VALIDATION. Switching the
   * version/baseline after ACTIVE supersedes the context and creates a new
   * requalification context.
   */
  router.post('/contexts/:id/assign-product', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      const productId = String(req.body?.productId ?? '').trim();
      const productVersionId = String(req.body?.productVersionId ?? '').trim();
      const productBaselineId = String(req.body?.productBaselineId ?? '').trim();
      const ursBaselineId = String(req.body?.ursBaselineId ?? '').trim();
      const manifestHash = String(req.body?.manifestHash ?? '').trim();
      if (
        !productId ||
        !productVersionId ||
        !productBaselineId ||
        !ursBaselineId ||
        !manifestHash
      ) {
        res.status(400).json({
          error:
            'ursBaselineId, productId, productVersionId, productBaselineId, and manifestHash are required',
        });
        return;
      }
      const result = await service.assignProduct(
        req.params.id,
        {
          ursBaselineId,
          productId,
          productVersionId,
          productBaselineId,
          manifestHash,
          gitRepositoryUrl: String(req.body?.gitRepositoryUrl ?? '').trim() || undefined,
          commitSha: String(req.body?.commitSha ?? '').trim() || undefined,
          releaseCandidateCommitSha:
            String(req.body?.releaseCandidateCommitSha ?? '').trim() || undefined,
          changeAssessment: req.body?.changeAssessment,
        },
        actor || 'unknown',
        credentials,
      );
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /** POST /contexts/:id/remove-product — drop the product assignment (back to WAITING_FOR_SOLUTION). */
  router.post('/contexts/:id/remove-product', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      res.json(
        await service.removeProduct(req.params.id, actor || 'unknown'),
      );
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * POST /contexts/:id/submit-review — ACTIVE → UNDER_REVIEW.
   * Server-side traceability gate: full requirement coverage, at least one
   * COMPLETED run, no FAIL/BLOCKED executions, no open findings.
   */
  router.post('/contexts/:id/submit-review', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      res.json(
        await service.submitReview(req.params.id, actor || 'unknown'),
      );
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /** POST /contexts/:id/approve — UNDER_REVIEW → APPROVED (human release). */
  router.post('/contexts/:id/approve', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      res.json(await service.approveContext(req.params.id, actor || 'unknown'));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /** POST /contexts/:id/reject — UNDER_REVIEW → REJECTED (back to rework). */
  router.post('/contexts/:id/reject', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReviewPermission,
      );
      const actor = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      res.json(await service.rejectContext(req.params.id, actor || 'unknown'));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /** GET /contexts/:id/audit — server-side audit events for the context. */
  router.get('/contexts/:id/audit', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json({ items: await service.listContextAudit(req.params.id) });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  return router;
}

function respondError(
  res: express.Response,
  logger: LoggerService,
  error: unknown,
) {
  if (error instanceof NotAllowedError) {
    res.status(403).json({ error: 'Not allowed' });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof ConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof InputError) {
    res.status(400).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : 'unknown error';
  logger.warn(`validation-expert request failed: ${message}`);
  res.status(400).json({ error: message });
}
