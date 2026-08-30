/**
 * Admin Models — roles, users, configuration
 * Defines roles, permissions, and user management
 */

/**
 * System Roles
 */
export interface SystemRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // System roles cannot be deleted
  createdDate: string;
  lastModifiedDate: string;
}

/**
 * Permission Definition
 */
export interface Permission {
  id: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'EXPORT' | 'ADMIN';
  resource: 'REQUIREMENT' | 'DOCUMENT' | 'APPROVAL' | 'SIGNATURE' | 'AUDIT' | 'ADMIN';
  scope: 'OWN' | 'DEPARTMENT' | 'ALL'; // Own = created by user, Department = same team, All = global
  description: string;
}

/**
 * System User
 */
export interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Refs SystemRole.id
  department: string;
  isActive: boolean;
  createdDate: string;
  lastModifiedDate: string;
  lastLoginDate?: string;
}

/**
 * Approval Configuration
 */
export interface ApprovalConfig {
  requirementId: string;
  approvalChainOrder: ApprovalStep[];
  timelineExpected: number; // Days to complete approval
  notificationEnabled: boolean;
  escalationEnabled: boolean;
  escalationDays: number;
}

/**
 * Approval Step (Sequential)
 */
export interface ApprovalStep {
  sequence: number; // 1, 2, 3, 4
  role: 'QA_LEAD' | 'VALIDATION_LEAD' | 'LEGAL' | 'SIGNATURE';
  description: string;
  canReject: boolean;
  timeoutDays?: number; // Auto-escalate if not approved
  notifyWhen: 'START' | 'PENDING_LONG' | 'COMPLETION';
}

/**
 * Approval Event (for State Machine)
 */
export interface ApprovalEvent {
  id: string;
  requirementId: string;
  event: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'REASSIGN' | 'TIMEOUT';
  fromRole: string;
  fromUser: string;
  timestamp: string;
  comment?: string;
  changes?: Record<string, any>;
}

/**
 * Approval Workflow State (for State Machine)
 */
export interface ApprovalWorkflowState {
  requirementId: string;
  currentStep: number; // 1-4
  currentState: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'COMPLETED';
  history: ApprovalEvent[];
  startedDate: string;
  completedDate?: string;
  expectedCompletionDate: string;
}

/**
 * Document Export Configuration
 */
export interface DocumentExportConfig {
  enabled: boolean;
  exportFolder: string; // e.g. /archive/approved-documents
  filenamingPattern: string; // {DocumentType}-v{version}-{date}
  includeMetadata: boolean;
  includeAuditTrail: boolean;
  includeApprovalChain: boolean;
  compression: 'NONE' | 'ZIP' | 'GZIP';
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256' | 'AES-128';
  };
}

/**
 * Exported Document Metadata
 */
export interface ExportedDocument {
  id: string;
  requirementId: string;
  documentType: 'URS' | 'TDS' | 'TRACEABILITY';
  version: string;
  filename: string;
  filepath: string;
  filesize: number;
  exportDate: string;
  exportedBy: string;
  hash: string;
  approvalState: 'APPROVED' | 'SIGNED' | 'ARCHIVED';
  expiryDate?: string;
  compressionMethod: string;
  encryptionEnabled: boolean;
}

/**
 * Default System Roles Configuration
 */
