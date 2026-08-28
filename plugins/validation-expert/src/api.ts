import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

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

export interface ValidationRun {
  id: string;
  candidate: string;
  type: string;
  status: string;
  createdAt: string;
  createdBy: { userEntityRef: string; displayName?: string; identityProvider?: string };
  startedAt?: string;
  completedAt?: string;
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
  listRuns(): Promise<ValidationRun[]>;
  getRun(runId: string): Promise<ValidationRun>;
  createRun(candidate: string, type: 'IQ' | 'OQ' | 'UAT'): Promise<{ runId: string; status: string; run: ValidationRun }>;
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

  async listRuns() {
    const data = await this.json<{ items: ValidationRun[] }>('/runs');
    return data.items;
  }

  getRun(runId: string) {
    return this.json<ValidationRun>(`/runs/${encodeURIComponent(runId)}`);
  }

  createRun(candidate: string, type: 'IQ' | 'OQ' | 'UAT') {
    return this.json<{ runId: string; status: string; run: ValidationRun }>('/runs', {
      method: 'POST',
      body: JSON.stringify({ candidate, type }),
    });
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
}
