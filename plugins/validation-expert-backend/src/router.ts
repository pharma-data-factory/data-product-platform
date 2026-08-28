import express from 'express';
import Router from 'express-promise-router';
import { InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
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
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
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
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
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
      res.json({ items: service.listRuns() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/runs/:runId', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const run = service.getRun(req.params.runId);
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
      const candidate = String(req.body?.candidate ?? '').trim();
      if (!['IQ', 'OQ', 'UAT'].includes(type)) {
        throw new InputError('type must be IQ, OQ, or UAT');
      }
      if (!candidate) {
        throw new InputError('candidate is required');
      }
      const run = service.createRun({ candidate, type, createdBy: executor });
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
      const execution = service.recordManualResult({
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
      res.json({ items: service.getFindings() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/evidence', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      res.json({ items: service.getEvidence() });
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
      res.json({ items: service.listContexts() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /** GET /contexts/:id — fetch a single validation context. */
  router.get('/contexts/:id', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationReadPermission);
      const context = service.getContext(req.params.id);
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
      );
      res.status(created ? 201 : 200).json({ context, created });
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
  if (error instanceof InputError) {
    res.status(400).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : 'unknown error';
  logger.warn(`validation-expert request failed: ${message}`);
  res.status(400).json({ error: message });
}
