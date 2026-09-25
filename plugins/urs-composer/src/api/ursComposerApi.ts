/**
 * URS Composer API Client
 * 
 * Centralized typed client for all P1B REST API communication.
 * Handles error mapping, request/response transformation.
 * Single point of integration between URS UI and backend.
 */

import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import {
  URSApiError,
  BusinessCapability,
  BusinessRole,
  RequirementSet,
  Requirement,
  RequirementVersion,
  ApprovedBaselineOption,
  Baseline,
  ApprovalInstance,
  AuditEvent,
  CreateRequirementSetRequest,
  CreateRequirementRequest,
  UpdateRequirementSetRequest,
  CreateBaselineRequest,
  CreateRevisionRequest,
  SubmitBaselineRequest,
  ApproveStepRequest,
  RejectStepRequest,
  RequirementSetListResponse,
  CapabilityListResponse,
  BusinessRoleListResponse,
  ApprovalWorkflowListResponse,
  ChangeSet,
  GeneratedRequirement,
  WorkflowView,
  Signature,
  SignRequest,
  ChangeRequest,
  ImpactAssessment,
  ChangeRequestTraceability,
  CreateChangeRequestRequest,
  CreateImpactAssessmentRequest,
  QualityCheckRequest,
  QualityValidateResponse,
  AdvanceVersionsResult,
} from './types';
// From './types' rather than platform-common directly: that file re-exports the
// vocabulary precisely so this one has a single source for it.
import { URSStatus } from './types';

export type { URSApiError };

/**
 * URS Composer API Client
 *
 * All methods:
 * - Return typed responses
 * - Throw URSApiError on failure
 * - Map HTTP error codes to consistent error interface
 */
