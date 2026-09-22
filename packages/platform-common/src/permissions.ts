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

/**
 * URS Composer — apply an electronic signature.
 *
 * Separate from urs.approve on purpose: holding it only means a user may sign
 * at all. Which signature they may apply to which record is decided by the
 * approval role and the segregation-of-duties rules, not by this permission.
 */
export const ursSignPermission = createPermission({
  name: 'urs.sign',
  attributes: { action: 'update' },
});

/** URS Composer — raise and decide change requests. */
export const ursChangeRequestManagePermission = createPermission({
  name: 'urs.changerequest.manage',
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

/** Product Composer — read products and their components. */
export const productReadPermission = createPermission({
  name: 'product.read',
  attributes: { action: 'read' },
});

/** Product Composer — create products. */
export const productCreatePermission = createPermission({
  name: 'product.create',
  attributes: { action: 'create' },
});

/** Product Composer — manage product versions, components, and contracts. */
export const productManagePermission = createPermission({
  name: 'product.manage',
  attributes: { action: 'update' },
});

/** Artifact Registry — read Artifacts, their versions, and publishers. */
export const artifactReadPermission = createPermission({
  name: 'artifact.read',
  attributes: { action: 'read' },
});

/** Artifact Registry — register a new ArtifactVersion from a manifest. */
export const artifactCreatePermission = createPermission({
  name: 'artifact.create',
  attributes: { action: 'create' },
});

/** Artifact Registry — hand a DRAFT version over for testing (DRAFT → TESTING). */
export const artifactSubmitPermission = createPermission({
  name: 'artifact.submit',
  attributes: { action: 'update' },
});

/**
 * Artifact Registry — record the outcome of reviewing a version under test.
 *
 * Deliberately not a lifecycle transition: it sets certificationStatus to
 * TESTED and leaves `lifecycle` at TESTING, the same way validation.review
 * records an outcome without moving a status field. Certifying is the act
 * that advances the lifecycle, and it requires this review to have happened.
 */
export const artifactReviewPermission = createPermission({
  name: 'artifact.review',
  attributes: { action: 'update' },
});

/** Artifact Registry — certify a reviewed version (TESTING → CERTIFIED). */
export const artifactCertifyPermission = createPermission({
  name: 'artifact.certify',
  attributes: { action: 'update' },
});

/** Artifact Registry — make a certified version available (CERTIFIED → RELEASED). */
export const artifactPublishPermission = createPermission({
  name: 'artifact.publish',
  attributes: { action: 'update' },
});

/** Artifact Registry — withdraw a released version (RELEASED → DEPRECATED). */
export const artifactDeprecatePermission = createPermission({
  name: 'artifact.deprecate',
  attributes: { action: 'update' },
});

/**
 * Artifact Registry — claim a namespace for a publisher.
 *
 * Admin-weight: a namespace is owned by exactly one publisher, so granting it
 * decides who may be accountable for Artifacts, not merely what they contain.
 */
export const publisherManagePermission = createPermission({
  name: 'publisher.manage',
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
  ursSignPermission,
  ursChangeRequestManagePermission,
  businessCapabilityManagePermission,
  platformUserManagePermission,
  productReadPermission,
  productCreatePermission,
  productManagePermission,
  artifactReadPermission,
  artifactCreatePermission,
  artifactSubmitPermission,
  artifactReviewPermission,
  artifactCertifyPermission,
  artifactPublishPermission,
  artifactDeprecatePermission,
  publisherManagePermission,
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
  'product.read',
  'artifact.read',
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
  // `urs.create` is deliberately NOT here. Authoring a URS is a governance
  // act, not a development one: the platform tiers that may work on
  // requirements are DATA_PRODUCT_OWNER, BUSINESS_CAPABILITY_LEAD and
  // PLATFORM_ADMIN. A developer who should author requirements is given the
  // `urs-authors` domain group instead — see URS_DOMAIN_PERMISSIONS. That
  // keeps one person's development tier and their requirements role separate
  // and separately auditable, which is what ALCOA attribution needs.
  'product.create',
  'artifact.create',
  'artifact.submit',
  // Reviewing records a test outcome; certifying on the strength of it is an
  // owner's call, so the two sit in different tiers on purpose.
  'artifact.review',
]);

export const OWNER_PERMISSION_NAMES = new Set([
  ...DEVELOPER_PERMISSION_NAMES,
  'data-product.governance',
  'data-product.certification.manage',
  'aas.manage',
  'validation.review',
  // Restated rather than inherited: it left DEVELOPER, and an owner who could
  // edit a requirement set but not start one would be a strange gap.
  'urs.create',
  'urs.manage',
  'urs.approve',
  // Signing sits at the same level as approving: the permission only says a
  // user may sign at all. Whether a particular signature is admissible is
  // decided by the approval role and the segregation-of-duties checks in the
  // signature service.
  'urs.sign',
  'urs.changerequest.manage',
  'product.manage',
  'artifact.certify',
  'artifact.publish',
  'artifact.deprecate',
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
  'publisher.manage',
  // Phase 5 (P5-S1): validation.approve granted to PLATFORM_ADMIN only.
  // Segregation of Duties is enforced in the service (decider ≠ context creator).
  // risk.accept and baseline.modify remain reserved.
  'validation.approve',
]);

export const BUSINESS_CAPABILITY_LEAD_PERMISSION_NAMES = new Set([
  ...VIEWER_PERMISSION_NAMES,
  'business-capability.manage',
  // A lead owns the capability a requirement set describes, so authoring one
  // is part of the job. Until now the tier held read only — it ranks above
  // DEVELOPER but inherited from VIEWER, so it had fewer rights than the tier
  // below it.
  //
  // Authoring only. `urs.approve` and `urs.sign` stay with the owner tier and
  // the review domain groups: whoever writes a requirement must not also be
  // the one who approves and signs it.
  'urs.create',
  'urs.manage',
]);
