/**
 * Validation Expert Permissions
 *
 * Central definition for all Validation Expert authorization controls.
 *
 * Permissions:
 * - validation.read: View validation overview, risks, evidence, findings
 * - requirement.read: View requirements metadata
 * - traceability.read: View traceability relationships
 * - validation.run.start: Start a new validation run (IQ/OQ/UAT)
 * - validation.test.execute: Execute automated or manual formal tests
 * - validation.review: Review evidence and findings (no approval)
 * - validation.admin: Runner and plugin administration
 * - validation.approve: RESERVED — never granted in v0.1 (automatic approval is forbidden)
 */

import { createPermission } from '@backstage/plugin-permission-common';

/** Validation Expert — read overview, risks, evidence, findings, protocols. */
export const validationReadPermission = createPermission({
  name: 'validation.read',
  attributes: { action: 'read' },
});

export const requirementReadPermission = createPermission({
  name: 'requirement.read',
  attributes: { action: 'read' },
});

export const traceabilityReadPermission = createPermission({
  name: 'traceability.read',
  attributes: { action: 'read' },
});

/** Start a new validation run (IQ/OQ/UAT). Does not approve the package. */
export const validationRunStartPermission = createPermission({
  name: 'validation.run.start',
  attributes: { action: 'create' },
});

/** Execute automated or manual formal tests within a run. */
export const validationTestExecutePermission = createPermission({
  name: 'validation.test.execute',
  attributes: { action: 'update' },
});

/** Review evidence/findings (no package approval). */
export const validationReviewPermission = createPermission({
  name: 'validation.review',
  attributes: { action: 'update' },
});

/** Runner/plugin administration for Validation Expert. */
export const validationAdminPermission = createPermission({
  name: 'validation.admin',
  attributes: { action: 'update' },
});

/**
 * Reserved — never granted in v0.1 policy sets.
 * Automatic approval must not be implemented.
 */
export const validationApprovePermission = createPermission({
  name: 'validation.approve',
  attributes: { action: 'update' },
});

export const validationPermissions = [
  validationReadPermission,
  requirementReadPermission,
  traceabilityReadPermission,
  validationRunStartPermission,
  validationTestExecutePermission,
  validationReviewPermission,
  validationAdminPermission,
  validationApprovePermission,
];
