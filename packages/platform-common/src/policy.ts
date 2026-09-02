import { PlatformRole, isAtLeast } from './roles';
import {
  ADMIN_PERMISSION_NAMES,
  BUSINESS_CAPABILITY_LEAD_PERMISSION_NAMES,
  DEVELOPER_PERMISSION_NAMES,
  OWNER_PERMISSION_NAMES,
  VIEWER_PERMISSION_NAMES,
} from './permissions';
import {
  canCreateOfficialGoldenPath,
  isScaffolderTemplatePermission,
  templateIdFromResourceRef,
} from './releases';

export type PolicyDecisionName = 'allow' | 'deny';

export interface PolicyPermission {
  name: string;
  attributes?: { action?: string };
}

export function permissionsForRole(role: PlatformRole): Set<string> {
  switch (role) {
    case 'VIEWER':
      return VIEWER_PERMISSION_NAMES;
    case 'DEVELOPER':
      return DEVELOPER_PERMISSION_NAMES;
    case 'BUSINESS_CAPABILITY_LEAD':
      return BUSINESS_CAPABILITY_LEAD_PERMISSION_NAMES;
    case 'DATA_PRODUCT_OWNER':
      return OWNER_PERMISSION_NAMES;
    case 'PLATFORM_ADMIN':
      return ADMIN_PERMISSION_NAMES;
    default:
      return VIEWER_PERMISSION_NAMES;
  }
}

export function decidePermission(
  permission: PolicyPermission,
  role?: PlatformRole,
  resourceRef?: string,
): PolicyDecisionName {
  if (!role) {
    return 'deny';
  }

  // Reserved Validation Expert controls — never auto-granted in v0.1.
  if (
    permission.name === 'validation.approve' ||
    permission.name === 'risk.accept' ||
    permission.name === 'baseline.modify'
  ) {
    return 'deny';
  }

  if (role === 'PLATFORM_ADMIN') {
    return allowScaffolderTemplateIfReleased(permission, role, resourceRef, 'allow');
  }

  const allowed = permissionsForRole(role);
  if (allowed.has(permission.name)) {
    return allowScaffolderTemplateIfReleased(permission, role, resourceRef, 'allow');
  }

  if (
    permission.attributes?.action === 'read' &&
    isAtLeast(role, 'VIEWER') &&
    !isPrivilegedRead(permission.name)
  ) {
    return 'allow';
  }

  return 'deny';
}

function allowScaffolderTemplateIfReleased(
  permission: PolicyPermission,
  role: PlatformRole,
  resourceRef: string | undefined,
  decision: PolicyDecisionName,
): PolicyDecisionName {
  if (decision !== 'allow' || !isScaffolderTemplatePermission(permission.name)) {
    return decision;
  }
  const templateId = templateIdFromResourceRef(resourceRef);
  if (!templateId) {
    return decision;
  }
  return canCreateOfficialGoldenPath(role, templateId) ? 'allow' : 'deny';
}

function isPrivilegedRead(name: string): boolean {
  return (
    name.startsWith('scaffolder.') ||
    name.endsWith('.admin') ||
    name === 'platform.admin' ||
    name === 'template.admin' ||
    name === 'golden-path.release.manage' ||
    name === 'entitlement.admin' ||
    name === 'validation.admin' ||
    name === 'validation.approve' ||
    name === 'validation.review' ||
    name === 'validation.run.start' ||
    name === 'validation.test.execute' ||
    name === 'risk.accept' ||
    name === 'baseline.modify' ||
    name === 'pluginDirectory.read' ||
    name === 'pluginDirectory.admin' ||
    name === 'modelCompany.runScenario' ||
    name === 'modelCompany.control' ||
    name === 'modelCompany.admin'
  );
}

export function canReadValidation(role: PlatformRole): boolean {
  return isAtLeast(role, 'VIEWER');
}

export function canStartValidationRun(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canExecuteValidationTest(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canReviewValidation(role: PlatformRole): boolean {
  return isAtLeast(role, 'DATA_PRODUCT_OWNER');
}

export function canAdministerValidation(role: PlatformRole): boolean {
  return role === 'PLATFORM_ADMIN';
}

export function canViewCatalog(role: PlatformRole): boolean {
  return isAtLeast(role, 'VIEWER');
}

export function canExecuteScaffolder(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canCreateDataProduct(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canManageGovernance(role: PlatformRole): boolean {
  return isAtLeast(role, 'DATA_PRODUCT_OWNER');
}

export function canCreateProduct(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canManageProduct(role: PlatformRole): boolean {
  return isAtLeast(role, 'DATA_PRODUCT_OWNER');
}

export function canAdministerPlatform(role: PlatformRole): boolean {
  return role === 'PLATFORM_ADMIN';
}

export function canReadAas(role: PlatformRole): boolean {
  return isAtLeast(role, 'VIEWER');
}

export function canManageAas(role: PlatformRole): boolean {
  return isAtLeast(role, 'DATA_PRODUCT_OWNER');
}

export function canViewEntitlements(role: PlatformRole): boolean {
  return isAtLeast(role, 'VIEWER');
}

export function canAdministerEntitlements(role: PlatformRole): boolean {
  return role === 'PLATFORM_ADMIN';
}

export function canReadPluginDirectory(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canAdministerPluginDirectory(role: PlatformRole): boolean {
  return role === 'PLATFORM_ADMIN';
}

export function canAdministerBusinessCapabilities(role: PlatformRole): boolean {
  return role === 'BUSINESS_CAPABILITY_LEAD' || role === 'PLATFORM_ADMIN';
}

export function canManagePlatformUsers(role: PlatformRole): boolean {
  return role === 'PLATFORM_ADMIN';
}

export function canReadModelCompany(role: PlatformRole): boolean {
  return isAtLeast(role, 'VIEWER');
}

export function canRunModelCompanyScenario(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canControlModelCompany(role: PlatformRole): boolean {
  return isAtLeast(role, 'DEVELOPER');
}

export function canAdministerModelCompany(role: PlatformRole): boolean {
  return role === 'PLATFORM_ADMIN';
}
