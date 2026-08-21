import { createPermission } from '@backstage/plugin-permission-common';

export const marketplaceViewPermission = createPermission({
  name: 'marketplace.view',
  attributes: { action: 'read' },
});

export const marketplaceAdminPermission = createPermission({
  name: 'marketplace.admin',
  attributes: { action: 'update' },
});

export const dataProductViewPermission = createPermission({
  name: 'data-product.view',
  attributes: { action: 'read' },
});

export const dataProductCreatePermission = createPermission({
  name: 'data-product.create',
  attributes: { action: 'create' },
});

export const dataProductGovernancePermission = createPermission({
  name: 'data-product.governance',
  attributes: { action: 'update' },
});

export const dataProductCertificationManagePermission = createPermission({
  name: 'data-product.certification.manage',
  attributes: { action: 'update' },
});

export const platformAdminPermission = createPermission({
  name: 'platform.admin',
  attributes: { action: 'update' },
});

export const templateAdminPermission = createPermission({
  name: 'template.admin',
  attributes: { action: 'update' },
});

export const goldenPathReleaseManagePermission = createPermission({
  name: 'golden-path.release.manage',
  attributes: { action: 'update' },
});

export const aasReadPermission = createPermission({
  name: 'aas.read',
  attributes: { action: 'read' },
});

export const aasManagePermission = createPermission({
  name: 'aas.manage',
  attributes: { action: 'update' },
});

export const entitlementViewPermission = createPermission({
  name: 'entitlement.view',
  attributes: { action: 'read' },
});

export const entitlementAdminPermission = createPermission({
  name: 'entitlement.admin',
  attributes: { action: 'read' },
});

export const platformPermissions = [
  marketplaceViewPermission,
  marketplaceAdminPermission,
  dataProductViewPermission,
  dataProductCreatePermission,
  dataProductGovernancePermission,
  dataProductCertificationManagePermission,
  platformAdminPermission,
  templateAdminPermission,
  goldenPathReleaseManagePermission,
  aasReadPermission,
  aasManagePermission,
  entitlementViewPermission,
  entitlementAdminPermission,
];

export const VIEWER_PERMISSION_NAMES = new Set([
  'catalog.entity.read',
  'catalog.location.read',
  'catalog.entity.validate',
  'marketplace.view',
  'data-product.view',
  'aas.read',
  'entitlement.view',
]);

export const DEVELOPER_PERMISSION_NAMES = new Set([
  ...VIEWER_PERMISSION_NAMES,
  'catalog.entity.create',
  'catalog.entity.refresh',
  'scaffolder.task.create',
  'scaffolder.task.read',
  'scaffolder.task.cancel',
  'scaffolder.action.execute',
  'scaffolder.template.parameter.read',
  'scaffolder.template.step.read',
  'data-product.create',
]);

export const OWNER_PERMISSION_NAMES = new Set([
  ...DEVELOPER_PERMISSION_NAMES,
  'data-product.governance',
  'data-product.certification.manage',
  'aas.manage',
]);

export const ADMIN_PERMISSION_NAMES = new Set([
  ...OWNER_PERMISSION_NAMES,
  'catalog.entity.delete',
  'catalog.location.create',
  'catalog.location.delete',
  'catalog.location.analyze',
  'scaffolder.template.management',
  'marketplace.admin',
  'template.admin',
  'platform.admin',
  'golden-path.release.manage',
  'entitlement.admin',
]);
