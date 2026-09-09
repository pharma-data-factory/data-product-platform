export const PLATFORM_GROUPS = [
  'platform-viewers',
  'data-product-developers',
  'data-product-owners',
  'business-capability-leads',
  'platform-admins',
] as const;

export type PlatformGroup = (typeof PLATFORM_GROUPS)[number];

export const PLATFORM_ROLES = [
  'VIEWER',
  'DEVELOPER',
  'BUSINESS_CAPABILITY_LEAD',
  'DATA_PRODUCT_OWNER',
  'PLATFORM_ADMIN',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const GROUP_TO_ROLE: Record<PlatformGroup, PlatformRole> = {
  'platform-viewers': 'VIEWER',
  'data-product-developers': 'DEVELOPER',
  'data-product-owners': 'DATA_PRODUCT_OWNER',
  'business-capability-leads': 'BUSINESS_CAPABILITY_LEAD',
  'platform-admins': 'PLATFORM_ADMIN',
};

export const ROLE_RANK: Record<PlatformRole, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  BUSINESS_CAPABILITY_LEAD: 3,
  DATA_PRODUCT_OWNER: 4,
  PLATFORM_ADMIN: 5,
};

export const GUEST_USER_ENTITY_REF = 'user:default/guest';
export const GUEST_GROUP_ENTITY_REF = 'group:default/guests';

export const ROLE_LABELS: Record<PlatformRole, string> = {
  VIEWER: 'Viewer',
  DEVELOPER: 'Developer',
  BUSINESS_CAPABILITY_LEAD: 'Business Capability Lead',
  DATA_PRODUCT_OWNER: 'Data Product Owner',
  PLATFORM_ADMIN: 'Platform Admin',
};

const GROUP_REF_PREFIX = 'group:default/';

export function parseGroupName(entityRef: string): string | undefined {
  const normalized = entityRef.trim().toLowerCase();
  if (normalized.startsWith(GROUP_REF_PREFIX)) {
    return normalized.slice(GROUP_REF_PREFIX.length);
  }
  if (PLATFORM_GROUPS.includes(normalized as PlatformGroup)) {
    return normalized;
  }
  return undefined;
}

export function resolvePlatformRole(
  ownershipEntityRefs: readonly string[],
): PlatformRole {
  let highest: PlatformRole = 'VIEWER';
  for (const ref of ownershipEntityRefs) {
    const group = parseGroupName(ref);
    if (!group || !PLATFORM_GROUPS.includes(group as PlatformGroup)) {
      continue;
    }
    const role = GROUP_TO_ROLE[group as PlatformGroup];
    if (ROLE_RANK[role] > ROLE_RANK[highest]) {
      highest = role;
    }
  }
  return highest;
}

export function isAtLeast(role: PlatformRole, minimum: PlatformRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isGuestIdentity(userEntityRef?: string): boolean {
  return (userEntityRef ?? '').toLowerCase() === GUEST_USER_ENTITY_REF;
}

export function githubUserEntityRef(login: string): string {
  const name = login.trim().toLowerCase();
  if (!name) {
    throw new Error('GitHub username is required to map a catalog User');
  }
  return `user:default/${name}`;
}

export function githubLoginFromEntityRef(userEntityRef: string): string {
  return userEntityRef.trim().toLowerCase().split('/').pop() ?? '';
}

export function platformGroupNames(
  ownershipEntityRefs: readonly string[],
): string[] {
  const names: string[] = [];
  for (const ref of ownershipEntityRefs) {
    const group = parseGroupName(ref);
    if (group && !names.includes(group)) {
      names.push(group);
    }
  }
  return names;
}

export function hasApprovedPlatformAccess(
  ownershipEntityRefs: readonly string[],
): boolean {
  return platformGroupNames(ownershipEntityRefs).some(name =>
    PLATFORM_GROUPS.includes(name as PlatformGroup),
  );
}

/**
 * Catalog groups that grant URS Composer domain permissions.
 *
 * These are not platform tiers. Membership alone does not make someone a
 * Viewer/Developer/Owner; it only adds the URS permissions listed in
 * URS_DOMAIN_PERMISSIONS. Seed users combine a platform group for base
 * access with one of these for workflow eligibility.
 */
export const URS_DOMAIN_GROUPS = [
  'urs-authors',
  'urs-owners',
  'urs-business-reviewers',
  'urs-product-managers',
  'urs-quality-reviewers',
] as const;

export type UrsDomainGroup = (typeof URS_DOMAIN_GROUPS)[number];

/**
 * Permission names granted by each URS catalog group.
 *
 * Aligns with docs/rbac/platform-roles.md. Quality reviewers also receive
 * urs.sign so they can apply APPROVED_QA; that permission only means "may
 * sign at all" — segregation of duties still decides which signature.
 */
export const URS_DOMAIN_PERMISSIONS: Readonly<
  Record<UrsDomainGroup, readonly string[]>
> = {
  'urs-authors': ['urs.read', 'urs.create', 'urs.manage'],
  'urs-owners': ['urs.read', 'urs.create', 'urs.manage'],
  'urs-business-reviewers': ['urs.read', 'urs.approve'],
  'urs-product-managers': ['urs.read', 'urs.approve'],
  'urs-quality-reviewers': ['urs.read', 'urs.approve', 'urs.sign'],
};

export function ursDomainPermissionNames(
  ownershipEntityRefs: readonly string[],
): Set<string> {
  const names = new Set<string>();
  for (const ref of ownershipEntityRefs) {
    const group = parseGroupName(ref);
    if (!group || !(URS_DOMAIN_GROUPS as readonly string[]).includes(group)) {
      continue;
    }
    for (const permission of URS_DOMAIN_PERMISSIONS[group as UrsDomainGroup]) {
      names.add(permission);
    }
  }
  return names;
}
