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
  validationApprovePermission,
  validationReadPermission,
  validationReviewPermission,
  validationRunStartPermission,
  validationTestExecutePermission,
} from '@internal/platform-common';
import {
  QUALITY_ASSURANCE_GROUP,
  VALIDATION_EXPERT_GROUP,
  type ValidationSignatureRole,
} from '@internal/platform-common';
import type { PinVerifier } from './decision-collaborators';
import type { ValidationExpertService } from './service';
import type { ExecutorIdentity, ProtocolType } from './types';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  userInfo?: UserInfoService;
  permissions?: PermissionsService;
  service: ValidationExpertService;
  /** NXD-119. Verifies a signer's PIN in the URS Composer. */
  pinVerifier?: PinVerifier;
}

/**
 * NXD-119. The signature roles a person holds, from their group membership:
 * `validation-experts` signs as VALIDATION_EXPERT, `urs-quality-reviewers`
 * as QUALITY_ASSURANCE.
 */
function signatureRoles(ownershipEntityRefs: readonly string[]): ValidationSignatureRole[] {
  const groups = new Set(
    ownershipEntityRefs.map(ref => ref.split('/').pop()?.toLowerCase()),
  );
  const roles: ValidationSignatureRole[] = [];
  if (groups.has(VALIDATION_EXPERT_GROUP)) roles.push('VALIDATION_EXPERT');
  if (groups.has(QUALITY_ASSURANCE_GROUP)) roles.push('QUALITY_ASSURANCE');
  return roles;
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

/**
 * Read authorization that also admits a sibling backend plugin.
 *
 * The Product Composer's release gate asks whether a URS baseline has an
 * APPROVED ValidationDecision. It asks as the platform, not as the person who
 * opened the page, and it must get the same answer either way — otherwise a
 * user without validation read access sees a spurious
 * `NO_APPROVED_VALIDATION_DECISION` blocker on a properly validated product.
 *
 * Read-only, and only on the routes the Composer calls (decision, contexts,
 * coverage). Recording a
 * decision stays `POST /contexts/:id/decision`, which still requires a human
 * PLATFORM_ADMIN and still enforces Segregation of Duties — nothing here lets
 * a machine approve anything. See `NXD-054`.
 */
async function authorizeReadOrService(
  permissions: PermissionsService | undefined,
  httpAuth: HttpAuthService,
  req: express.Request,
  permission: BasicPermission,
) {
  const credentials = await httpAuth.credentials(req, {
    allow: ['user', 'service'],
    allowLimitedAccess: true,
  });
  if (credentials.principal.type === 'service') {
    return credentials;
  }
  if (!permissions) {
    throw new NotAllowedError('Permission service is not configured');
  }
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
      if (!['IQ', 'OQ', 'UAT', 'PQ'].includes(type)) {
        throw new InputError('type must be IQ, OQ, UAT, or PQ');
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
      const candidate = String(req.body?.candidate ?? '').trim();
      const contextId = String(req.body?.contextId ?? '').trim() || undefined;
      if (!['IQ', 'OQ', 'UAT', 'PQ'].includes(type)) {
        throw new InputError('type must be IQ, OQ, UAT, or PQ');
      }
      if (!candidate) {
        throw new InputError('candidate is required');
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

  /**
   * POST /contexts/:id/evidence-review (NXD-124)
   * Review a product version's recorded CI test evidence against the
   * context's requirements, as a completed EVIDENCE run.
   * Body: { productVersionId }.
   */
  router.post('/contexts/:id/evidence-review', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, validationRunStartPermission);
      const executor = await resolveExecutor(httpAuth, userInfo, req);
      const productVersionId = String(req.body?.productVersionId ?? '').trim();
      if (!productVersionId) {
        throw new InputError('productVersionId is required');
      }
      const run = await service.runProductEvidenceReview(
        req.params.id,
        productVersionId,
        executor,
      );
      res.status(201).json(run);
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
      res.json({ items: await service.getEvidence() });
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
      // Service-callable: the Composer's release gate scans these.
      await authorizeReadOrService(permissions, httpAuth, req, validationReadPermission);
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
      // Service-callable, like the decision (NXD-054): the Composer reads
      // coverage as the platform. It was user-only, so every product page
      // read "Validated: Unknown" beside an approved decision (NXD-124).
      await authorizeReadOrService(permissions, httpAuth, req, validationReadPermission);
      res.json(await service.getContextCoverage(req.params.id));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  // ── Validation Decision (Phase 5, P5-S1) ─────────────────────────────────

  /**
   * POST /contexts/:id/decision — gone since NXD-119.
   *
   * A decision is now the outcome of electronic signatures, so a route that
   * wrote one directly would bypass the two-signature rule. Answered rather
   * than removed, so a caller learns where it went.
   */
  router.post('/contexts/:id/decision', async (_req, res) => {
    res.status(410).json({
      error:
        'A validation decision is recorded by signatures: POST /contexts/:id/signatures (NXD-119).',
    });
  });

  /**
   * GET /contexts/:id/decision-state (NXD-119)
   * GMP classification, signatures so far, which role may sign next, and the
   * caller's own signature roles (`myRoles`).
   */
  router.get('/contexts/:id/decision-state', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationReadPermission,
      );
      // The caller's own signature roles, so the page offers signing only to
      // whoever may sign (cf. NXD-104). Display only: signing re-checks.
      let myRoles: ValidationSignatureRole[] = [];
      if (userInfo) {
        try {
          myRoles = signatureRoles(
            (await userInfo.getUserInfo(credentials)).ownershipEntityRefs ?? [],
          );
        } catch {
          // Unknown roles offer nothing; the state itself is still answered.
        }
      }
      res.json({ ...(await service.getDecisionState(req.params.id)), myRoles });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * POST /contexts/:id/signatures (NXD-119)
   * Sign the validation decision as VALIDATION_EXPERT or QUALITY_ASSURANCE.
   *
   * Body: { role, verdict: 'APPROVED' | 'REJECTED', justification, pin }.
   * Requires `validation.approve` (the two groups). The role is checked
   * against the signer's own groups; the PIN against their own credential in
   * the URS Composer. Answers the new decision state.
   */
  router.post('/contexts/:id/signatures', async (req, res) => {
    try {
      const credentials = await authorize(
        permissions,
        httpAuth,
        req,
        validationApprovePermission,
      );
      const ref = (credentials as { principal?: { userEntityRef?: string } })
        .principal?.userEntityRef;
      if (!ref) {
        throw new NotAllowedError('Authenticated user required');
      }
      if (!userInfo || !options.pinVerifier) {
        throw new NotAllowedError('Signing is not configured on this instance.');
      }
      const info = await userInfo.getUserInfo(credentials);
      const verifier = options.pinVerifier;
      res.status(201).json(
        await service.signValidationDecision(req.params.id, req.body ?? {}, {
          ref,
          roles: signatureRoles(info.ownershipEntityRefs ?? []),
          verifyPin: pin => verifier(credentials, pin),
        }),
      );
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  /**
   * GET /contexts/:id/decision
   * Read the ValidationDecision for a context (if any).
   * Returns 404 when no decision has been recorded yet.
   */
  router.get('/contexts/:id/decision', async (req, res) => {
    try {
      // Service-callable: the Composer's release gate reads the verdict.
      await authorizeReadOrService(permissions, httpAuth, req, validationReadPermission);
      const decision = await service.getValidationDecision(req.params.id);
      if (!decision) {
        res.status(404).json({ error: `No decision recorded for context ${req.params.id}` });
        return;
      }
      res.json(decision);
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

  return router;
}

function respondError(
  res: express.Response,
  logger: LoggerService,
  error: unknown,
) {
  if (error instanceof NotAllowedError) {
    // The reason, when there is one: a signer refused for a wrong PIN, a
    // lockout or Segregation of Duties must be told which (NXD-119, as
    // NXD-104 for the URS chain).
    res.status(403).json({ error: error.message || 'Not allowed' });
    return;
  }
  if (error instanceof ConflictError) {
    res.status(409).json({ error: error.message });
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
