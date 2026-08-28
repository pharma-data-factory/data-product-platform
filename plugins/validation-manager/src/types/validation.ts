/**
 * Type Definitions for Validation Manager
 * GMP-Compliant Requirements Management
 */

/**
 * Core Requirement Type
 */
export interface Requirement {
  id: string;
  version: string;
  title: string;
  description: string;
  rationale: string;
  
  // GMP Assessment
  gxpRelevance: 'Direct' | 'Indirect' | 'Claim-control' | 'None';
  riskLevel: 'High' | 'Medium' | 'Low';
  businessCriticality: 'High' | 'Medium' | 'Low';
  
  // States & Status
  requirementState: 'BASELINED' | 'REJECTED' | 'OPEN_POLICY_DEFINITION';
  implementationStatus: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'NOT_IMPLEMENTED' | 'NOT_VERIFIED';
  verificationStatus: 'NOT_EXECUTED' | 'PASSED' | 'FAILED' | 'BLOCKED';
  
  // Change Management
  changeLog: ChangeLogEntry[];
  lastModified: string;
  lastModifiedBy: string;
  
  // Approvals & Signatures
  approvals: ApprovalRecord[];
  signature?: SignatureRecord;
  
  // Document Control
  documentMetadata: DocumentMetadata;
  
  // Audit
  auditTrail: AuditLogEntry[];
  
  // Links
  traceability?: {
    sysRequirements?: string[]; // Links to SYS-XXX
    testCases?: string[];       // Links to TEST-XXX
    designDocuments?: string[]; // Links to TDS-XXX
  };
}

/**
 * Change Log Entry
 */
export interface ChangeLogEntry {
  version: string;
  date: string;
  change: string;
  changeType: 'MAJOR' | 'MINOR' | 'PATCH';
  author: string;
  authorRole: string;
  changeControlForm?: string; // CC-001, CC-002, etc.
  reason: string;
}

/**
 * Approval Record
 */
export interface ApprovalRecord {
  id: string;
  reviewer?: string; // Email or User ID
  role: 'QA_LEAD' | 'VALIDATION_LEAD' | 'LEGAL' | 'SIGNATURE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date?: string; // ISO8601
  comment?: string;
  signature?: string; // Digital signature ID
}

/**
 * Digital Signature Record
 */
export interface SignatureRecord {
  id: string;
  status: 'PENDING' | 'SIGNED' | 'EXPIRED';
  certificateId?: string;
  timestamp?: string; // TSA timestamp
  validUntil?: string; // Signature validity period
  signedBy?: string;
  hash?: string; // SHA256 hash of document
  signatureValue?: string; // Base64 encoded signature
}

/**
 * Document Metadata
 */
export interface DocumentMetadata {
  documentId: string; // e.g., DOC-2026-URS-001
  createdDate: string; // ISO8601
  lastModifiedDate: string; // ISO8601
  lastModifiedBy: string;
  
  status: 'DRAFT' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'SIGNED' | 'ARCHIVED';
  
  // Retention & Lifecycle
  retentionPeriod: '3 years' | '7 years';
  retireDate?: string; // When to move to archive
  archiveUntilDate?: string; // When to delete
  
  // Access Control
  accessControl: string[]; // Array of authorized roles
  
  // Security
  encrypted: boolean;
  encryptionAlgorithm?: 'AES-256';
  hash?: string; // SHA256 for integrity
  
  // Backup & Recovery
  backupCount: number;
  backupLocations?: string[];
  lastBackupDate?: string;
  
  // Tags for filtering
  tags?: string[];
}

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO8601
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'ARCHIVE';
  actor: string; // User ID or service name
  role: string; // User role at time of action
  
  // What changed
  changes?: Record<string, { old: any; new: any }>;
  
  // How it happened
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Why it happened
  reason?: string;
  
  // Immutable marker
  immutable: boolean;
  verificationHash?: string; // For immutability verification
}

/**
 * GMP Assessment Form Data
 */
export interface GxPAssessment {
  requirementId: string;
  
  // GxP Questions
  isDirectGMP: boolean; // Direct GMP requirement?
  isIndirectGMP: boolean; // Indirect GMP requirement?
  isClaimControlled: boolean; // Part of a claim control?
  businessCriticalityLevel: 'High' | 'Medium' | 'Low';
  
