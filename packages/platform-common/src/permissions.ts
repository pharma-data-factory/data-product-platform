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

/** Consume Data Product query/stream interfaces via the Consumption Framework. */
export const dataProductConsumePermission = createPermission({
  name: 'data-product.consume',
  attributes: { action: 'read' },
});

/** View declared quality metadata (not live metrics fabrication). */
export const dataProductViewQualityPermission = createPermission({
  name: 'data-product.viewQuality',
  attributes: { action: 'read' },
});

/** View validation metadata as recorded (never auto-promoted). */
export const dataProductViewValidationPermission = createPermission({
  name: 'data-product.viewValidation',
  attributes: { action: 'read' },
});

/** Administer consumption framework configuration. */
export const dataProductAdminPermission = createPermission({
  name: 'data-product.admin',
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

/** Reserved — never granted in v0.1. Risk acceptance stays human/offline. */
export const riskAcceptPermission = createPermission({
  name: 'risk.accept',
  attributes: { action: 'update' },
});

/** Reserved — baseline artifacts remain read-only in v0.1. */
export const baselineModifyPermission = createPermission({
  name: 'baseline.modify',
  attributes: { action: 'update' },
});

/** Plugin Directory — read installed plugin inventory (Admin governance). */
export const pluginDirectoryReadPermission = createPermission({
  name: 'pluginDirectory.read',
  attributes: { action: 'read' },
});

/** Plugin Directory — full governance metadata (no install in v0.1). */
export const pluginDirectoryAdminPermission = createPermission({
  name: 'pluginDirectory.admin',
  attributes: { action: 'read' },
});

/** Model Company — read factory, events, data-product bindings. */
export const modelCompanyReadPermission = createPermission({
  name: 'modelCompany.read',
  attributes: { action: 'read' },
});

/** Model Company — run a scenario. */
export const modelCompanyRunScenarioPermission = createPermission({
  name: 'modelCompany.runScenario',
  attributes: { action: 'create' },
});

/** Model Company — start/stop/speed simulation. */
export const modelCompanyControlPermission = createPermission({
  name: 'modelCompany.control',
  attributes: { action: 'update' },
});

/** Model Company — reset / administration. */
export const modelCompanyAdminPermission = createPermission({
  name: 'modelCompany.admin',
  attributes: { action: 'update' },
});

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

/** Business Capability — manage the capability taxonomy (Business Capability Lead). */
export const businessCapabilityManagePermission = createPermission({
  name: 'business-capability.manage',
  attributes: { action: 'update' },
});

/** Platform user/role management (assign Catalog group membership). */
export const platformUserManagePermission = createPermission({
  name: 'platform.user.manage',
  attributes: { action: 'update' },
});

export const platformPermissions = [
  marketplaceViewPermission,
  marketplaceAdminPermission,
  dataProductViewPermission,
  dataProductCreatePermission,
  dataProductGovernancePermission,
  dataProductCertificationManagePermission,
  dataProductConsumePermission,
  dataProductViewQualityPermission,
  dataProductViewValidationPermission,
  dataProductAdminPermission,
  platformAdminPermission,
  templateAdminPermission,
  goldenPathReleaseManagePermission,
  aasReadPermission,
  aasManagePermission,
  entitlementViewPermission,
  entitlementAdminPermission,
  validationReadPermission,
  requirementReadPermission,
  traceabilityReadPermission,
  validationRunStartPermission,
  validationTestExecutePermission,
  validationReviewPermission,
  validationAdminPermission,
  validationApprovePermission,
  riskAcceptPermission,
  baselineModifyPermission,
  pluginDirectoryReadPermission,
  pluginDirectoryAdminPermission,
  modelCompanyReadPermission,
  modelCompanyRunScenarioPermission,
  modelCompanyControlPermission,
  modelCompanyAdminPermission,
  ursReadPermission,
  ursCreatePermission,
  ursManagePermission,
  ursApprovePermission,
  ursAdminPermission,
  businessCapabilityManagePermission,
  platformUserManagePermission,
];

export const VIEWER_PERMISSION_NAMES = new Set([
  'catalog.entity.read',
  'catalog.location.read',
  'catalog.entity.validate',
  'marketplace.view',
  'data-product.view',
  'data-product.consume',
  'data-product.viewQuality',
  'data-product.viewValidation',
  'aas.read',
  'entitlement.view',
  'validation.read',
  'requirement.read',
  'traceability.read',
  'modelCompany.read',
  'urs.read',
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
  'validation.run.start',
  'validation.test.execute',
  'pluginDirectory.read',
  'modelCompany.runScenario',
  'modelCompany.control',
  'urs.create',
]);

export const OWNER_PERMISSION_NAMES = new Set([
  ...DEVELOPER_PERMISSION_NAMES,
  'data-product.governance',
  'data-product.certification.manage',
  'aas.manage',
  'validation.review',
  'urs.manage',
  'urs.approve',
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
  'validation.admin',
  'pluginDirectory.admin',
  'modelCompany.admin',
  'data-product.admin',
  'urs.admin',
  'business-capability.manage',
  'platform.user.manage',
  // validation.approve, risk.accept, baseline.modify intentionally omitted
]);

export const BUSINESS_CAPABILITY_LEAD_PERMISSION_NAMES = new Set([
  ...VIEWER_PERMISSION_NAMES,
  'business-capability.manage',
]);
