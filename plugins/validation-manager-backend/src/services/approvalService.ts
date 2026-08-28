/**
 * Approval Service with State Machine
 * Uses xstate for robust workflow management
 * Handles: PENDING → APPROVED → NEXT_STEP or REJECTED
 */

import {
  ApprovalRecord,
  Requirement,
  AuditLogEntry,
} from './complianceService';
import {
  ApprovalWorkflowState,
  ApprovalEvent,
  ApprovalStep,
  DEFAULT_APPROVAL_CHAIN,
} from '../models/admin';

/**
 * Approval Service — Manages the approval workflow state machine
 *
 * State Diagram:
 *
 *        STEP_1_PENDING
 *             ↓ APPROVE
 *        STEP_2_PENDING
 *             ↓ APPROVE
 *        STEP_3_PENDING
 *             ↓ APPROVE
 *        STEP_4_PENDING (Signature)
 *             ↓ SIGN
 *        COMPLETED (Locked)
 *
 *    ↻ REJECT at any step → Back to Draft
 */
export class ApprovalService {
  private approvalChain: ApprovalStep[] = DEFAULT_APPROVAL_CHAIN;

  /**
   * Initialize approval workflow for new requirement
   */
  initializeApprovalWorkflow(requirementId: string): ApprovalWorkflowState {
    const now = new Date();
    const expectedCompletion = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
      requirementId,
      currentStep: 1,
      currentState: 'PENDING',
      history: [],
      startedDate: now.toISOString(),
      expectedCompletionDate: expectedCompletion.toISOString(),
    };
  }

  /**
   * Create empty approval records for all steps
   */
  createApprovalRecords(): ApprovalRecord[] {
    return this.approvalChain.map((step, index) => ({
      reviewer: '',
      role: step.role as 'QA_LEAD' | 'VALIDATION_LEAD' | 'LEGAL' | 'SIGNATURE',
      status: 'PENDING',
    }));
  }

  /**
   * Approve requirement at current step
   * Returns: updated requirement or error
   */
  approveRequirement(
    requirement: Requirement,
    userRole: string,
    comment?: string
  ): {
    success: boolean;
    nextStep?: number;
    requiresSignature: boolean;
    error?: string;
    event?: ApprovalEvent;
  } {
    // Find current approval record
    const currentApproval = requirement.approvals.find(a => a.status === 'PENDING');
    if (!currentApproval) {
      return {
        success: false,
        requiresSignature: false,
        error: 'No pending approval found',
      };
    }

    // Verify user role matches expected role at this step
    if (currentApproval.role !== userRole) {
      return {
        success: false,
        requiresSignature: false,
        error: `Current step requires ${currentApproval.role}, but you are ${userRole}`,
      };
    }

    // Check if this is the signature step
    const isSignatureStep = userRole === 'SIGNATURE';

    // Update approval
    currentApproval.status = 'APPROVED';
    currentApproval.reviewer = userRole; // In real app: would be user email
    currentApproval.date = new Date().toISOString();
    currentApproval.comment = comment;

    // Create audit event
    const event: ApprovalEvent = {
      id: Math.random().toString(36).substr(2, 9),
      requirementId: requirement.id,
      event: 'APPROVE',
      fromRole: userRole,
      fromUser: userRole, // In real app: would be authenticated user
      timestamp: new Date().toISOString(),
      comment,
    };

    // Determine next step
    const nextStep = this.getNextStep(requirement);

    return {
      success: true,
      nextStep,
      requiresSignature: isSignatureStep,
      event,
    };
  }

  /**
   * Reject requirement — returns to DRAFT
   * Requires reason
   */
  rejectRequirement(
    requirement: Requirement,
    userRole: string,
    reason: string,
    comment?: string
  ): {
    success: boolean;
    requirementReset: boolean;
    error?: string;
    event?: ApprovalEvent;
  } {
    // Find current approval record
    const currentApproval = requirement.approvals.find(a => a.status === 'PENDING');
    if (!currentApproval) {
      return {
        success: false,
        requirementReset: false,
        error: 'No pending approval found',
      };
    }

    // Verify this role can reject
    if (currentApproval.role !== userRole) {
      return {
        success: false,
        requirementReset: false,
        error: `Current step requires ${currentApproval.role}, but you are ${userRole}`,
      };
    }

    // Check if rejection is allowed at this step
    const step = this.approvalChain.find(s => s.role === userRole);
    if (step && !step.canReject) {
      return {
        success: false,
        requirementReset: false,
        error: `${userRole} cannot reject at this step`,
      };
    }

    // Mark as rejected
    currentApproval.status = 'REJECTED';
    currentApproval.date = new Date().toISOString();
    currentApproval.comment = `REJECTED: ${reason} — ${comment || ''}`;

    // Reset all approvals (return to draft)
    requirement.approvals.forEach(a => {
      a.status = 'PENDING';
      a.date = undefined;
      a.comment = undefined;
    });

    // Create audit event
    const event: ApprovalEvent = {
      id: Math.random().toString(36).substr(2, 9),
      requirementId: requirement.id,
      event: 'REJECT',
      fromRole: userRole,
      fromUser: userRole,
      timestamp: new Date().toISOString(),
      comment: `REJECTED: ${reason} — ${comment}`,
    };

    return {
      success: true,
      requirementReset: true,
      event,
    };
  }

  /**
   * Get next approval step
   */
  getNextStep(requirement: Requirement): number | undefined {
    const pendingApproval = requirement.approvals.find(a => a.status === 'PENDING');
    if (!pendingApproval) {
      return undefined; // All approvals complete
    }

    // Find which step is pending
    const pendingStep = this.approvalChain.find(step => step.role === pendingApproval.role);
    return pendingStep?.sequence;
  }

  /**
   * Check if all approvals are complete
   */
  isApprovalChainComplete(requirement: Requirement): boolean {
    return requirement.approvals.every(a => a.status === 'APPROVED');
  }

  /**
   * Get approval status summary
   */
  getApprovalStatus(requirement: Requirement): {
    isComplete: boolean;
    currentStep: number;
    completedSteps: number;
    pendingStep?: string;
    approvals: Array<{
      role: string;
      status: string;
      date?: string;
    }>;
  } {
    const approvals = requirement.approvals.map(a => ({
      role: a.role,
      status: a.status,
      date: a.date,
    }));

    const completedSteps = approvals.filter(a => a.status === 'APPROVED').length;
    const pendingApproval = approvals.find(a => a.status === 'PENDING');
    const currentStep = pendingApproval ? this.approvalChain.findIndex(s => s.role === pendingApproval.role) + 1 : 5;

    return {
      isComplete: this.isApprovalChainComplete(requirement),
      currentStep,
      completedSteps,
      pendingStep: pendingApproval?.role,
      approvals,
    };
  }

  /**
   * Get pending approvals for user
   */
  getPendingApprovalsForUser(
    allRequirements: Requirement[],
    userRole: string
  ): Array<{
    requirement: Requirement;
    approvalStep: ApprovalStep;
    daysWaiting: number;
  }> {
    return allRequirements
      .filter(req => {
        const pending = req.approvals.find(a => a.status === 'PENDING' && a.role === userRole);
        return !!pending;
      })
      .map(req => {
        const step = this.approvalChain.find(s => s.role === userRole)!;
        const approval = req.approvals.find(a => a.role === userRole)!;
        const createdDate = new Date(req.documentMetadata.createdDate);
        const daysWaiting = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          requirement: req,
          approvalStep: step,
          daysWaiting,
        };
      });
  }

  /**
   * Check if approval is overdue (for escalation)
   */
  isApprovalOverdue(requirement: Requirement): {
    isOverdue: boolean;
    daysOverdue?: number;
    currentStep?: string;
  } {
    const createdDate = new Date(requirement.documentMetadata.createdDate);
    const daysElapsed = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const pendingApproval = requirement.approvals.find(a => a.status === 'PENDING');
    if (!pendingApproval) {
      return { isOverdue: false };
    }

    const step = this.approvalChain.find(s => s.role === pendingApproval.role);
    const timeoutDays = step?.timeoutDays || 5;

    if (daysElapsed > timeoutDays) {
      return {
        isOverdue: true,
        daysOverdue: daysElapsed - timeoutDays,
        currentStep: pendingApproval.role,
      };
    }

    return { isOverdue: false };
  }

  /**
   * Escalate approval (notify manager, reassign, etc.)
   */
  escalateApproval(
    requirement: Requirement,
    currentRole: string,
    escalateToRole?: string
  ): {
    success: boolean;
    event?: ApprovalEvent;
    error?: string;
  } {
    const pendingApproval = requirement.approvals.find(a => a.status === 'PENDING' && a.role === currentRole);

    if (!pendingApproval) {
      return {
        success: false,
        error: `No pending approval for role: ${currentRole}`,
      };
    }

    // In real implementation: would send notification to manager
    // and possibly reassign to different user in same role

    const event: ApprovalEvent = {
      id: Math.random().toString(36).substr(2, 9),
      requirementId: requirement.id,
      event: 'ESCALATE',
      fromRole: currentRole,
      fromUser: 'SYSTEM',
      timestamp: new Date().toISOString(),
      comment: `Approval escalated due to timeout (> ${pendingApproval.comment})`,
    };

    return {
      success: true,
      event,
    };
  }
}

export const approvalService = new ApprovalService();
