import type {
  ApprovedURSReference,
  ValidationContext,
} from '@internal/platform-common';

/**
 * Validation protocol types.
 *
 * IQ/OQ/UAT are the standard GxP qualification protocols.
 * PQ (Performance Qualification) is optional — not every product needs it,
 * and the ImplementationPlan listed it as "optional PQ". Phase 5 (P5-S4)
 * adds it so validators are not forced to misclassify PQ runs as UAT.
 */
export type ProtocolType = 'IQ' | 'OQ' | 'UAT' | 'PQ';
export type ExecutionType =
  | 'AUTOMATED_API'
  | 'AUTOMATED_PLATFORM'
  | 'AUTOMATED_SECURITY'
  | 'MANUAL'
  | 'EXTERNAL';

export type TestStatus =
  | 'NOT_EXECUTED'
  | 'RUNNING'
  | 'PASS'
  | 'FAIL'
  | 'BLOCKED'
  | 'NOT_APPLICABLE_CURRENT_RELEASE';

export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ABORTED';

export type FindingStatus = 'OPEN' | 'REMEDIATED_PENDING_RETEST' | 'CLOSED';

export interface ExecutorIdentity {
  userEntityRef: string;
  displayName?: string;
  identityProvider?: string;
}

export interface ValidationRequirement {
  id: string;
  title: string;
  requirement: string;
  rationale?: string;
  riskLevel?: string;
  baselineState: string;
  implementation: string;
  verification: string;
  humanDecision?: string;
  rejected: boolean;
  risks: string[];
  formalTests: string[];
  sysId?: string;
  tdsId?: string;
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
  protocol: ProtocolType;
  requirementIds: string[];
  riskIds: string[];
  procedure?: string;
  expectedResult?: string;
  evidenceRequired?: string;
  preconditions?: string;
  status: TestStatus;
  executionType: ExecutionType;
  domain?: string;
}

export interface ValidationFinding {
  id: string;
  runId?: string;
  testId: string;
  severity: string;
  description: string;
  status: FindingStatus;
  requirementIds: string[];
  expectedResult?: string;
  actualResult?: string;
  source: 'artifact' | 'runtime';
}

export interface ValidationEvidenceItem {
  id: string;
  runId?: string;
  testId?: string;
  testExecutionId?: string;
  evidenceType: string;
  reference: string;
  checksum?: string;
  createdAt: string;
  createdBy?: string;
  candidate?: string;
  source: 'artifact' | 'runtime';
}

export interface ValidationTestExecution {
  id: string;
  runId: string;
  testId: string;
  type: ExecutionType;
  status: TestStatus;
  expectedResult?: string;
  actualResult?: string;
  comment?: string;
  executor?: ExecutorIdentity;
  startedAt?: string;
  completedAt?: string;
  findingId?: string;
  evidenceIds: string[];
}

export interface ValidationRun {
  id: string;
  candidate: string;
  candidateCommit?: string;
  baselineId: string;
  /** Optional Validation Context anchor (URS approved baseline handoff). */
  contextId?: string;
  type: ProtocolType;
  status: RunStatus;
  createdAt: string;
  createdBy: ExecutorIdentity;
  startedAt?: string;
  completedAt?: string;
  executions: ValidationTestExecution[];
}

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

export interface ValidationTestDefinition {
  id: string;
  title: string;
  protocol: ProtocolType;
  executionType: ExecutionType;
  expectedResult?: string;
  requirementIds: string[];
}

export interface ValidationRunContext {
  run: ValidationRun;
  validationRoot: string;
  healthBaseUrl?: string;
  executor: ExecutorIdentity;
}

export interface ValidationTestResult {
  status: TestStatus;
  actualResult: string;
  evidenceReferences?: string[];
  finding?: {
    severity: string;
    description: string;
    requirementIds: string[];
  };
}

export interface ValidationTestRunner {
  supports(test: ValidationTestDefinition): boolean;
  execute(
    test: ValidationTestDefinition,
    context: ValidationRunContext,
  ): Promise<ValidationTestResult>;
}

export interface CreateValidationContextRequest {
  requirementSetId: string;
  baselineId: string;
}

export type { ApprovedURSReference, ValidationContext };

