/**
 * Validation Manager API Routes
 * Express router for approval workflow & document export
 *
 * Authorization: Uses Backstage Permission Framework exclusively.
 * No client-supplied headers are trusted for authorization.
 */

import express from 'express';
import Router from 'express-promise-router';
import { AuthenticationError, InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import {
  validationReadPermission,
  validationReviewPermission,
  validationAdminPermission,
} from '@internal/platform-common';
import { requirementService } from './services/requirementService'; // TODO: implement
import { approvalService } from './services/approvalService';
import { documentExportService } from './services/documentExportService';
import { documentService } from './services/documentService';
import { complianceService } from './services/complianceService';
import { auditService } from './services/auditService'; // TODO: implement

export interface ValidationManagerRouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
}

/**
 * Backstage-native authorization check.
 * Replicates the pattern from model-company-backend and data-products-backend.
 */
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
    // Configuration errors return 500
    if (message.includes('not configured')) {
      logger.error(`Authorization service misconfiguration: ${message}`);
      res.status(500).json({ error: 'Authorization service unavailable' });
      return;
    }
    res.status(403).json({ error: message });
    return;
  }
  if (error instanceof InputError || error instanceof NotFoundError) {
    res.status(400).json({ error: String(error) });
    return;
  }
  logger.error(`Unexpected error: ${error}`);
  res.status(500).json({ error: 'Internal server error' });
}