  // Risk Assessment
  impactIfFails: string; // What breaks if this fails?
  riskLevel: 'High' | 'Medium' | 'Low';
  riskJustification: string;
  
  // Compliance Notes
  regulatoryReference?: string; // e.g., "21 CFR Part 11", "ISO 13485"
  complianceNotes: string;
  
  // Assessment Date & Person
  assessedDate: string;
  assessedBy: string;
}

/**
 * Change Control Form
 */
export interface ChangeControlForm {
  id: string; // CC-001, CC-002, etc.
  requirementId: string;
  
  changeType: 'MAJOR' | 'MINOR' | 'PATCH';
  description: string;
  justification: string;
  
  // Impact Assessment
  affectedAreas: string[];
  testingRequired: boolean;
  testingPlan?: string;
  
  // Approval
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  approvers: ApprovalRecord[];
  
  // Implementation
  implementationDate?: string;
  verificationDate?: string;
  verificationResults?: string;
  
  // Tracking
  createdDate: string;
  createdBy: string;
}

/**
 * Document Generation Request
 */
export interface DocumentGenerationRequest {
  documentType: 'URS' | 'TDS' | 'TRACEABILITY_MATRIX' | 'ALL';
  requirements: Requirement[];
  format: 'PDF' | 'MARKDOWN' | 'DOCX';
  includeSignatureBlock: boolean;
  includeApprovalChain: boolean;
  includeAuditTrail: boolean;
}

/**
 * Document Generation Result
 */
export interface DocumentGenerationResult {
  documentId: string;
  documentType: string;
  version: string;
  format: string;
  filename: string;
  content?: string; // Markdown content
  hash: string; // SHA256 for integrity
  generatedDate: string;
  generatedBy: string;
  fileSize?: number;
}

/**
 * Approval Workflow State
 */
export interface ApprovalWorkflow {
  requirementId: string;
  version: string;
  
  // Current state
  currentStep: number; // 1-4
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  
  // History
  steps: ApprovalRecord[];
  
  // Timeline
  startedDate: string;
  completedDate?: string;
  estimatedCompletionDate: string;
  
  // DMS Integration
  dmsDocumentId?: string;
}

/**
 * Validation Dashboard Stats
 */
export interface DashboardStats {
  totalRequirements: number;
  
  byState: {
    baselined: number;
    rejected: number;
    openPolicyDefinition: number;
  };
  
  byGxP: {
    direct: number;
    indirect: number;
    claimControl: number;
    none: number;
  };
  
  byRisk: {
    high: number;
    medium: number;
    low: number;
  };
  
  byApprovalStatus: {
    approved: number;
    pending: number;
    rejected: number;
  };
  
  bySignatureStatus: {
    signed: number;
    unsigned: number;
  };
  
  recentChanges: ChangeLogEntry[];
  pendingApprovals: ApprovalRecord[];
}

/**
 * Filter Options
 */
export interface FilterOptions {
  gxpRelevance?: string[];
  riskLevel?: string[];
  requirementState?: string[];
  implementationStatus?: string[];
  approvalStatus?: string[];
  signatureStatus?: string[];
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

/**
 * User Permissions
 */
export interface UserPermissions {
  userId: string;
  role: 'QA_LEAD' | 'VALIDATION_LEAD' | 'LEGAL' | 'DEVELOPER' | 'PLATFORM_ADMIN';
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canApprove: boolean;
    canSign: boolean;
    canArchive: boolean;
    canExport: boolean;
    canViewAuditTrail: boolean;
    canViewSignatures: boolean;
  };
}

/**
 * DMS Integration
 */
export interface DMSIntegration {
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  documentFolderPath?: string;
  archiveFolderPath?: string;
  requiresSignature: boolean;
}

/**
 * Signature Service Config
 */
export interface SignatureServiceConfig {
  enabled: boolean;
  provider?: 'INTERNAL' | 'EXTERNAL_TSA';
  certificateFile?: string;
  privateKeyFile?: string;
  timestampAuthority?: string;
  validityPeriodDays?: number;
}
