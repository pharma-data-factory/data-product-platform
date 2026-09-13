import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type {
  AssignProductRequest,
  ValidationContextAuditEvent,
  ValidationContextProductRef,
  ValidationContextStatus,
} from '@internal/platform-common';

export interface ValidationOverview {
  product: string;
  candidate: string;
  candidateTag: string;
  baselineId: string;
  validationStatus: string;
  part11Status: string;
  gxpStatus: string;
  requirementsBaselined: { active: number; total: number };
  traceabilityPlanned: { covered: number; total: number };
  iqStatus: string;
  oqStatus: string;
  uatStatus: string;
  openRisks: number;
  openFindings: number;
  evidenceCount: number;
  notes: string[];
}

export interface ValidationRequirement {
  id: string;
  title: string;
  requirement: string;
  baselineState: string;
  implementation: string;
  verification: string;
  rejected: boolean;
  risks: string[];
  formalTests: string[];
  sysId?: string;
  tdsId?: string;
  rationale?: string;
  riskLevel?: string;
}

export interface TraceabilityRow {
  ursId: string;
  sysId: string;
  tdsId: string;
  risks: string[];
  formalTests: string[];
  evidence: string;
  notes?: string;
  gaps: string[];
}

export interface ValidationRisk {
  id: string;
  title: string;
  description: string;
  severity?: string;
  relatedRequirements: string[];
  controls?: string;
  formalTests: string[];
  status: string;
}

export interface ProtocolTest {
  id: string;
  title: string;
  protocol: string;
  requirementIds: string[];
  riskIds: string[];
  procedure?: string;
  expectedResult?: string;
  evidenceRequired?: string;
  status: string;
  executionType: string;
  domain?: string;
}

export interface ProtocolResponse {
  type: string;
  total: number;
  ready: number;
  manual: number;
  external: number;
  automated: number;
  tests: ProtocolTest[];
}

/** URS → Validation integration: a context anchored to an approved URS baseline. */
export interface ValidationContext {
  id: string;
  status: ValidationContextStatus;
  summary?: string;
  createdAt: string;
  createdBy?: string;
  source: {
    requirementSetId: string;
    requirementSetTitle?: string;
    requirementSetName?: string;
    baselineId: string;
    baselineVersion: string;
    businessCapabilityIds: string[];
    approvalStatus: string;
    approvedAt?: string;
    approvedBy?: string;
    sourceSystem: string;
    requirementIds: string[];
    createdAt?: string;
  };
  /** Product Composer solution assignment (product + version + baseline). */
  productRef?: ValidationContextProductRef;
}

export interface ValidationContextRequirement {
  requirementId: string;
  requirementVersionId?: string;
  title: string;
  statement: string;
  status?: string;
  priority?: string;
  rationale?: string;
  changeType?: string;
}

export interface ValidationContextRequirementsResponse {
  contextId: string;
  baselineId: string;
  baselineVersion: string;
  requirementSetId: string;
  items: ValidationContextRequirement[];
  source: string;
  note: string;
}

export interface ContextCoverageRow {
  requirementId: string;
  status: 'covered' | 'uncovered' | 'extra';
  testIds: string[];
  runIds: string[];
  findingIds: string[];
}

/** Traceability-lite join of context requirements to run executions/findings. */
export interface ContextCoverage {
  contextId: string;
  expected: string[];
  covered: string[];
  uncovered: string[];
  extra: string[];
  byRequirement: ContextCoverageRow[];
  note: string;
}

export interface ValidationRun {
  id: string;
  candidate: string;
  type: string;
  status: string;
  createdAt: string;
  createdBy: { userEntityRef: string; displayName?: string; identityProvider?: string };
  startedAt?: string;
  completedAt?: string;
  baselineId?: string;
  contextId?: string;
  /** Immutable traceability snapshot of the assigned product solution. */
  productId?: string;
  productVersionId?: string;
  productBaselineId?: string;
  executions: Array<{
    id: string;
    testId: string;
    status: string;
    type: string;
    actualResult?: string;
    executor?: { userEntityRef: string };
    findingId?: string;
  }>;
}

