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

/**
 * Status vocabulary, shared with the backend.
 *
 * This file used to declare its own URSStatus with six values while the
 * backend had ten, so a requirement that was REVIEWED, IN_APPROVAL, REJECTED
 * or OBSOLETE arrived here as a value the UI did not know. Re-exported rather
 * than imported directly so existing imports from './types' keep working.
 */
export {
  URSStatus,
  ChangeRequestStatus,
  ReviewScope,
  SignatureMeaning,
  SignatureTargetType,
  WorkflowStage,
  WorkflowState,
  URS_STATUS_LABELS,
  OPEN_URS_STATUSES,
  RELEASED_URS_STATUSES,
  ursStatusAppearance,
} from '@internal/platform-common';
export type { StatusAppearance } from '@internal/platform-common';

import {
  ChangeRequestStatus,
  ReviewScope,
  SignatureMeaning,
  SignatureTargetType,
  URSStatus,
  WorkflowStage,
  WorkflowState,
} from '@internal/platform-common';

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
// REQUIREMENT CLASSIFICATION (multi-dimensional)
// ============================================================================

export const COMPONENT_TYPES = [
  'INPUT_PORT',
  'PROCESSING',
  'DATA_STORAGE',
  'OUTPUT_PORT',
  'DISCOVERY_PORT',
  'DATA_CONTRACT',
  'GOVERNANCE',
  'DOCUMENTATION',
  'QUALITY_TESTING',
  'OBSERVABILITY',
  'CICD_DEPLOYMENT',
  'CROSS_CUTTING',
] as const;

export const REQUIREMENT_NATURES = [
  'FUNCTIONAL',
  'NON_FUNCTIONAL',
  'SECURITY',
  'COMPLIANCE',
  'DATA_QUALITY',
  'PERFORMANCE',
  'AVAILABILITY',
  'USABILITY',
  'MAINTAINABILITY',
  'OPERABILITY',
] as const;

export const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export interface RequirementClassification {
  componentType: string;
  secondaryTypes?: string[];
  requirementNature: string;
  criticality: string;
  interfaceType?: string;
  dataClassification?: string;
  validationLevel?: string;
  sourceSystem?: string;
  targetSystem?: string;
  automationReadiness?: string;
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

export interface BusinessRole {
  id: string;
  name: string;
  description?: string;
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
  /** Internal UUID of the predecessor set this version revises. */
  supersedesRef?: string;
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
  classification?: RequirementClassification;
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
  version?: string;
  title?: string;
  statement: string;
  rationale?: string;
  priority?: string;
  status: URSStatus;
  revision: number;
  supersededBy?: string;
  classification?: Record<string, unknown>;
  gxpRelevance?: string;
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
  status: ApprovalStatus | string;
  currentStepId?: string;
  steps: ApprovalStepInstance[];
  createdAt: string;
  createdBy: string;
  startedBy?: string;
  completedAt?: string;
}

export interface ApprovalStepInstance {
  id: string;
  sequence: number;
  role: string;
  status: ApprovalStatus | string;
  required?: boolean;
  assignedTo?: string;
  decision?: 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment?: string;
  actedBy?: string;
  actedAt?: string;
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

export interface CapabilityListResponse {
  items: BusinessCapability[];
  total: number;
}

export interface BusinessRoleListResponse {
  items: BusinessRole[];
  total: number;
}

export interface ApprovalWorkflowListResponse {
  items: ApprovalWorkflow[];
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
// WORKFLOW VIEW, SIGNATURES, CHANGE CONTROL
// ============================================================================

/** One stage of the derived workflow timeline. */
export interface WorkflowStep {
  stage: WorkflowStage;
  state: WorkflowState;
  actor?: string;
  timestamp?: string;
  comment?: string;
}

export interface WorkflowView {
  targetType: 'REQUIREMENT_VERSION' | 'BASELINE';
  targetId: string;
  status: URSStatus;
  steps: WorkflowStep[];
}

export interface Signature {
  id: string;
  targetType: SignatureTargetType;
  targetId: string;
  meaning: SignatureMeaning;
  signedBy: string;
  signedAt: string;
  contentHashAtSigning: string;
  comment?: string;
}

/** The PIN is the second factor and is never held beyond the request. */
export interface SignRequest {
  meaning: SignatureMeaning;
  pin: string;
  comment?: string;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  reason: string;
  affectedRequirementIds: string[];
  status: ChangeRequestStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
  revision: number;
}

export interface ImpactAssessment {
  id: string;
  changeRequestId: string;
  summary: string;
  gxpImpact: boolean;
  validationImpact: string;
  affectedVersionIds: string[];
  assessedBy: string;
  assessedAt: string;
}

export interface ChangeRequestTraceability {
  changeRequest: ChangeRequest;
  assessment: ImpactAssessment | null;
  signatures: Signature[];
  resultingVersions: RequirementVersion[];
  auditTrail: AuditEvent[];
}

export interface CreateChangeRequestRequest {
  title: string;
  description: string;
  reason: string;
  affectedRequirementIds?: string[];
}

export interface CreateImpactAssessmentRequest {
  summary: string;
  gxpImpact: boolean;
  validationImpact: string;
  affectedVersionIds?: string[];
}

/** One requirement version pinned by a baseline. */
export interface BaselineItem {
  requirementVersionId: string;
  reviewScope: ReviewScope;
  position: number;
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
  classification?: RequirementClassification;
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

// ============================================================================
// CHANGE SET — Delta between two URS Baselines
// ============================================================================

export type ChangeType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';

export interface ChangeSetRequirementVersion {
  id: string;
  requirementId: string;
  version: string;
  versionNumber: number;
  title: string;
  statement: string;
  rationale?: string;
  category?: string;
  priority?: RequirementPriority;
  acceptanceIntent?: string;
  classification?: RequirementClassification;
  gxpRelevance?: GxPRelevance;
  source?: string;
  owner?: string;
  status: URSStatus;
  revisionOf?: string;
  revisionReason?: string;
  supersededBy?: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  revision: number;
}

export interface RequirementChange {
  requirementId: string;
  changeType: ChangeType;
  previousVersion?: ChangeSetRequirementVersion;
  currentVersion?: ChangeSetRequirementVersion;
  changedFields?: string[];
}

export interface ChangeSetSummary {
  added: number;
  modified: number;
  removed: number;
  unchanged: number;
}

export interface ChangeSet {
  id: string;
  baselineId: string;
  previousBaselineId?: string;
  baselineVersion: string;
  previousBaselineVersion?: string;
  changes: RequirementChange[];
  summary: ChangeSetSummary;
  computedAt: string;
  computedBy: string;
}

// ============================================================================
// AI REQUIREMENT SUGGESTIONS
// ============================================================================

export interface GeneratedRequirementClassification {
  componentType: string;
  requirementNature: string;
  criticality: string;
  interfaceType?: string;
}

export interface GeneratedRequirement {
  title: string;
  statement: string;
  rationale: string;
  priority: string;
  classification: GeneratedRequirementClassification;
  gxpRelevance: string;
}