export const DEFAULT_ROLES: SystemRole[] = [
  {
    id: 'QA_LEAD',
    name: 'QA Lead',
    description: 'Quality Assurance Lead - Creates and reviews requirements',
    isSystem: true,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    permissions: [
      {
        id: 'qs-create',
        action: 'CREATE',
        resource: 'REQUIREMENT',
        scope: 'OWN',
        description: 'Create new requirements',
      },
      {
        id: 'req-read',
        action: 'READ',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Read all requirements',
      },
      {
        id: 'req-update',
        action: 'UPDATE',
        resource: 'REQUIREMENT',
        scope: 'OWN',
        description: 'Update own requirements (before approval)',
      },
      {
        id: 'req-approve-qa',
        action: 'APPROVE',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Approve requirements as QA',
      },
      {
        id: 'req-reject',
        action: 'REJECT',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Reject requirements',
      },
      {
        id: 'doc-export',
        action: 'EXPORT',
        resource: 'DOCUMENT',
        scope: 'ALL',
        description: 'Export approved documents',
      },
    ],
  },

  {
    id: 'VALIDATION_LEAD',
    name: 'Validation Lead',
    description: 'Validation Manager - Reviews testability and verification',
    isSystem: true,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    permissions: [
      {
        id: 'req-read',
        action: 'READ',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Read all requirements',
      },
      {
        id: 'req-approve-val',
        action: 'APPROVE',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Approve requirements as Validation',
      },
      {
        id: 'req-reject',
        action: 'REJECT',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Reject requirements',
      },
      {
        id: 'doc-export',
        action: 'EXPORT',
        resource: 'DOCUMENT',
        scope: 'ALL',
        description: 'Export approved documents',
      },
    ],
  },

  {
    id: 'LEGAL',
    name: 'Legal/Compliance',
    description: 'Legal Team - Reviews regulatory compliance',
    isSystem: true,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    permissions: [
      {
        id: 'req-read',
        action: 'READ',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Read all requirements',
      },
      {
        id: 'req-approve-legal',
        action: 'APPROVE',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Approve requirements as Legal',
      },
      {
        id: 'req-reject',
        action: 'REJECT',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Reject requirements',
      },
    ],
  },

  {
    id: 'SIGNATURE',
    name: 'Document Authority',
    description: 'Authorized Signatory - Applies digital signatures',
    isSystem: true,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    permissions: [
      {
        id: 'req-read',
        action: 'READ',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Read all requirements',
      },
      {
        id: 'req-sign',
        action: 'SIGN',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Apply digital signature',
      },
      {
        id: 'doc-export',
        action: 'EXPORT',
        resource: 'DOCUMENT',
        scope: 'ALL',
        description: 'Export signed documents',
      },
      {
        id: 'doc-archive',
        action: 'UPDATE',
        resource: 'DOCUMENT',
        scope: 'ALL',
        description: 'Archive documents',
      },
    ],
  },

  {
    id: 'PLATFORM_ADMIN',
    name: 'Platform Administrator',
    description: 'System Administrator - Full access, configuration, override',
    isSystem: true,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    permissions: [
      {
        id: 'admin-all',
        action: 'ADMIN',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Full administrative access',
      },
      {
        id: 'admin-override',
        action: 'ADMIN',
        resource: 'APPROVAL',
        scope: 'ALL',
        description: 'Override approval workflows',
      },
      {
        id: 'admin-audit',
        action: 'READ',
        resource: 'AUDIT',
        scope: 'ALL',
        description: 'View audit trails',
      },
    ],
  },

  {
    id: 'DEVELOPER',
    name: 'Developer',
    description: 'Platform Developer - Read approved/signed requirements only',
    isSystem: true,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    permissions: [
      {
        id: 'req-read-approved',
        action: 'READ',
        resource: 'REQUIREMENT',
        scope: 'ALL',
        description: 'Read approved and signed requirements',
      },
      {
        id: 'doc-export-approved',
        action: 'EXPORT',
        resource: 'DOCUMENT',
        scope: 'ALL',
        description: 'Export approved documents',
      },
    ],
  },
];

/**
 * Default Approval Chain Configuration
 */
export const DEFAULT_APPROVAL_CHAIN: ApprovalStep[] = [
  {
    sequence: 1,
    role: 'QA_LEAD',
    description: 'Quality Assurance Review',
    canReject: true,
    timeoutDays: 5,
    notifyWhen: 'START',
  },
  {
    sequence: 2,
    role: 'VALIDATION_LEAD',
    description: 'Validation Review',
    canReject: true,
    timeoutDays: 5,
    notifyWhen: 'START',
  },
  {
    sequence: 3,
    role: 'LEGAL',
    description: 'Legal/Compliance Review',
    canReject: true,
    timeoutDays: 5,
    notifyWhen: 'START',
  },
  {
    sequence: 4,
    role: 'SIGNATURE',
    description: 'Digital Signature & Lock',
    canReject: false,
    notifyWhen: 'COMPLETION',
  },
];