export interface ValidationExpertApi {
  getOverview(): Promise<ValidationOverview>;
  getRequirements(): Promise<ValidationRequirement[]>;
  getRequirement(id: string): Promise<{ item: ValidationRequirement; trace?: TraceabilityRow }>;
  getTraceability(): Promise<TraceabilityRow[]>;
  getRisks(): Promise<ValidationRisk[]>;
  getProtocol(type: 'IQ' | 'OQ' | 'UAT'): Promise<ProtocolResponse>;
  listRuns(contextId?: string): Promise<ValidationRun[]>;
  getRun(runId: string): Promise<ValidationRun>;
  createRun(
    type: 'IQ' | 'OQ' | 'UAT',
    options: { contextId: string },
  ): Promise<{ runId: string; status: string; run: ValidationRun }>;
  getContextRuns(contextId: string): Promise<ValidationRun[]>;
  getContextCoverage(contextId: string): Promise<ContextCoverage>;
  executeAutomated(runId: string): Promise<ValidationRun>;
  startTest(runId: string, testId: string): Promise<unknown>;
  recordResult(
    runId: string,
    testId: string,
    body: {
      status: 'PASS' | 'FAIL' | 'BLOCKED';
      actualResult: string;
      comment?: string;
      evidenceReference?: string;
    },
  ): Promise<unknown>;
  getFindings(): Promise<unknown[]>;
  getEvidence(): Promise<unknown[]>;
  /** URS → Validation integration: list validation contexts anchored to approved URS baselines. */
  getContexts(): Promise<ValidationContext[]>;
  getContext(id: string): Promise<ValidationContext>;
  getContextRequirements(
    contextId: string,
  ): Promise<ValidationContextRequirementsResponse>;
  /** Product/version gating: assign a Product Composer solution to a context. */
  assignProduct(
    contextId: string,
    request: AssignProductRequest,
  ): Promise<{ context: ValidationContext; created: boolean }>;
  removeProduct(
    contextId: string,
  ): Promise<{ context: ValidationContext }>;
  submitReview(contextId: string): Promise<{ context: ValidationContext }>;
  approveContext(contextId: string): Promise<{ context: ValidationContext }>;
  rejectContext(contextId: string): Promise<{ context: ValidationContext }>;
  getContextAudit(contextId: string): Promise<ValidationContextAuditEvent[]>;
}

export const validationExpertApiRef = createApiRef<ValidationExpertApi>({
  id: 'plugin.validation-expert.service',
});

