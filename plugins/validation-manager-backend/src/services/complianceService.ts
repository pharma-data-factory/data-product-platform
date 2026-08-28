/**
 * GMP Compliance Service
 * Enforces pharma validation rules
 */

import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';

export interface Requirement {
  id: string;
  version: string;
  title: string;
  description: string;
  rationale: string;
  gxpRelevance: 'Direct' | 'Indirect' | 'Claim-control' | 'None';
  riskLevel: 'High' | 'Medium' | 'Low';
  requirementState: 'BASELINED' | 'REJECTED' | 'OPEN_POLICY_DEFINITION';
  implementationStatus: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'NOT_IMPLEMENTED' | 'NOT_VERIFIED';
  verificationStatus: 'NOT_EXECUTED' | 'PASSED' | 'FAILED' | 'BLOCKED';
  changeLog: ChangeLogEntry[];
  approvals: ApprovalRecord[];
  signature?: SignatureRecord;
  documentMetadata: DocumentMetadata;
  auditTrail: AuditLogEntry[];
}

export interface ChangeLogEntry {
  version: string;
  date: string;
  change: string;
  changeType: 'MAJOR' | 'MINOR' | 'PATCH';
  author: string;
  changeControlForm?: string; // CC-001, CC-002, etc.
}

export interface ApprovalRecord {
  reviewer: string;
  role: 'QA_LEAD' | 'VALIDATION_LEAD' | 'LEGAL' | 'SIGNATURE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date?: string;
  comment?: string;
}

export interface SignatureRecord {
  status: 'PENDING' | 'SIGNED' | 'EXPIRED';
  certificateId?: string;
  timestamp?: string;
  validUntil?: string;
  signedBy?: string;
  hash?: string;
}

export interface DocumentMetadata {
  documentId: string;
  createdDate: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  status: 'DRAFT' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'SIGNED' | 'ARCHIVED';
  retentionPeriod: '3 years' | '7 years';
  accessControl: string[];
  encrypted: boolean;
  backupCount: number;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  actor: string;
  role: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
}

