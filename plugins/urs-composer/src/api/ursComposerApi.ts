/**
 * URS Composer API Client
 * 
 * Centralized typed client for all P1B REST API communication.
 * Handles error mapping, request/response transformation.
 * Single point of integration between URS UI and backend.
 */

import {
  URSApiError,
  BusinessCapability,
  RequirementSet,
  Requirement,
  RequirementVersion,
  Baseline,
  ApprovalWorkflow,
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
  ApprovalRecord,
} from './types';

export type { URSApiError };

/**
 * Configuration for API client
 */
interface ApiClientConfig {
  baseUrl?: string;
}

/**
 * URS Composer API Client
 * 
 * All methods:
 * - Return typed responses
 * - Throw URSApiError on failure
 * - Map HTTP error codes to consistent error interface
 */
export class URSComposerApi {
  private baseUrl: string;

  constructor(config?: ApiClientConfig) {
    // Use relative path; Backstage will handle proxying
    this.baseUrl = config?.baseUrl || '/api/urs-composer';
  }

  /**
   * Helper: Make HTTP request with error handling
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

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

  // ============================================================================
  // BUSINESS CAPABILITIES (P0)
  // ============================================================================

  /**
   * GET /capabilities
   * List all business capabilities
   */
  async listCapabilities(): Promise<BusinessCapability[]> {
    return this.get<BusinessCapability[]>('/capabilities');
  }

  /**
   * GET /capabilities/:id
   * Get a specific business capability
   */
  async getCapability(id: string): Promise<BusinessCapability> {
    return this.get<BusinessCapability>(`/capabilities/${id}`);
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
   * POST /requirement-sets/:id/submit
   */
  async submitRequirementSet(id: string, reason?: string): Promise<RequirementSet> {
    return this.post<RequirementSet>(`/requirement-sets/${id}/submit`, { reason });
  }

  /**
   * POST /requirement-sets/:id/approve
   */
  async approveRequirementSet(id: string): Promise<RequirementSet> {
    return this.post<RequirementSet>(`/requirement-sets/${id}/approve`, {});
  }

  /**
   * POST /requirement-sets/:id/reject
   */
  async rejectRequirementSet(id: string, reason: string): Promise<RequirementSet> {
    return this.post<RequirementSet>(`/requirement-sets/${id}/reject`, { reason });
  }

  /**
   * GET /requirement-sets/:id/approvals
   */
  async getApprovals(id: string): Promise<ApprovalRecord[]> {
    return this.get<ApprovalRecord[]>(`/requirement-sets/${id}/approvals`);
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
    const url = `/api/validation-expert/contexts/from-urs`;
    const response = await fetch(url, {
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
    return this.get<Baseline[]>(`/requirement-sets/${setId}/baselines`);
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

  // ============================================================================
  // APPROVAL WORKFLOWS (P1B)
  // ============================================================================

  /**
   * GET /approval-workflows
   * List available approval workflow definitions
   */
  async listApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
    return this.get<ApprovalWorkflow[]>('/approval-workflows');
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
 * Singleton instance
 */
export const ursComposerApi = new URSComposerApi();
