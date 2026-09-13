/**
 * Canonical approval workflow definitions.
 *
 * Single source of truth shared by the Postgres seed and the in-memory
 * repository, so the two persistence modes cannot drift apart. Without these
 * definitions `submitBaseline` cannot resolve a workflow and the approval
 * chain never starts.
 */

import { ApprovalRole, WorkflowStep } from '../types';

export interface ApprovalWorkflowSeed {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

/** Selected for a requirement set with DIRECT or INDIRECT GxP relevance. */
const GXP_STEPS: WorkflowStep[] = [
  {
    sequence: 1,
    role: ApprovalRole.BUSINESS_REVIEWER,
    required: true,
  },
  {
    sequence: 2,
    role: ApprovalRole.PRODUCT_MANAGER,
    required: true,
  },
  {
    sequence: 3,
    role: ApprovalRole.QUALITY_REVIEWER,
    required: true,
  },
];

/** Selected for every other requirement set. */
const NON_GXP_STEPS: WorkflowStep[] = [
  {
    sequence: 1,
    role: ApprovalRole.BUSINESS_REVIEWER,
    required: true,
  },
  {
    sequence: 2,
    role: ApprovalRole.PRODUCT_MANAGER,
    required: true,
  },
];

export const APPROVAL_WORKFLOWS: ApprovalWorkflowSeed[] = [
  {
    id: 'standard-gxp-urs',
    name: 'Standard GxP URS Approval',
    description: 'Three-step approval for GxP-relevant requirements',
    steps: GXP_STEPS,
  },
  {
    id: 'non-gxp-urs',
    name: 'Non-GxP URS Approval',
    description: 'Two-step approval for non-GxP requirements',
    steps: NON_GXP_STEPS,
  },
];