export class ComplianceService {
  /**
   * GMP RULE 1: Versioning Rules
   * Every change to a requirement must trigger a version update
   */
  getNextVersion(currentVersion: string, changeType: 'MAJOR' | 'MINOR' | 'PATCH'): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    switch (changeType) {
      case 'MAJOR':
        return `${major + 1}.0.0`;
      case 'MINOR':
        return `${major}.${minor + 1}.0`;
      case 'PATCH':
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * GMP RULE 2: Change Control Rules
   * MAJOR changes require Change Control Form (CC-001, CC-002, etc.)
   * MINOR changes require QA approval
   * PATCH changes are auto-approved
   */
  getRequiredChangeControl(
    oldReq: Requirement,
    newReq: Requirement
  ): {
    changeType: 'MAJOR' | 'MINOR' | 'PATCH';
    requiresCC: boolean;
    requiresApproval: boolean;
    affectedAreas: string[];
  } {
    const changes: string[] = [];

    if (oldReq.gxpRelevance !== newReq.gxpRelevance) changes.push('GxP Relevance');
    if (oldReq.riskLevel !== newReq.riskLevel) changes.push('Risk Level');
    if (oldReq.description !== newReq.description) changes.push('Description');
    if (oldReq.rationale !== newReq.rationale) changes.push('Rationale');
    if (oldReq.requirementState !== newReq.requirementState) changes.push('Requirement State');

    let changeType: 'MAJOR' | 'MINOR' | 'PATCH' = 'PATCH';
    if (changes.includes('GxP Relevance') || changes.includes('Risk Level')) {
      changeType = 'MAJOR';
    } else if (changes.length > 0) {
      changeType = 'MINOR';
    }

    return {
      changeType,
      requiresCC: changeType === 'MAJOR',
      requiresApproval: changeType !== 'PATCH',
      affectedAreas: changes,
    };
  }

  /**
   * GMP RULE 3: Approval Chain
   * QA → Validation → Legal → Signature
   */
  getApprovalChain(): ApprovalRecord[] {
    return [
      { reviewer: '', role: 'QA_LEAD', status: 'PENDING' },
      { reviewer: '', role: 'VALIDATION_LEAD', status: 'PENDING' },
      { reviewer: '', role: 'LEGAL', status: 'PENDING' },
      { reviewer: '', role: 'SIGNATURE', status: 'PENDING' },
    ];
  }

  isApprovalChainComplete(approvals: ApprovalRecord[]): boolean {
    return approvals.every(a => a.status === 'APPROVED' || a.status === 'REJECTED');
  }

  canApprove(requirement: Requirement, userRole: string): boolean {
    const approval = requirement.approvals.find(a => a.role === userRole);
    return approval?.status === 'PENDING' ?? false;
  }

  /**
   * GMP RULE 4: Digital Signature
   * When all approvals are done, document must be signed
   */
  requiresSignature(requirement: Requirement): boolean {
    return (
      this.isApprovalChainComplete(requirement.approvals) &&
      requirement.signature?.status === 'PENDING'
    );
  }

  /**
   * GMP RULE 5: Document Locking
   * Once signed, document becomes immutable (read-only)
   */
  isDocumentLocked(requirement: Requirement): boolean {
    return requirement.signature?.status === 'SIGNED';
  }

  canEditRequirement(requirement: Requirement, userRole: string): boolean {
    if (this.isDocumentLocked(requirement)) {
      return false; // Locked documents cannot be edited
    }

    if (requirement.documentMetadata.status === 'ARCHIVED') {
      return false; // Archived documents cannot be edited
    }

    // Only QA and Admins can edit
    return ['QA_LEAD', 'PLATFORM_ADMIN'].includes(userRole);
  }

  /**
   * GMP RULE 6: Audit Trail
   * Every action must be logged with timestamp, actor, and changes
   */
  createAuditLogEntry(
    action: string,
    actor: string,
    role: string,
    changes?: Record<string, { old: any; new: any }>,
    ipAddress?: string,
    userAgent?: string
  ): AuditLogEntry {
    return {
      timestamp: new Date().toISOString(),
      action,
      actor,
      role,
      changes,
      ipAddress,
      userAgent,
    };
  }

  /**
   * GMP RULE 7: Document Integrity (Hash)
   * Calculate SHA256 hash for document integrity verification
   */
  calculateDocumentHash(requirement: Requirement): string {
    const content = JSON.stringify({
      id: requirement.id,
      title: requirement.title,
      description: requirement.description,
      rationale: requirement.rationale,
      gxpRelevance: requirement.gxpRelevance,
      riskLevel: requirement.riskLevel,
      version: requirement.version,
    });

    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * GMP RULE 8: Document Retention & Archiving
   * Active: 3 years
   * Archive: 7 years
   */
  getRetentionPolicy(requirement: Requirement): {
    activeRetentionYears: number;
    archiveRetentionYears: number;
    retireDate: string;
    archiveUntilDate: string;
  } {
    const createdDate = new Date(requirement.documentMetadata.createdDate);
    const retireDate = new Date(createdDate);
    retireDate.setFullYear(retireDate.getFullYear() + 3);

    const archiveUntilDate = new Date(createdDate);
    archiveUntilDate.setFullYear(archiveUntilDate.getFullYear() + 7);

    return {
      activeRetentionYears: 3,
      archiveRetentionYears: 7,
      retireDate: retireDate.toISOString(),
      archiveUntilDate: archiveUntilDate.toISOString(),
    };
  }

  /**
   * GMP RULE 9: Traceability Matrix Requirements
   * Every URS must map to SYS → TDS → Tests
   */
  validateTraceability(requirement: Requirement): {
    isComplete: boolean;
    missingMappings: string[];
  } {
    const missingMappings: string[] = [];

    // Check if requirement has system requirement mapping
    // This would be checked against a system requirements list
    // For now, we'll use placeholders

    if (!requirement.id.match(/^(URS|SYS|TDS)-/)) {
      missingMappings.push('Invalid requirement ID format');
    }

    // In real implementation, check against database
    // if (!systemReqExists(requirement.id)) {
    //   missingMappings.push(`SYS mapping missing for ${requirement.id}`);
    // }

    return {
      isComplete: missingMappings.length === 0,
      missingMappings,
    };
  }

  /**
   * GMP RULE 10: Access Control
   * Only authorized users can view/edit requirements
   */
  hasAccessToRequirement(
    requirement: Requirement,
    userRole: string,
    userId: string
  ): {
    canView: boolean;
    canEdit: boolean;
    canApprove: boolean;
  } {
    const authorizedRoles = requirement.documentMetadata.accessControl;
    const hasAccess = authorizedRoles.includes(userRole) || userRole === 'PLATFORM_ADMIN';

    return {
      canView: hasAccess,
      canEdit: hasAccess && this.canEditRequirement(requirement, userRole),
      canApprove: hasAccess && this.canApprove(requirement, userRole),
    };
  }

  /**
   * GMP VALIDATION: Complete validation before publishing
   */
  validateRequirementBeforePublish(requirement: Requirement): {
    isValid: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // CRITICAL violations - must be fixed
    if (!requirement.title?.trim()) violations.push('Title is required');
    if (!requirement.description?.trim()) violations.push('Description is required');
    if (!requirement.rationale?.trim()) violations.push('Rationale is required');
    if (!requirement.gxpRelevance) violations.push('GxP relevance must be specified');
    if (!requirement.riskLevel) violations.push('Risk level must be specified');

    // Approval chain
    if (!this.isApprovalChainComplete(requirement.approvals)) {
      violations.push('All approvals must be completed');
    }

    // Signature for published documents
    if (
      requirement.documentMetadata.status === 'SIGNED' &&
      requirement.signature?.status !== 'SIGNED'
    ) {
      violations.push('Document must be digitally signed');
    }

    // WARNINGS - should be reviewed but not blocking
    const traceability = this.validateTraceability(requirement);
    if (!traceability.isComplete) {
      warnings.push(...traceability.missingMappings);
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
    };
  }
}

export const complianceService = new ComplianceService();
