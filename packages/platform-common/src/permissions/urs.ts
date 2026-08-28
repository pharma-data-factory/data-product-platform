/**
 * URS Composer Permissions
 *
 * Central definition for all URS Composer authorization controls.
 * All URS API routes enforce these permissions via the Backstage Permission Framework.
 *
 * Permissions:
 * - urs.read: View requirement sets and capabilities
 * - urs.create: Create new requirement sets
 * - urs.manage: Edit draft requirement sets
 * - urs.approve: Approve/reject requirement sets (workflow eligibility gate)
 * - urs.admin: URS administration (templates, retirement)
 */

import { createPermission } from '@backstage/plugin-permission-common';

/** URS Composer — read requirement sets and capabilities. */
export const ursReadPermission = createPermission({
  name: 'urs.read',
  attributes: { action: 'read' },
});

/** URS Composer — create new requirement sets. */
export const ursCreatePermission = createPermission({
  name: 'urs.create',
  attributes: { action: 'create' },
});

/** URS Composer — edit draft requirement sets. */
export const ursManagePermission = createPermission({
  name: 'urs.manage',
  attributes: { action: 'update' },
});

/** URS Composer — approve/reject requirement sets. */
export const ursApprovePermission = createPermission({
  name: 'urs.approve',
  attributes: { action: 'update' },
});

/** URS Composer — administer templates and retire requirement sets. */
export const ursAdminPermission = createPermission({
  name: 'urs.admin',
  attributes: { action: 'update' },
});

export const ursPermissions = [
  ursReadPermission,
  ursCreatePermission,
  ursManagePermission,
  ursApprovePermission,
  ursAdminPermission,
];
