/**
 * The approval workflows `submitBaseline` selects between.
 *
 * Reference data, not content: the same two workflows exist in every
 * environment and are referenced by a fixed id, the way
 * [`BUSINESS_CAPABILITIES`](./businessCapabilities.ts) is. Both repositories
 * derive from this list for the reason named in the header of `db/seeds.ts` —
 * so the Postgres mirror and the in-memory store cannot drift apart.
 *
 * That they could drift apart was not hypothetical. Only `db/seeds.ts` created
 * them, and only `postgres-repository.ts` runs it, so in the persistence mode
 * `app-config.yaml` ships (`ursComposer.persistence.mode: memory`) the table of
 * workflows was empty. `submitBaseline` resolves `standard-gxp-urs` or
 * `non-gxp-urs` by id and `createApprovalInstance` throws `Workflow not found`
 * when the lookup misses, so submitting a baseline for approval failed on the
 * default developer setup — the first step of the URS journey that cannot be
 * worked around from the UI.
 */

import { ApprovalRole, ApprovalWorkflow } from '../types';

/** A workflow as declared here: identity and steps, without a creation time. */
export type ApprovalWorkflowDefinition = Omit<ApprovalWorkflow, 'createdAt'>;

export const APPROVAL_WORKFLOWS: readonly ApprovalWorkflowDefinition[] = [
  {
    id: 'standard-gxp-urs',
    name: 'Standard GxP URS Approval',
    description: 'Three-step approval for GxP-relevant requirements',
    steps: [
      {
        sequence: 1,
        role: ApprovalRole.BUSINESS_REVIEWER,
        required: true,
        description: 'Business context review',
      },
      {
        sequence: 2,
        role: ApprovalRole.PRODUCT_MANAGER,
        required: true,
        description: 'Product management review',
      },
      {
        sequence: 3,
        role: ApprovalRole.QUALITY_REVIEWER,
        required: true,
        description: 'Quality assurance review',
      },
    ],
  },
  {
    id: 'non-gxp-urs',
    name: 'Non-GxP URS Approval',
    description: 'Two-step approval for non-GxP requirements',
    steps: [
      {
        sequence: 1,
        role: ApprovalRole.BUSINESS_REVIEWER,
        required: true,
        description: 'Business context review',
      },
      {
        sequence: 2,
        role: ApprovalRole.PRODUCT_MANAGER,
        required: true,
        description: 'Product management review',
      },
    ],
  },
];
