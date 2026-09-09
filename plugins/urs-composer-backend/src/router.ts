/**
 * URS Composer Backend Router
 *
 * HTTP endpoints for:
 * - Business Capabilities
 * - Requirement Sets (CRUD + workflow)
 * - Requirements
 * - Quality checks
 * - Audit trail
 *
 * All operations use Backstage Permission Framework for authorization.
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
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import {
  ursReadPermission,
  ursCreatePermission,
  ursManagePermission,
  ursApprovePermission,
  ursSignPermission,
  ursChangeRequestManagePermission,
  businessCapabilityManagePermission,
} from '@internal/platform-common';
import { URSService } from './service';
import {
  CreateRequirementSetRequest,
  CreateRequirementRequest,
  UpdateRequirementSetRequest,
  QualityCheckRequest,
  CreateRevisionRequest,
  CreateBaselineRequest,
  ApproveApprovalStepRequest,
  RejectApprovalStepRequest,
  SignatureMeaning,
} from './types';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: URSService;
}

/**
 * Standard authorization check
 * (Replicates pattern from model-company-backend, validation-manager-backend)
 */
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
  const [decision] = await permissions.authorize([{ permission }], { credentials });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
  // Return authenticated user ref for audit
  return credentials.principal?.userEntityRef || 'unknown';
}

