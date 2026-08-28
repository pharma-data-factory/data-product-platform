/**
 * URS Composer Frontend API Types
 * 
 * Mirrors backend domain types but focused on frontend needs.
 * Maps P1B REST responses to typed frontend models.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum SolutionType {
  PROJECT = 'PROJECT',
  PLUGIN = 'PLUGIN',
  COMPONENT = 'COMPONENT',
  DATA_PRODUCT = 'DATA_PRODUCT',
}

export enum URSStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
  RETIRED = 'RETIRED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAIVED = 'WAIVED',
}

export enum GxPRelevance {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  NONE = 'NONE',
}

export enum RequirementPriority {
  MUST = 'MUST',
  SHOULD = 'SHOULD',
  COULD = 'COULD',
  WONT = 'WONT',
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface URSApiError {
  status: number;
  code?: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// DOMAIN MODELS
// ============================================================================

export interface BusinessCapability {
  id: string;
  name: string;
  description: string;
  domain: string;
  source: string;
  documentationRef?: string;
}

export interface RequirementSet {
  id: string;
  requirementSetId: string;
  versionNumber: number;
  businessCapabilityRefs: string[];
  businessNeed: string;
  desiredOutcome?: string;
  businessValue?: string;
  stakeholders?: string[];
  processContext?: string;
  solutionType: SolutionType;
  solutionName: string;
  solutionCatalogRef?: string;
  scope?: string;
  outOfScope?: string;
  gxpRelevance?: GxPRelevance;
  patientImpact?: boolean;
  dataIntegrityImpact?: boolean;
  electronicRecords?: boolean;
  status: URSStatus;
  templateVersion?: string;
  createdBy: string;
  createdAt: string; // ISO timestamp
  updatedBy?: string;
  updatedAt?: string;
  versionComment?: string;
}

export interface Requirement {
  id: string;
  requirementSetId: string;
  requirementId?: string;
  title: string;
  statement: string;
  rationale?: string;
  category?: string;
  priority?: RequirementPriority;
  acceptanceIntent?: string;
  gxpRelevance?: GxPRelevance;
  source?: string;
  owner?: string;
  status: URSStatus;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface RequirementVersion {
  id: string;
  requirementSetId: string;
  versionNumber: string;
  statement: string;
  status: URSStatus;
  revision: number;
  supersededBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface Baseline {
  id: string;
  requirementSetId: string;
  baselineVersion: string;
  status: URSStatus;
  requirementVersionIds: string[];
  revision: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  approvalInstanceId?: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: ApprovalStep[];
  isActive: boolean;
}

export interface ApprovalStep {
  id: string;
  sequenceNumber: number;
  role: string;
  title: string;
  description?: string;
}

export interface ApprovalInstance {
  id: string;
  baselineId: string;
  workflowId: string;
  status: ApprovalStatus;
  currentStepId?: string;
  steps: ApprovalStepInstance[];
  createdAt: string;
  createdBy: string;
  completedAt?: string;
}

export interface ApprovalStepInstance {
  id: string;
  stepId: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  comment?: string;
}

export interface ApprovalRecord {
  id: string;
  requirementSetId: string;
  approvalRole: string;
  status: ApprovalStatus;
  approver?: string;
  comment?: string;
  decidedAt?: string;
  sequenceNumber: number;
}

export interface RequirementSetListResponse {
  items: RequirementSet[];
  total: number;
}

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  actor: string;
  timestamp: string;
  reason?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateRequirementSetRequest {
  businessCapabilityRefs: string[];
  businessNeed: string;
  solutionType: SolutionType;
  solutionName: string;
  desiredOutcome?: string;
  businessValue?: string;
  stakeholders?: string[];
  processContext?: string;
  scope?: string;
  outOfScope?: string;
  gxpRelevance?: GxPRelevance;
  patientImpact?: boolean;
  dataIntegrityImpact?: boolean;
  electronicRecords?: boolean;
}

export interface CreateRequirementRequest {
  title?: string;
  statement: string;
  rationale?: string;
  category?: string;
  priority?: RequirementPriority;
  gxpRelevance?: GxPRelevance;
  acceptanceIntent?: string;
}

export interface CreateBaselineRequest {
  requirementSetId: string;
  baselineVersion: string;
  requirementVersionIds: string[];
}

export interface UpdateRequirementSetRequest extends Partial<CreateRequirementSetRequest> {
  requirements?: Array<
    Partial<CreateRequirementRequest> & {
      id?: string;
      requirementId?: string;
      title?: string;
      acceptanceIntent?: string;
    }
  >;
}

export interface CreateRevisionRequest {
  revisionReason: string;
}

export interface SubmitBaselineRequest {
  // No additional fields; ID comes from path
}

export interface ApproveStepRequest {
  comment?: string;
}

export interface RejectStepRequest {
  reason: string;
}