export class ValidationExpertClient implements ValidationExpertApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  private async baseUrl() {
    return this.options.discoveryApi.getBaseUrl('validation-expert');
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = await this.baseUrl();
    const response = await this.options.fetchApi.fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
    }
    return response.json();
  }

  getOverview() {
    return this.json<ValidationOverview>('/overview');
  }

  async getRequirements() {
    const data = await this.json<{ items: ValidationRequirement[] }>('/requirements');
    return data.items;
  }

  getRequirement(id: string) {
    return this.json<{ item: ValidationRequirement; trace?: TraceabilityRow }>(
      `/requirements/${encodeURIComponent(id)}`,
    );
  }

  async getTraceability() {
    const data = await this.json<{ items: TraceabilityRow[] }>('/traceability');
    return data.items;
  }

  async getRisks() {
    const data = await this.json<{ items: ValidationRisk[] }>('/risks');
    return data.items;
  }

  getProtocol(type: 'IQ' | 'OQ' | 'UAT') {
    return this.json<ProtocolResponse>(`/protocols/${type}`);
  }

  async listRuns(contextId?: string) {
    const query = contextId
      ? `?contextId=${encodeURIComponent(contextId)}`
      : '';
    const data = await this.json<{ items: ValidationRun[] }>(`/runs${query}`);
    return data.items;
  }

  getRun(runId: string) {
    return this.json<ValidationRun>(`/runs/${encodeURIComponent(runId)}`);
  }

  createRun(
    type: 'IQ' | 'OQ' | 'UAT',
    options: { contextId: string },
  ) {
    return this.json<{ runId: string; status: string; run: ValidationRun }>('/runs', {
      method: 'POST',
      body: JSON.stringify({ type, contextId: options.contextId }),
    });
  }

  async getContextRuns(contextId: string) {
    const data = await this.json<{ items: ValidationRun[] }>(
      `/contexts/${encodeURIComponent(contextId)}/runs`,
    );
    return data.items;
  }

  getContextCoverage(contextId: string): Promise<ContextCoverage> {
    return this.json<ContextCoverage>(
      `/contexts/${encodeURIComponent(contextId)}/coverage`,
    );
  }

  executeAutomated(runId: string) {
    return this.json<ValidationRun>(
      `/runs/${encodeURIComponent(runId)}/execute-automated`,
      { method: 'POST', body: '{}' },
    );
  }

  startTest(runId: string, testId: string) {
    return this.json(
      `/runs/${encodeURIComponent(runId)}/tests/${encodeURIComponent(testId)}/start`,
      { method: 'POST', body: '{}' },
    );
  }

  recordResult(
    runId: string,
    testId: string,
    body: {
      status: 'PASS' | 'FAIL' | 'BLOCKED';
      actualResult: string;
      comment?: string;
      evidenceReference?: string;
    },
  ) {
    return this.json(
      `/runs/${encodeURIComponent(runId)}/tests/${encodeURIComponent(testId)}/result`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async getFindings() {
    const data = await this.json<{ items: unknown[] }>('/findings');
    return data.items;
  }

  async getEvidence() {
    const data = await this.json<{ items: unknown[] }>('/evidence');
    return data.items;
  }

  async getContexts(): Promise<ValidationContext[]> {
    const data = await this.json<{ items: ValidationContext[] }>('/contexts');
    return data.items;
  }

  getContext(id: string): Promise<ValidationContext> {
    return this.json<ValidationContext>(`/contexts/${encodeURIComponent(id)}`);
  }

  getContextRequirements(
    contextId: string,
  ): Promise<ValidationContextRequirementsResponse> {
    return this.json<ValidationContextRequirementsResponse>(
      `/contexts/${encodeURIComponent(contextId)}/requirements`,
    );
  }

  assignProduct(
    contextId: string,
    request: AssignProductRequest,
  ): Promise<{ context: ValidationContext; created: boolean }> {
    return this.json(
      `/contexts/${encodeURIComponent(contextId)}/assign-product`,
      { method: 'POST', body: JSON.stringify(request) },
    );
  }

  removeProduct(contextId: string): Promise<{ context: ValidationContext }> {
    return this.json(
      `/contexts/${encodeURIComponent(contextId)}/remove-product`,
      { method: 'POST', body: '{}' },
    );
  }

  submitReview(contextId: string): Promise<{ context: ValidationContext }> {
    return this.json(
      `/contexts/${encodeURIComponent(contextId)}/submit-review`,
      { method: 'POST', body: '{}' },
    );
  }

  approveContext(contextId: string): Promise<{ context: ValidationContext }> {
    return this.json(
      `/contexts/${encodeURIComponent(contextId)}/approve`,
      { method: 'POST', body: '{}' },
    );
  }

  rejectContext(contextId: string): Promise<{ context: ValidationContext }> {
    return this.json(
      `/contexts/${encodeURIComponent(contextId)}/reject`,
      { method: 'POST', body: '{}' },
    );
  }

  async getContextAudit(
    contextId: string,
  ): Promise<ValidationContextAuditEvent[]> {
    const data = await this.json<{ items: ValidationContextAuditEvent[] }>(
      `/contexts/${encodeURIComponent(contextId)}/audit`,
    );
    return data.items;
  }
}
