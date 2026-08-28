/**
 * Approval Workflow Service
 * Handles workflow selection, instance creation, and step progression
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import {
  ApprovalWorkflow,
  ApprovalInstance,
  ApprovalStep,
  ApprovalInstanceStatus,
  ApprovalStepStatus,
  ApprovalRole,
  GxPRelevance,
  Baseline,
  URSStatus,
} from '../types';
import { URSRepository } from '../repository';

export interface ApprovalWorkflowServiceOptions {
  logger: LoggerService;
  repository: URSRepository;
}

export class ApprovalWorkflowService {
  private logger: LoggerService;
  private repository: URSRepository;

  constructor(options: ApprovalWorkflowServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
  }

  /**
   * Select appropriate workflow based on GxP relevance
   * Default: standard-gxp-urs
   */
  async selectWorkflow(gxpRelevance?: GxPRelevance): Promise<ApprovalWorkflow | null> {
    let workflowId: string;

    switch (gxpRelevance) {
      case GxPRelevance.NONE:
        workflowId = 'non-gxp-urs';
        break;
      case GxPRelevance.INDIRECT:
        workflowId = 'standard-gxp-urs';
        break;
      case GxPRelevance.DIRECT:
      default:
        workflowId = 'standard-gxp-urs';
    }

    return this.repository.getApprovalWorkflow(workflowId);
  }

  /**
   * Create approval instance for a baseline
   */
  async createApprovalInstance(
    baseline: Baseline,
    workflow: ApprovalWorkflow,
    actor: string,
  ): Promise<ApprovalInstance> {
    const instance: ApprovalInstance = {
      id: this.generateUUID(),
      workflowId: workflow.id,
      baselineId: baseline.id,
      status: ApprovalInstanceStatus.NOT_STARTED,
      currentStepSequence: 0,
      startedBy: actor,
      startedAt: new Date(),
      steps: [],
      revision: 1,
    };

    // Create step instances for each workflow step
    const steps: ApprovalStep[] = [];
    for (const wfStep of workflow.steps) {
      const step: ApprovalStep = {
        id: this.generateUUID(),
        sequence: wfStep.sequence,
        role: wfStep.role,
        status: ApprovalStepStatus.PENDING,
      };
      steps.push(step);
      await this.repository.createApprovalStep(step);
    }

    instance.steps = steps;
    await this.repository.createApprovalInstance(instance);

    return instance;
  }

  /**
   * Approve a step in an approval instance
   */
  async approveStep(
    instance: ApprovalInstance,
    stepId: string,
    actor: string,
    comment?: string,
  ): Promise<{ updated: ApprovalInstance; allApproved: boolean }> {
    const step = await this.repository.getApprovalStep(stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    if (step.status !== ApprovalStepStatus.PENDING && step.status !== ApprovalStepStatus.ACTIVE) {
      throw new Error(`Cannot approve step in ${step.status} status`);
    }

    // Update step
    step.status = ApprovalStepStatus.APPROVED;
    step.decision = 'APPROVED';
    step.comment = comment;
    step.actedBy = actor;
    step.actedAt = new Date();
    await this.repository.updateApprovalStep(step);

    // Update instance
    const allSteps = instance.steps;
    const allApproved = allSteps.every(s => s.status === ApprovalStepStatus.APPROVED);

    if (allApproved) {
      instance.status = ApprovalInstanceStatus.APPROVED;
      instance.completedBy = actor;
      instance.completedAt = new Date();
    } else {
      // Advance to next step
      const nextStep = allSteps.find(s => s.status === ApprovalStepStatus.PENDING);
      if (nextStep) {
        nextStep.status = ApprovalStepStatus.ACTIVE;
        instance.currentStepSequence = nextStep.sequence;
        await this.repository.updateApprovalStep(nextStep);
      }
    }

    instance.revision++;
    await this.repository.updateApprovalInstance(instance);

    return { updated: instance, allApproved };
  }

  /**
   * Reject a step (marks entire instance as rejected)
   */
  async rejectStep(
    instance: ApprovalInstance,
    stepId: string,
    actor: string,
    reason: string,
    comment?: string,
  ): Promise<ApprovalInstance> {
    const step = await this.repository.getApprovalStep(stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    // Update step
    step.status = ApprovalStepStatus.REJECTED;
    step.decision = 'REJECTED';
    step.comment = `Reason: ${reason}. ${comment || ''}`;
    step.actedBy = actor;
    step.actedAt = new Date();
    await this.repository.updateApprovalStep(step);

    // Update instance
    instance.status = ApprovalInstanceStatus.REJECTED;
    instance.completedBy = actor;
    instance.completedAt = new Date();
    instance.revision++;
    await this.repository.updateApprovalInstance(instance);

    return instance;
  }

  /**
   * Activate first step when approval starts
   */
  async activateFirstStep(instance: ApprovalInstance): Promise<void> {
    if (instance.steps.length === 0) {
      throw new Error('No steps in workflow');
    }

    const firstStep = instance.steps[0];
    firstStep.status = ApprovalStepStatus.ACTIVE;
    instance.status = ApprovalInstanceStatus.IN_PROGRESS;
    instance.currentStepSequence = firstStep.sequence;

    await this.repository.updateApprovalStep(firstStep);
    instance.revision++;
    await this.repository.updateApprovalInstance(instance);
  }

  /**
   * Get active step for user assignment
   */
  getActiveStep(instance: ApprovalInstance): ApprovalStep | null {
    return instance.steps.find(s => s.status === ApprovalStepStatus.ACTIVE) || null;
  }

  /**
   * Check if user can approve a specific step
   * (future: integrate with role assignment)
   */
  canApprove(step: ApprovalStep, userRole: ApprovalRole): boolean {
    return step.role === userRole && 
           (step.status === ApprovalStepStatus.ACTIVE || 
            step.status === ApprovalStepStatus.PENDING);
  }

  private generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