export async function createRouter(options: ValidationManagerRouterOptions): Promise<express.Router> {
  const { logger, httpAuth, permissions } = options;
  const router = Router();
  router.use(express.json());

// ============================================================================
// REQUIREMENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/validation-manager/requirements
 * List all requirements with filters
 */
router.get('/requirements', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReadPermission);
    // TODO: Get from database
    const requirements = [];
    res.json(requirements);
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * GET /api/validation-manager/requirements/:id
 * Get single requirement by ID
 */
router.get('/requirements/:id', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReadPermission);
    const { id } = req.params;
    // TODO: Get from database
    res.json({ id, message: 'Implement database fetch' });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * POST /api/validation-manager/requirements
 * Create new requirement
 *
 * Authorization: Requires validation review permission (OWNER+)
 */
router.post('/requirements', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReviewPermission);
    const { title, description, rationale, gxpRelevance, riskLevel } = req.body;

    // TODO: Create in database with:
    // - Auto-version: 1.0.0
    // - Auto-approval records: [PENDING, PENDING, PENDING, PENDING]
    // - Auto-audit trail entry

    res.status(201).json({
      id: 'URS-001',
      version: '1.0.0',
      title,
      gxpRelevance,
      riskLevel,
      approvals: approvalService.createApprovalRecords(),
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

/**
 * POST /api/validation-manager/requirements/:id/approve
 * Approve requirement at current workflow step (technical workflow action)
 *
 * Authorization: Requires validation.review permission (OWNER+)
 *
 * Note: This is a technical workflow approval action, not GxP approval.
 * Regulatory approval, if required, is a separate formal process.
 */
router.post('/requirements/:id/approve', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReviewPermission);
    const { id } = req.params;
    const { comment } = req.body;

    // TODO: Fetch requirement from database
    const requirement = {} as any; // Mock

    // Approve using ApprovalService
    const result = approvalService.approveRequirement(requirement, comment);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // TODO: Save requirement to database
    // TODO: Create audit log entry
    // TODO: Send notification to next approver

    res.json({
      success: true,
      nextStep: result.nextStep,
      message: 'Requirement approved',
      approvalStatus: approvalService.getApprovalStatus(requirement),
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * POST /api/validation-manager/requirements/:id/reject
 * Reject requirement — returns to DRAFT
 *
 * Authorization: Requires validation.review permission (OWNER+)
 */
router.post('/requirements/:id/reject', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReviewPermission);
    const { id } = req.params;
    const { reason, comment } = req.body;

    // TODO: Fetch requirement from database
    const requirement = {} as any; // Mock

    const result = approvalService.rejectRequirement(requirement, reason, comment);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // TODO: Save requirement to database (with reset approvals)
    // TODO: Create audit log entry
    // TODO: Send notification to author

    res.json({
      success: true,
      message: 'Requirement rejected and returned to DRAFT',
      approvalStatus: approvalService.getApprovalStatus(requirement),
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * POST /api/validation-manager/requirements/:id/sign
 * Complete the workflow with a technical signature step
 *
 * Authorization: Requires validation.review permission (OWNER+)
 *
 * Note: This is a technical workflow step, not an electronic signature
 * under 21 CFR Part 11 or regulatory requirement.
 * Regulatory signature requirements, if any, are external to this system.
 */
router.post('/requirements/:id/sign', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReviewPermission);
    const { id } = req.params;
    const { certificateId } = req.body;

    // TODO: Fetch requirement from database
    const requirement = {} as any; // Mock

    // Verify all approvals are complete
    if (!approvalService.isApprovalChainComplete(requirement)) {
      return res.status(400).json({
        error: 'Cannot sign: not all approvals are complete',
        approvalStatus: approvalService.getApprovalStatus(requirement),
      });
    }

    // TODO: Call signature service to generate digital signature
    // - Calculate SHA256 hash
    // - Get TSA timestamp
    // - Sign with certificate

    // TODO: Update requirement signature & status
    // TODO: Create audit log entry
    // TODO: Auto-export signed document

    res.json({
      success: true,
      message: 'Workflow signed',
      signature: {
        status: 'SIGNED',
        hash: 'a1b2c3d4e5f6...',
        timestamp: new Date().toISOString(),
        validUntil: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

// ============================================================================
// DOCUMENT EXPORT ENDPOINTS
// ============================================================================

/**
 * POST /api/validation-manager/documents/generate
 * Generate and export document (URS/TDS/Traceability)
 *
 * Authorization: Requires validation.review permission (OWNER+)
 */
router.post('/documents/generate', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReviewPermission);
    const { requirementIds, documentType, format } = req.body;

    // TODO: Fetch requirements from database
    const requirements: any[] = [];

    // Generate markdown content
    let markdownContent = '';
    if (documentType === 'URS') {
      const result = documentService.generateURS(requirements);
      markdownContent = result.markdown;
    } else if (documentType === 'TDS') {
      const result = documentService.generateTDS(requirements);
      markdownContent = result.markdown;
    } else if (documentType === 'TRACEABILITY_MATRIX') {
      const result = documentService.generateTraceabilityMatrix(requirements);
      markdownContent = result.markdown;
    }

    // Export document
    const exportResult = format === 'PDF'
      ? await documentExportService.exportAsPDF(requirements[0], markdownContent, {
          documentType: documentType as any,
          markdownContent,
        })
      : await documentExportService.exportAsMarkdown(requirements[0], markdownContent, {
          documentType: documentType as any,
          markdownContent,
        });

    if (!exportResult.success) {
      return res.status(400).json({ error: exportResult.error });
    }

    // TODO: Create audit log entry for export
    // TODO: Update document metadata in database

    res.json({
      success: true,
      document: exportResult.exportedDocument,
      message: `${documentType} exported successfully`,
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * GET /api/validation-manager/documents/exports
 * List all exported documents
 *
 * Authorization: Requires validation.read permission (VIEWER+)
 */
router.get('/documents/exports', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReadPermission);
    const exports = documentExportService.listExportedDocuments();
    res.json({
      total: exports.length,
      documents: exports,
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * GET /api/validation-manager/documents/exports/stats
 * Get export statistics
 *
 * Authorization: Requires validation.read permission (VIEWER+)
 */
router.get('/documents/exports/stats', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReadPermission);
    const stats = documentExportService.getExportStats();
    res.json(stats);
  } catch (err) {
    respondError(res, logger, err);
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/validation-manager/admin/dashboard
 * Admin dashboard with statistics
 *
 * Authorization: Requires validation.admin permission (PLATFORM_ADMIN only)
 */
router.get('/admin/dashboard', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationAdminPermission);

    // TODO: Calculate statistics from database
    res.json({
      totalRequirements: 42,
      byState: {
        baselined: 40,
        rejected: 2,
        openPolicyDefinition: 0,
      },
      byGxP: {
        direct: 25,
        indirect: 15,
        claimControl: 2,
        none: 0,
      },
      pendingApprovals: 3,
      overdueApprovals: 1,
      exportedDocuments: 38,
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * GET /api/validation-manager/admin/approvals/pending
 * Get all pending approvals for current user
 *
 * Authorization: Requires validation.review permission (OWNER+)
 */
router.get('/admin/approvals/pending', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReviewPermission);

    // TODO: Get all requirements from database
    const allRequirements: any[] = [];

    const pending = approvalService.getPendingApprovalsForUser(allRequirements);

    res.json({
      total: pending.length,
      approvals: pending.map(p => ({
        requirementId: p.requirement.id,
        title: p.requirement.title,
        currentStep: p.approvalStep.role,
        daysWaiting: p.daysWaiting,
        gxpRelevance: p.requirement.gxpRelevance,
        riskLevel: p.requirement.riskLevel,
      })),
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * GET /api/validation-manager/requirements/:id/history
 * Get version history for requirement
 *
 * Authorization: Requires validation.read permission (VIEWER+)
 */
router.get('/requirements/:id/history', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReadPermission);
    const { id } = req.params;
    // TODO: Get from database
    res.json({
      requirementId: id,
      versions: [
        {
          version: '1.0.0',
          date: '2026-08-01',
          change: 'Initial baseline',
          changeType: 'MAJOR',
          author: 'QA Team',
        },
      ],
    });
  } catch (err) {
    respondError(res, logger, err);
  }
});

/**
 * GET /api/validation-manager/requirements/:id/audit
 * Get audit trail for requirement
 *
 * Authorization: Requires validation.read permission (VIEWER+)
 */
router.get('/requirements/:id/audit', async (req: express.Request, res: express.Response) => {
  try {
    await authorize(permissions, httpAuth, req, validationReadPermission);
    const { id } = req.params;
    // TODO: Get from database
    res.json({
      requirementId: id,
      auditTrail: [
        {
          timestamp: '2026-08-01T10:00:00Z',
          action: 'CREATE',
          actor: 'john.doe',
          role: 'QA_LEAD',
          reason: 'Initial requirement',
        },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/validation-manager/health
 * Health check endpoint
 */
/**
 * GET /api/validation-manager/health
 * Health check endpoint (public, no authorization required)
 */
router.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'validation-manager',
    timestamp: new Date().toISOString(),
  });
});

return router;
}

export { createRouter };
