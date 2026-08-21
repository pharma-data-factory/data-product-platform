export type AuthEnvironment = 'development' | 'production' | string;

export type SignInAccessDecision = 'allow' | 'deny';

export interface SignInAccessInput {
  environment: AuthEnvironment;
  hasCatalogUser: boolean;
  isGuest?: boolean;
}

/**
 * Production access policy for MVP 1.1.
 *
 * Development: GitHub OAuth and Guest are allowed. Unknown GitHub users
 * may complete sign-in locally for factory debugging.
 *
 * Production: Guest is forbidden. GitHub users must exist as approved
 * Catalog User entities. Unknown users do not receive Viewer implicitly.
 * A future organization allowlist can be added here without changing RBAC.
 */
export function decideSignInAccess(
  input: SignInAccessInput,
): SignInAccessDecision {
  if (input.isGuest) {
    return allowsGuestSignIn(input.environment) ? 'allow' : 'deny';
  }

  if (!input.hasCatalogUser) {
    return allowsUnknownGithubUserSignIn(input.environment) ? 'allow' : 'deny';
  }

  return 'allow';
}

export function allowsGuestSignIn(environment: AuthEnvironment): boolean {
  return environment !== 'production';
}

export function allowsUnknownGithubUserSignIn(
  environment: AuthEnvironment,
): boolean {
  return environment !== 'production';
}

export function requiresCatalogUserApproval(
  environment: AuthEnvironment,
): boolean {
  return environment === 'production';
}
