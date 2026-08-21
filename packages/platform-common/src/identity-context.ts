import {
  DEFAULT_ORGANIZATION_ID,
  OrganizationContext,
  createDefaultOrganizationContext,
} from './organization';
import {
  EntitlementContext,
  createDefaultEntitlementContext,
} from './entitlements';
import {
  PlatformRole,
  githubLoginFromEntityRef,
  hasApprovedPlatformAccess,
  isGuestIdentity,
  platformGroupNames,
  resolvePlatformRole,
} from './roles';

/**
 * IdentityContext wraps the existing Backstage identity. It does not
 * replace GitHub OAuth, Guest development fallback, or RBAC groups.
 */
export interface IdentityContext {
  userEntityRef: string;
  ownershipEntityRefs: readonly string[];
  platformRole: PlatformRole;
  displayName?: string;
  githubLogin?: string;
  isGuest: boolean;
  unknownGitHubUser: boolean;
  hasPlatformAccess: boolean;
  organizationId: string;
}

export interface IdentityContextInput {
  userEntityRef: string;
  ownershipEntityRefs: readonly string[];
  displayName?: string;
  organizationId?: string;
}

export function createIdentityContext(
  input: IdentityContextInput,
): IdentityContext {
  const isGuest = isGuestIdentity(input.userEntityRef);
  const groups = platformGroupNames(input.ownershipEntityRefs);

  return {
    userEntityRef: input.userEntityRef,
    ownershipEntityRefs: input.ownershipEntityRefs,
    platformRole: resolvePlatformRole(input.ownershipEntityRefs),
    displayName: input.displayName,
    githubLogin: isGuest
      ? undefined
      : githubLoginFromEntityRef(input.userEntityRef),
    isGuest,
    unknownGitHubUser: !isGuest && groups.length === 0,
    hasPlatformAccess: hasApprovedPlatformAccess(input.ownershipEntityRefs),
    organizationId: input.organizationId ?? DEFAULT_ORGANIZATION_ID,
  };
}

/**
 * Combined runtime boundary. Organization is the single internal
 * organization. Entitlements come from the configured provider (local
 * by default). Identity is the existing Backstage identity. RBAC is
 * not derived from entitlements.
 */
export interface PlatformRuntimeContext {
  organization: OrganizationContext;
  identity: IdentityContext;
  entitlements: EntitlementContext;
}

export function createMvpPlatformContext(
  input: IdentityContextInput,
): PlatformRuntimeContext {
  const organization = createDefaultOrganizationContext();
  const entitlements = createDefaultEntitlementContext(
    undefined,
    organization.organization.id,
  );

  return {
    organization,
    entitlements,
    identity: createIdentityContext({
      ...input,
      organizationId: organization.organization.id,
    }),
  };
}