/**
 * Standard error response handler
 */
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
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  // Raised by the status transition engine and by the single-open-version
  // rule: the request was well formed but conflicts with the current state.
  if (error instanceof ConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

/**
 * Validate that required body fields are present and non-empty.
 * Returns true if valid, false if a 400 response was sent.
 */
function requireBody(
  res: express.Response,
  body: object,
  ...fields: string[]
): boolean {
  for (const f of fields) {
    const val = (body as Record<string, unknown>)[f];
    if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
      res.status(400).json({ error: `${f} is required` });
      return false;
    }
  }
  return true;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, service } = options;
  const router = Router();
  router.use(express.json());

  // ============================================================================
  // BUSINESS CAPABILITIES
  // ============================================================================

  /**
   * GET /capabilities
   * List all business capabilities
   */
  router.get('/capabilities', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await service.listCapabilities(limit, offset);
      res.json(result);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /capabilities/:id
   * Get capability by ID
   */
  router.get('/capabilities/:id', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const capability = await service.getCapability(req.params.id);
      if (!capability) {
        res.status(404).json({ error: 'Capability not found' });
        return;
      }
      res.json(capability);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /capabilities
   * Create a new business capability (Business Capability Lead).
   */
  router.post('/capabilities', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        businessCapabilityManagePermission,
      );
      const capability = await service.createBusinessCapability(req.body, actor);
      res.status(201).json(capability);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * PUT /capabilities/:id
   * Update a business capability.
   */
  router.put('/capabilities/:id', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        businessCapabilityManagePermission,
      );
      const capability = await service.updateBusinessCapability(
        req.params.id,
        req.body,
        actor,
      );
      res.json(capability);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * DELETE /capabilities/:id
   * Retire (soft-delete) a business capability. Never hard-deleted.
   */
  router.delete('/capabilities/:id', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        businessCapabilityManagePermission,
      );
      const capability = await service.retireBusinessCapability(req.params.id, actor);
      res.json(capability);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /capabilities/:id/audit
   * Append-only audit trail for a business capability.
   */
  router.get('/capabilities/:id/audit', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const auditTrail = await service.getCapabilityAuditTrail(req.params.id);
      res.json(auditTrail);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ============================================================================
  // BUSINESS ROLES
  // ============================================================================

  /**
   * GET /business-roles
   * List all active business roles.
   */
  router.get('/business-roles', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await service.listBusinessRolesPaginated(limit, offset);
      res.json(result);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /business-roles
   * Create a business role (Business Capability Lead).
   */
  router.post('/business-roles', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        businessCapabilityManagePermission,
      );
      const role = await service.createBusinessRole(req.body, actor);
      res.status(201).json(role);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * PUT /business-roles/:id
   * Update a business role.
   */
  router.put('/business-roles/:id', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        businessCapabilityManagePermission,
      );
      const role = await service.updateBusinessRole(req.params.id, req.body, actor);
      res.json(role);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * DELETE /business-roles/:id
   * Retire (soft-delete) a business role.
   */
  router.delete('/business-roles/:id', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        businessCapabilityManagePermission,
      );
      const role = await service.retireBusinessRole(req.params.id, actor);
      res.json(role);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ============================================================================
  // REQUIREMENT SETS (URS)
  // ============================================================================

  /**
   * POST /requirement-sets
   * Create new requirement set
   */
  router.post('/requirement-sets', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursCreatePermission,
      );
      const data = req.body as CreateRequirementSetRequest;
      const requirementSet = await service.createRequirementSet(data, actor);
      res.status(201).json(requirementSet);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /requirement-sets
   * List requirement sets with pagination
   */
  router.get('/requirement-sets', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await service.listRequirementSets(limit, offset);
      res.json(result);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /requirement-sets/:id
   * Get requirement set detail
   */
  router.get('/requirement-sets/:id', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const requirementSet = await service.getRequirementSet(req.params.id);
      if (!requirementSet) {
        res.status(404).json({ error: 'Requirement set not found' });
        return;
      }
      res.json(requirementSet);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /requirement-sets/:id/audit
   * Append-only audit trail for a requirement set.
   */
  router.get('/requirement-sets/:id/audit', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const auditTrail = await service.getAuditTrail(req.params.id);
      res.json(auditTrail);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * PUT /requirement-sets/:id
   * Update requirement set (draft only)
   */
  router.put('/requirement-sets/:id', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursManagePermission,
      );
      const data = req.body as UpdateRequirementSetRequest & {
        requirements?: Partial<CreateRequirementRequest & { id?: string; requirementId?: string; acceptanceIntent?: string }>[];
      };
      const result = await service.updateRequirementSetDraft(
        req.params.id,
        data,
        data.requirements || [],
        actor,
      );
      res.json(result);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /requirement-sets/:id/revise
   * Open a controlled revision of an approved/baselined requirement set.
   * Creates a new DRAFT version; the source record stays immutable.
   */
  router.post('/requirement-sets/:id/revise', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursManagePermission,
      );
      const body = (req.body || {}) as { reason?: string };
      const reason =
        typeof body.reason === 'string' && body.reason.trim()
          ? body.reason.trim()
          : undefined;
      const revision = await service.reviseRequirementSet(
        req.params.id,
        actor,
        reason,
      );
      res.status(201).json(revision);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ============================================================================
  // REQUIREMENTS
  // ============================================================================

  /**
   * POST /requirement-sets/:setId/requirements
   * Create requirement
   */
  router.post(
    '/requirement-sets/:setId/requirements',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursCreatePermission,
        );
        const data = req.body as CreateRequirementRequest;
        const requirement = await service.createRequirement(
          req.params.setId,
          data,
          actor,
        );
        res.status(201).json(requirement);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /requirement-sets/:setId/requirements
   * List requirements for a requirement set
   */
  router.get(
    '/requirement-sets/:setId/requirements',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, ursReadPermission);
        const requirements = await service.getRequirements(req.params.setId);
        res.json(requirements);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // QUALITY CHECKS
  // ============================================================================

  /**
   * POST /validate
   * Check single requirement quality
   */
  router.post('/validate', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const data = req.body as QualityCheckRequest;
      const issues = await service.checkRequirementQuality(data);
      res.json({ issues });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /requirement-sets/:id/validate
   * Check all requirements in a set against the existing URS quality checks
   */
  router.post(
    '/requirement-sets/:id/validate',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, ursReadPermission);
        const requirements = await service.getRequirements(req.params.id);
        const issues: Array<{
          requirementId?: string;
          issue: string;
          severity: string;
          recommendation?: string;
        }> = [];
        for (const r of requirements) {
          const result = await service.checkRequirementQuality({
            requirementId: r.requirementId,
            title: r.title,
            statement: r.statement,
            gxpRelevance: r.gxpRelevance,
          });
          issues.push(...result);
        }
        res.json({ issues });
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // P1A/P1B REQUIREMENT VERSIONS (Controlled Revisions)
  // ============================================================================

  /**
   * POST /requirements/:id/revisions
   * Create a controlled revision from an existing approved requirement version
   */
  router.post(
    '/requirements/:id/revisions',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursCreatePermission,
        );
        const data = req.body as CreateRevisionRequest;
        if (!requireBody(res, data, 'revisionReason')) {
          return;
        }
        const revision = await service.createRevision(
          req.params.id,
          data.revisionReason,
          actor,
          data.changeRequestId,
        );
        res.status(201).json(revision);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /requirements/:id/versions
   * Get complete version history for a requirement
   */
  router.get(
    '/requirements/:id/versions',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, ursReadPermission);
        const history = await service.getVersionHistory(req.params.id);
        if (!history) {
          res.status(404).json({ error: 'Requirement not found' });
          return;
        }
        res.json(history);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /requirements/:id/versions/:version
   * One exact controlled version of a requirement, by version label
   * (e.g. "1.0"). Does not auto-resolve to the latest.
   */
  router.get(
    '/requirements/:id/versions/:version',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, ursReadPermission);
        const version = await service.getVersionOfRequirement(
          req.params.id,
          req.params.version,
        );
        if (!version) {
          res.status(404).json({ error: 'Version not found' });
          return;
        }
        res.json(version);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /requirement-versions/:id
   * One version by its own id, when the caller already has it.
   */
  router.get('/requirement-versions/:id', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const version = await service.getVersion(req.params.id);
      if (!version) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }
      res.json(version);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /requirement-versions/:id/workflow
   * Where the version stands: created, review, QA approval, released.
   */
  router.get('/requirement-versions/:id/workflow', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      res.json(await service.getRequirementVersionWorkflow(req.params.id));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /baselines/:id/workflow
   */
  router.get('/baselines/:id/workflow', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      res.json(await service.getBaselineWorkflow(req.params.id));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ============================================================================
  // P1A/P1B BASELINES (Immutable Snapshots)
  // ============================================================================

  /**
   * POST /requirement-sets/:id/baselines
   * Create an immutable snapshot of the requirement set at a point in time
   */
  router.post(
    '/requirement-sets/:id/baselines',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursManagePermission,
        );
        const data = req.body as CreateBaselineRequest;
        if (!requireBody(res, data, 'requirementVersionIds')) {
          return;
        }
        if (!Array.isArray(data.requirementVersionIds) || data.requirementVersionIds.length === 0) {
          res.status(400).json({ error: 'requirementVersionIds must be a non-empty array' });
          return;
        }
        const baseline = await service.createBaseline(
          req.params.id,
          data.requirementVersionIds,
          data.baselineVersion ?? '1.0',
          actor,
        );
        res.status(201).json(baseline);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /requirement-sets/:id/baselines
   * List baseline history for a requirement set
   */
  router.get(
    '/requirement-sets/:id/baselines',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, ursReadPermission);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const offset = parseInt(req.query.offset as string) || 0;
        const result = await service.listBaselines(
          req.params.id,
          limit,
          offset,
        );
        res.json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * GET /baselines/:id
   * Get baseline detail (stable cross-plugin contract candidate)
   * 
   * Returns baseline with full context:
   * - exact requirement versions
   * - business capability context
   * - approval status
   * - without exposing DB implementation details
   */
  router.get('/baselines/:id', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const baseline = await service.getBaseline(req.params.id);
      if (!baseline) {
        res.status(404).json({ error: 'Baseline not found' });
        return;
      }
      res.json(baseline);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /baselines/:id/change-set
   * Compute delta between this baseline and its predecessor
   */
  router.get('/baselines/:id/change-set', async (req: express.Request, res: express.Response) => {
    try {
      const actor = await authorize(permissions, httpAuth, req, ursReadPermission);
      const changeSet = await service.computeChangeSet(req.params.id, actor);
      res.json(changeSet);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  // ============================================================================
  // P1A/P1B APPROVAL WORKFLOWS
  // ============================================================================

  /**
   * GET /approval-workflows
   * List available approval workflow definitions
   */
  router.get(
    '/approval-workflows',
    async (req: express.Request, res: express.Response) => {
      try {
        await authorize(permissions, httpAuth, req, ursReadPermission);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const offset = parseInt(req.query.offset as string) || 0;
        const result = await service.listApprovalWorkflows(limit, offset);
        res.json(result);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // P1A/P1B BASELINE SUBMISSION & APPROVAL WORKFLOW
  // ============================================================================

  /**
   * POST /baselines/:id/submit
   * Submit baseline for approval
   * 
   * Service orchestrates:
   * 1. Validate baseline state
   * 2. Select workflow
   * 3. Create approval instance
   * 4. Create steps
   * 5. Activate first step
   * 6. Create audit event
   */
  router.post(
    '/baselines/:id/submit',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursManagePermission,
        );
        const approval = await service.submitBaseline(req.params.id, actor);
        res.status(201).json(approval);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // P1A/P1B APPROVAL INSTANCES & DECISIONS
  // ============================================================================

  /**
   * GET /approvals/:id
   * Get approval instance detail including workflow, current step, history
   */
  router.get('/approvals/:id', async (req: express.Request, res: express.Response) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const approval = await service.getApprovalInstance(req.params.id);
      if (!approval) {
        res.status(404).json({ error: 'Approval instance not found' });
        return;
      }
      res.json(approval);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /approvals/:id/steps/:stepId/approve
   * Approve an active approval step
   * 
   * Actor must come from Backstage identity (never from request body).
   * 
   * If final step:
   * - ApprovalInstance → APPROVED
   * - Baseline → APPROVED
   * - Requirement Versions → APPROVED
   * - Previous approved versions → SUPERSEDED
   * - Audit events created
   * (all transactional through service layer)
   */
  router.post(
    '/approvals/:id/steps/:stepId/approve',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursApprovePermission,
        );
        const credentials = await httpAuth.credentials(req, { allow: ['user'] });
        const data = req.body as ApproveApprovalStepRequest;
        const updated = await service.approveApprovalStep(
          req.params.id,
          req.params.stepId,
          actor,
          data.comment,
          credentials,
        );
        res.json(updated);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ==========================================================================
  // CHANGE CONTROL
  // ==========================================================================

  /**
   * POST /change-requests
   * Raise a change request. The identifier is assigned server-side.
   */
  router.post('/change-requests', async (req, res) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursChangeRequestManagePermission,
      );
      if (!requireBody(res, req.body, 'title', 'description', 'reason')) {
        return;
      }
      const created = await service.createChangeRequest(req.body, actor);
      res.status(201).json(created);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /change-requests
   */
  router.get('/change-requests', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      const limit = parseInt(String(req.query.limit ?? '50'), 10);
      const offset = parseInt(String(req.query.offset ?? '0'), 10);
      res.json(await service.listChangeRequests(limit, offset));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /change-requests/:id
   */
  router.get('/change-requests/:id', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      res.json(await service.getChangeRequest(req.params.id));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /change-requests/:id/impact-assessment
   * Record what the change would affect. Required before approval.
   */
  router.post('/change-requests/:id/impact-assessment', async (req, res) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursChangeRequestManagePermission,
      );
      if (!requireBody(res, req.body, 'summary', 'validationImpact')) {
        return;
      }
      const assessment = await service.assessChangeRequest(
        req.params.id,
        {
          summary: req.body.summary,
          gxpImpact: Boolean(req.body.gxpImpact),
          validationImpact: req.body.validationImpact,
          affectedVersionIds: req.body.affectedVersionIds,
        },
        actor,
      );
      res.status(201).json(assessment);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /change-requests/:id/approve
   * Approve with a quality signature; requires the signing PIN.
   */
  router.post('/change-requests/:id/approve', async (req, res) => {
    try {
      const actor = await authorize(permissions, httpAuth, req, ursSignPermission);
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const { pin, comment } = req.body as { pin?: string; comment?: string };
      if (!pin) {
        res.status(400).json({ error: 'pin is required to approve' });
        return;
      }
      res.json(
        await service.approveChangeRequest(
          req.params.id,
          actor,
          pin,
          comment,
          credentials,
        ),
      );
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /change-requests/:id/reject
   * No signature: leaving the released state untouched attests to nothing.
   */
  router.post('/change-requests/:id/reject', async (req, res) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursChangeRequestManagePermission,
      );
      if (!requireBody(res, req.body, 'reason')) {
        return;
      }
      res.json(
        await service.rejectChangeRequest(req.params.id, req.body.reason, actor),
      );
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /change-requests/:id/traceability
   * The request, its assessment, its signatures and what it produced.
   */
  router.get('/change-requests/:id/traceability', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      res.json(await service.getChangeRequestTraceability(req.params.id));
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * PUT /signing-pin
   * Set or replace the caller's own signing PIN.
   *
   * There is no route to set someone else's PIN, and there will not be: an
   * administrator who could do that could sign in another person's name.
   */
  router.put('/signing-pin', async (req, res) => {
    try {
      const actor = await authorize(permissions, httpAuth, req, ursSignPermission);
      const { pin } = req.body as { pin?: string };
      if (!pin) {
        res.status(400).json({ error: 'pin is required' });
        return;
      }
      await service.setSigningPin(actor, pin);
      res.status(204).end();
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /requirement-versions/:id/obsolete
   * Retire a released version. Refused with 409 while a released baseline
   * still pins it (invariant 16).
   */
  router.post('/requirement-versions/:id/obsolete', async (req, res) => {
    try {
      const actor = await authorize(
        permissions,
        httpAuth,
        req,
        ursManagePermission,
      );
      if (!requireBody(res, req.body, 'reason')) {
        return;
      }
      res.json(
        await service.obsoleteRequirementVersion(
          req.params.id,
          req.body.reason,
          actor,
        ),
      );
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * GET /requirement-versions/:id/signatures
   * The signatures applied to a requirement version.
   */
  router.get('/requirement-versions/:id/signatures', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, ursReadPermission);
      res.json({ items: await service.listSignatures(req.params.id) });
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /requirement-versions/:id/signatures
   * Apply an electronic signature.
   *
   * An APPROVED_QA signature releases the version; that is the only way a
   * version becomes released, so there is no separate status endpoint.
   */
  router.post('/requirement-versions/:id/signatures', async (req, res) => {
    try {
      const actor = await authorize(permissions, httpAuth, req, ursSignPermission);
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const { meaning, pin, comment } = req.body as {
        meaning?: string;
        pin?: string;
        comment?: string;
      };

      if (!meaning || !(meaning in SignatureMeaning)) {
        res.status(400).json({
          error: `meaning must be one of ${Object.keys(SignatureMeaning).join(', ')}`,
        });
        return;
      }
      if (!pin) {
        res.status(400).json({ error: 'pin is required to sign' });
        return;
      }

      const signature = await service.signRequirementVersion(
        req.params.id,
        meaning as SignatureMeaning,
        actor,
        pin,
        comment,
        credentials,
      );
      res.status(201).json(signature);
    } catch (err) {
      respondError(res, logger, err);
    }
  });

  /**
   * POST /approvals/:id/steps/:stepId/reject
   * Reject an active approval step
   * 
   * Actor must come from Backstage identity.
   * Rejection reason/comment required.
   * Preserves rejected baseline and approval history.
   */
  router.post(
    '/approvals/:id/steps/:stepId/reject',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursApprovePermission,
        );
        const credentials = await httpAuth.credentials(req, { allow: ['user'] });
        const data = req.body as RejectApprovalStepRequest;
        if (!data.reason && !data.comment) {
          res.status(400).json({ error: 'reason or comment is required' });
          return;
        }
        const updated = await service.rejectApprovalStep(
          req.params.id,
          req.params.stepId,
          actor,
          data.reason || data.comment || '',
          credentials,
        );
        res.json(updated);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  /**
   * POST /approvals/:id/cancel
   * Cancel an in-progress approval workflow.
   * Sets instance to CANCELLED, skips open steps. Baseline remains unchanged.
   */
  router.post(
    '/approvals/:id/cancel',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursApprovePermission,
        );
        const data = req.body as { reason?: string };
        const updated = await service.cancelApprovalInstance(
          req.params.id,
          actor,
          data?.reason,
        );
        res.json(updated);
      } catch (err) {
        respondError(res, logger, err);
      }
    },
  );

  // ============================================================================
  // AI REQUIREMENT SUGGESTIONS
  // ============================================================================

  router.post(
    '/requirement-sets/:id/generate-suggestions',
    async (req: express.Request, res: express.Response) => {
      try {
        const actor = await authorize(
          permissions,
          httpAuth,
          req,
          ursManagePermission,
        );

        const suggestions = await service.generateRequirementSuggestions(
          req.params.id,
          actor,
        );

        res.json({ suggestions });
      } catch (error) {
        // Authorization, validation and lookup failures use the shared mapping.
        // Only genuine AI provider failures keep the dedicated 501/502 codes.
        if (
          error instanceof AuthenticationError ||
          error instanceof NotAllowedError ||
          error instanceof InputError ||
          error instanceof NotFoundError
        ) {
          respondError(res, logger, error);
        } else if (error instanceof Error && error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
        } else if (error instanceof Error && error.message.includes('not configured')) {
          res.status(501).json({ error: error.message });
        } else {
          logger.error('Failed to generate AI suggestions', error as Error);
          res.status(502).json({
            error: error instanceof Error ? error.message : 'AI generation failed',
          });
        }
      }
    },
  );

  // ============================================================================
  // HEALTH
  // ============================================================================

  router.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'urs-composer',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