export class URSComposerApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  /**
   * Helper: Make HTTP request with error handling
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const base = await this.discoveryApi.getBaseUrl('urs-composer');
    const url = `${base}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await this.fetchApi.fetch(url, options);

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: URSApiError = {
        status: response.status,
        message: errorData.error || `HTTP ${response.status}`,
        code: errorData.code,
        details: errorData,
      };
      throw error;
    }

    // A route that answers 204 sends no body, and parsing one throws. The
    // signing-pin route does exactly that, so this is on the path of every
    // signature.
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse success response
    const data = await response.json();
    return data as T;
  }

  /**
   * Helper: GET request
   */
  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * Helper: POST request
   */
  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Helper: PUT request
   */
  private put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  // ============================================================================
  // BUSINESS CAPABILITIES (P0)
  // ============================================================================

  /**
   * GET /capabilities
   * List all business capabilities
   */
  async listCapabilities(): Promise<CapabilityListResponse> {
    return this.get<CapabilityListResponse>('/capabilities');
  }

  /**
   * GET /capabilities/:id
   * Get a specific business capability
   */
  async getCapability(id: string): Promise<BusinessCapability> {
    return this.get<BusinessCapability>(`/capabilities/${encodeURIComponent(id)}`);
  }

  /**
   * POST /capabilities
   * Create a new business capability (Business Capability Lead).
   */
  async createBusinessCapability(
    data: { name: string; description?: string; domain: string },
  ): Promise<BusinessCapability> {
    return this.post<BusinessCapability>('/capabilities', data);
  }

  /**
   * DELETE /capabilities/:id
   * Retire (soft-delete) a business capability.
   */
  async retireBusinessCapability(id: string): Promise<BusinessCapability> {
    return this.request<BusinessCapability>(
      'DELETE',
      `/capabilities/${encodeURIComponent(id)}`,
    );
  }

  /**
   * PUT /capabilities/:id
   * Update a business capability.
   */
  async updateBusinessCapability(
    id: string,
    data: { name?: string; description?: string; domain?: string },
  ): Promise<BusinessCapability> {
    return this.request<BusinessCapability>(
      'PUT',
      `/capabilities/${encodeURIComponent(id)}`,
      data,
    );
  }

  // ============================================================================
  // BUSINESS ROLES (P1B)
  // ============================================================================

  /**
   * GET /business-roles
   * List all active business roles.
   */
  async listBusinessRoles(): Promise<BusinessRoleListResponse> {
    return this.get<BusinessRoleListResponse>('/business-roles');
  }

  /**
   * POST /business-roles
   * Create a business role.
   */
  async createBusinessRole(
    data: { name: string; description?: string },
  ): Promise<BusinessRole> {
    return this.post<BusinessRole>('/business-roles', data);
  }

  /**
   * PUT /business-roles/:id
   * Update a business role.
   */
  async updateBusinessRole(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<BusinessRole> {
    return this.request<BusinessRole>(
      'PUT',
      `/business-roles/${encodeURIComponent(id)}`,
      data,
    );
  }

  /**
   * DELETE /business-roles/:id
   * Retire a business role.
   */
  async retireBusinessRole(id: string): Promise<BusinessRole> {
    return this.request<BusinessRole>(
      'DELETE',
      `/business-roles/${encodeURIComponent(id)}`,
    );
  }

  // ============================================================================
  // REQUIREMENT SETS (P0/P1)
  // ============================================================================

  /**
   * POST /requirement-sets
   * Create a new requirement set
   */
  async createRequirementSet(req: CreateRequirementSetRequest): Promise<RequirementSet> {
    return this.post<RequirementSet>('/requirement-sets', req);
  }

  /**
   * GET /requirement-sets
   * List all requirement sets
   */
  async listRequirementSets(): Promise<RequirementSetListResponse> {
    return this.get<RequirementSetListResponse>('/requirement-sets');
  }

  /**
   * GET /requirement-sets/:id
   * Get a specific requirement set
   */
  async getRequirementSet(id: string): Promise<RequirementSet> {
    return this.get<RequirementSet>(`/requirement-sets/${id}`);
  }

  /**
   * PUT /requirement-sets/:id
   * Update a requirement set draft
   */
  async updateRequirementSet(
    id: string,
    req: UpdateRequirementSetRequest,
  ): Promise<{ requirementSet: RequirementSet; requirements: Requirement[] }> {
    return this.request('PUT', `/requirement-sets/${id}`, req);
  }

  /**
   * POST /requirement-sets/:id/revise
   * Open a controlled revision of an approved/baselined requirement set.
   * Returns the new DRAFT version; the source record stays immutable.
   */
  async reviseRequirementSet(
    id: string,
    reason?: string,
  ): Promise<RequirementSet> {
    return this.post<RequirementSet>(`/requirement-sets/${id}/revise`, {
      reason,
    });
  }

  /**
   * URS → Validation Expert integration.
   *
   * POST /api/validation-expert/contexts/from-urs
   * Create (or return existing) a Validation Context from an APPROVED URS
   * baseline. The backend enforces the APPROVED gate; calling this for a
   * DRAFT/IN_REVIEW/REJECTED baseline is denied server-side.
   */
  async startValidationFromBaseline(
    requirementSetId: string,
    baselineId: string,
  ): Promise<{
    context: {
      id: string;
      source: {
        requirementSetId: string;
        baselineId: string;
        baselineVersion: string;
        businessCapabilityIds: string[];
        approvalStatus: string;
        sourceSystem: string;
      };
    };
    created: boolean;
  }> {
    const base = await this.discoveryApi.getBaseUrl('validation-expert');
    const url = `${base}/contexts/from-urs`;
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementSetId, baselineId }),
    });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        message = (body as { error?: string })?.error ?? message;
      } catch {
        // keep default message
      }
      throw new Error(message);
    }
    return response.json();
  }

  /**
   * Lookup an existing Validation Expert context for a URS set + baseline pair.
   * Uses GET /api/validation-expert/contexts (read-only; does not create).
   */
  async findValidationContext(
    requirementSetId: string,
    baselineId: string,
  ): Promise<{ id: string } | undefined> {
    const base = await this.discoveryApi.getBaseUrl('validation-expert');
    const response = await this.fetchApi.fetch(`${base}/contexts`);
    if (!response.ok) {
      return undefined;
    }
    const body = (await response.json()) as {
      items?: Array<{
        id: string;
        source?: { requirementSetId?: string; baselineId?: string };
      }>;
    };
    const match = (body.items ?? []).find(
      item =>
        item.source?.requirementSetId === requirementSetId &&
        item.source?.baselineId === baselineId,
    );
    return match ? { id: match.id } : undefined;
  }

  /**
   * GET /requirement-sets/:id/audit
   * Get audit trail for a requirement set
   */
  async getRequirementSetAudit(id: string): Promise<AuditEvent[]> {
    return this.get<AuditEvent[]>(`/requirement-sets/${id}/audit`);
  }

  // ============================================================================
  // REQUIREMENTS (P0)
  // ============================================================================

  /**
   * POST /requirement-sets/:setId/requirements
   * Add a requirement to a requirement set
   */
  async createRequirement(
    setId: string,
    req: CreateRequirementRequest,
  ): Promise<Requirement> {
    return this.post<Requirement>(`/requirement-sets/${setId}/requirements`, req);
  }

  /**
   * GET /requirement-sets/:setId/requirements
   * List requirements in a requirement set
   */
  async listRequirements(setId: string): Promise<Requirement[]> {
    return this.get<Requirement[]>(`/requirement-sets/${setId}/requirements`);
  }

  /**
   * GET /requirement-sets/:setId/requirements/:reqId
   * Get a specific requirement
   */
  async getRequirement(setId: string, reqId: string): Promise<Requirement> {
    return this.get<Requirement>(
      `/requirement-sets/${setId}/requirements/${reqId}`,
    );
  }

  // ============================================================================
  // REQUIREMENT VERSIONS (P1B)
  // ============================================================================

  /**
   * POST /requirements/:id/revisions
   * Create a controlled revision (new version) of a requirement
   */
  async createRevision(
    requirementId: string,
    req: CreateRevisionRequest,
  ): Promise<RequirementVersion> {
    return this.post<RequirementVersion>(
      `/requirements/${requirementId}/revisions`,
      req,
    );
  }

  /**
   * GET /requirements/:id/versions
   * List all versions of a requirement
   */
  async listRequirementVersions(requirementId: string): Promise<RequirementVersion[]> {
    return this.get<RequirementVersion[]>(`/requirements/${requirementId}/versions`);
  }

  /**
   * POST /requirement-sets/:setId/versions/transition
   * Move every open version of the set one step along the review chain:
   * DRAFT -> IN_REVIEW -> REVIEWED -> IN_APPROVAL, or REJECTED.
   *
   * Never APPROVED. A version reaches APPROVED only as the consequence of a
   * valid QA signature (`signRequirementVersion`), which is the rule the
   * service states at `assertTransition` and this client must not appear to
   * offer a way round.
   *
   * This method did not exist, and neither did any caller for the two routes
   * behind it. A version could therefore not leave DRAFT from the browser; a
   * baseline may only be released once every pinned version is APPROVED; so no
   * baseline a user created could ever be released, and `/baselines/approved`
   * — the list the Product page binds against — was permanently empty. The
   * whole URS -> Product journey stopped here.
   */
  async advanceRequirementSetVersions(
    setId: string,
    status: URSStatus,
    reason?: string,
  ): Promise<AdvanceVersionsResult> {
    return this.post<AdvanceVersionsResult>(
      `/requirement-sets/${encodeURIComponent(setId)}/versions/transition`,
      { status, reason },
    );
  }

  /**
   * GET /requirement-sets/:setId/current-versions
   * The version in force for each requirement in the set — the versions a
   * baseline pins. Resolved server-side so callers never have to turn
   * requirement ids into version ids themselves.
   */
  async listCurrentVersions(setId: string): Promise<RequirementVersion[]> {
    return this.get<RequirementVersion[]>(
      `/requirement-sets/${setId}/current-versions`,
    );
  }

  /**
   * GET /baselines/approved
   * Approved baselines across all requirement sets — the options a product can
   * be built against.
   */
  async listApprovedBaselines(): Promise<ApprovedBaselineOption[]> {
    const result = await this.get<{ items: ApprovedBaselineOption[] }>(
      '/baselines/approved',
    );
    return result.items ?? [];
  }

  /**
   * GET /requirement-sets/:setId/next-baseline-version
   * The baseline version the server proposes next. A suggestion — the user may
   * type a different label, e.g. to match a document number in an external QMS.
   */
  async getNextBaselineVersion(setId: string): Promise<string> {
    const result = await this.get<{ baselineVersion: string }>(
      `/requirement-sets/${setId}/next-baseline-version`,
    );
    return result.baselineVersion;
  }

  /**
   * GET /requirements/:id/versions/:version
   * Get a specific version of a requirement
   */
  async getRequirementVersion(
    requirementId: string,
    version: string,
  ): Promise<RequirementVersion> {
    return this.get<RequirementVersion>(
      `/requirements/${requirementId}/versions/${version}`,
    );
  }

  // ============================================================================
  // BASELINES (P1B)
  // ============================================================================

  /**
   * POST /requirement-sets/:id/baselines
   * Create a baseline (immutable snapshot)
   */
  async createBaseline(
    setId: string,
    req: CreateBaselineRequest,
  ): Promise<Baseline> {
    return this.post<Baseline>(`/requirement-sets/${setId}/baselines`, req);
  }

  /**
   * GET /requirement-sets/:id/baselines
   * List baselines for a requirement set
   */
  async listBaselines(setId: string): Promise<Baseline[]> {
    const result = await this.get<{ items: Baseline[]; total: number }>(
      `/requirement-sets/${setId}/baselines`,
    );
    return result.items ?? [];
  }

  /**
   * GET /baselines/:id
   * Get a specific baseline (cross-plugin stable contract)
   */
  async getBaseline(id: string): Promise<Baseline> {
    return this.get<Baseline>(`/baselines/${id}`);
  }

  /**
   * POST /baselines/:id/submit
   * Submit baseline for approval (creates ApprovalInstance)
   */
  async submitBaseline(id: string, req?: SubmitBaselineRequest): Promise<ApprovalInstance> {
    return this.post<ApprovalInstance>(`/baselines/${id}/submit`, req || {});
  }

  /**
   * GET /baselines/:id/change-set
   * Compute delta between this baseline and its predecessor
   */
  async getChangeSet(baselineId: string): Promise<ChangeSet> {
    return this.get<ChangeSet>(`/baselines/${encodeURIComponent(baselineId)}/change-set`);
  }

  // ============================================================================
  // WORKFLOW VIEW
  // ============================================================================

  /**
   * GET /requirement-versions/:id/workflow
   * Where a version stands: created, review, QA approval, released.
   */
  async getRequirementVersionWorkflow(
    versionId: string,
  ): Promise<WorkflowView> {
    return this.get<WorkflowView>(
      `/requirement-versions/${encodeURIComponent(versionId)}/workflow`,
    );
  }

  /**
   * GET /baselines/:id/workflow
   */
  async getBaselineWorkflow(baselineId: string): Promise<WorkflowView> {
    return this.get<WorkflowView>(
      `/baselines/${encodeURIComponent(baselineId)}/workflow`,
    );
  }

  // ============================================================================
  // ELECTRONIC SIGNATURES
  // ============================================================================

  /**
   * PUT /signing-pin
   * Set the caller's own signing PIN. Never sent anywhere else.
   */
  async setSigningPin(pin: string): Promise<void> {
    await this.put<{ ok: boolean }>('/signing-pin', { pin });
  }

  /**
   * GET /requirement-versions/:id/signatures
   */
  async listSignatures(versionId: string): Promise<Signature[]> {
    const result = await this.get<{ items: Signature[] }>(
      `/requirement-versions/${encodeURIComponent(versionId)}/signatures`,
    );
    return result.items ?? [];
  }

  /**
   * POST /requirement-versions/:id/signatures
   * Sign a version. The PIN is the second factor and is not stored client-side.
   */
  async signRequirementVersion(
    versionId: string,
    req: SignRequest,
  ): Promise<Signature> {
    return this.post<Signature>(
      `/requirement-versions/${encodeURIComponent(versionId)}/signatures`,
      req,
    );
  }

  /**
   * POST /requirement-versions/:id/obsolete
   * Refused with 409 while a released baseline still pins the version.
   */
  async obsoleteRequirementVersion(
    versionId: string,
    reason: string,
  ): Promise<RequirementVersion> {
    return this.post<RequirementVersion>(
      `/requirement-versions/${encodeURIComponent(versionId)}/obsolete`,
      { reason },
    );
  }

  // ============================================================================
  // CHANGE CONTROL
  // ============================================================================

  /**
   * POST /change-requests
   * The identifier is assigned server-side.
   */
  async createChangeRequest(
    req: CreateChangeRequestRequest,
  ): Promise<ChangeRequest> {
    return this.post<ChangeRequest>('/change-requests', req);
  }

  /**
   * GET /change-requests
   */
  async listChangeRequests(
    limit = 50,
    offset = 0,
  ): Promise<{ items: ChangeRequest[]; total: number }> {
    return this.get<{ items: ChangeRequest[]; total: number }>(
      `/change-requests?limit=${limit}&offset=${offset}`,
    );
  }

  /**
   * GET /change-requests/:id
   */
  async getChangeRequest(id: string): Promise<ChangeRequest> {
    return this.get<ChangeRequest>(
      `/change-requests/${encodeURIComponent(id)}`,
    );
  }

  /**
   * POST /change-requests/:id/impact-assessment
   * Required before the request can be approved.
   */
  async assessChangeRequest(
    id: string,
    req: CreateImpactAssessmentRequest,
  ): Promise<ImpactAssessment> {
    return this.post<ImpactAssessment>(
      `/change-requests/${encodeURIComponent(id)}/impact-assessment`,
      req,
    );
  }

  /**
   * POST /change-requests/:id/approve
   * Quality signature; requires the signing PIN.
   */
  async approveChangeRequest(
    id: string,
    pin: string,
    comment?: string,
  ): Promise<ChangeRequest> {
    return this.post<ChangeRequest>(
      `/change-requests/${encodeURIComponent(id)}/approve`,
      { pin, comment },
    );
  }

  /**
   * POST /change-requests/:id/reject
   */
  async rejectChangeRequest(
    id: string,
    reason: string,
  ): Promise<ChangeRequest> {
    return this.post<ChangeRequest>(
      `/change-requests/${encodeURIComponent(id)}/reject`,
      { reason },
    );
  }

  /**
   * GET /change-requests/:id/traceability
   * The request, its assessment, its signatures and what it produced.
   */
  async getChangeRequestTraceability(
    id: string,
  ): Promise<ChangeRequestTraceability> {
    return this.get<ChangeRequestTraceability>(
      `/change-requests/${encodeURIComponent(id)}/traceability`,
    );
  }

  // ============================================================================
  // APPROVAL WORKFLOWS (P1B)
  // ============================================================================

  /**
   * GET /approval-workflows
   * List available approval workflow definitions
   */
  async listApprovalWorkflows(): Promise<ApprovalWorkflowListResponse> {
    return this.get<ApprovalWorkflowListResponse>('/approval-workflows');
  }

  // ============================================================================
  // APPROVAL INSTANCES (P1B)
  // ============================================================================

  /**
   * GET /approvals/:id
   * Get approval instance details
   */
  async getApprovalInstance(id: string): Promise<ApprovalInstance> {
    return this.get<ApprovalInstance>(`/approvals/${id}`);
  }

  /**
   * POST /approvals/:id/steps/:stepId/approve
   * Approve an approval step
   */
  async approveStep(
    approvalId: string,
    stepId: string,
    req?: ApproveStepRequest,
  ): Promise<ApprovalInstance> {
    return this.post<ApprovalInstance>(
      `/approvals/${approvalId}/steps/${stepId}/approve`,
      req || {},
    );
  }

  /**
   * POST /approvals/:id/steps/:stepId/reject
   * Reject an approval step
   */
  async rejectStep(
    approvalId: string,
    stepId: string,
    req: RejectStepRequest,
  ): Promise<ApprovalInstance> {
    return this.post<ApprovalInstance>(
      `/approvals/${approvalId}/steps/${stepId}/reject`,
      req,
    );
  }

  /**
   * POST /approvals/:id/cancel
   * Cancel an in-progress approval workflow
   */
  async cancelApprovalInstance(
    approvalId: string,
    reason?: string,
  ): Promise<ApprovalInstance> {
    return this.post<ApprovalInstance>(
      `/approvals/${approvalId}/cancel`,
      { reason },
    );
  }

  // ============================================================================
  // AI REQUIREMENT SUGGESTIONS
  // ============================================================================

  /**
   * POST /requirement-sets/:id/generate-suggestions
   * Generate AI-powered requirement suggestions based on requirement set context
   */
  async generateRequirementSuggestions(
    setId: string,
  ): Promise<GeneratedRequirement[]> {
    const result = await this.post<{ suggestions: GeneratedRequirement[] }>(
      `/requirement-sets/${encodeURIComponent(setId)}/generate-suggestions`,
      {},
    );
    return result.suggestions;
  }

  // ============================================================================
  // QUALITY CHECKS
  // ============================================================================

  /**
   * POST /validate
   * Run quality checks on a single requirement draft payload.
   */
  async validateRequirement(
    req: QualityCheckRequest,
  ): Promise<QualityValidateResponse> {
    return this.post<QualityValidateResponse>('/validate', req);
  }

  /**
   * POST /requirement-sets/:id/validate
   * Run quality checks on all requirements in a set.
   */
  async validateRequirementSet(
    id: string,
  ): Promise<QualityValidateResponse> {
    return this.post<QualityValidateResponse>(
      `/requirement-sets/${encodeURIComponent(id)}/validate`,
      {},
    );
  }

  // ============================================================================
  // HEALTH
  // ============================================================================

  /**
   * GET /health
   * Health check
   */
  async health(): Promise<{ status: string; service: string; timestamp: string }> {
    return this.get('/health');
  }
}

/**
 * API reference for the URS Composer client.
 */
export const ursComposerApiRef = createApiRef<URSComposerApi>({
  id: 'plugin.urs-composer.api',
});
