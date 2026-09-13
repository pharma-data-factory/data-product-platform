import { NotFoundError } from '@backstage/errors';
import type {
  AuthResolverContext,
  OAuthAuthenticatorResult,
  SignInInfo,
} from '@backstage/plugin-auth-node';
import type { GithubProfile } from '@backstage/plugin-auth-backend-module-github-provider';
import {
  githubUserEntityRef,
  hasApprovedPlatformAccess,
  normalizeGithubLogin,
  ownershipRefsFromUserEntity,
} from '@internal/platform-common';

export interface GithubCatalogResolverOptions {
  dangerouslyAllowSignInWithoutUserInCatalog?: boolean;
}

type GithubSignInInfo = SignInInfo<OAuthAuthenticatorResult<GithubProfile>>;

/**
 * Match GitHub login to a catalog User using the lowercase entity name.
 *
 * The stock usernameMatchingUserEntityName resolver passes the GitHub
 * username through unchanged. Catalog lookup is case-sensitive on
 * metadata.name, while the dangerous-fallback token is lowercased — so a
 * login like Schmeckm authenticates, misses user:default/schmeckm, and
 * lands with no platform group.
 */
export async function resolveGithubCatalogUser(
  info: GithubSignInInfo,
  ctx: AuthResolverContext,
  options?: GithubCatalogResolverOptions,
) {
  const username = info.result.fullProfile.username;
  if (!username) {
    throw new Error('GitHub user profile does not contain a username');
  }
  const userId = normalizeGithubLogin(username);

  try {
    return await issueCatalogIdentity(ctx, {
      entityRef: { name: userId },
    });
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
    try {
      return await issueCatalogIdentity(ctx, {
        annotations: { 'github.com/user-login': userId },
      });
    } catch (annotationError) {
      if (!(annotationError instanceof NotFoundError)) {
        throw annotationError;
      }
    }
    if (options?.dangerouslyAllowSignInWithoutUserInCatalog) {
      const entityRef = githubUserEntityRef(userId);
      return ctx.issueToken({
        claims: { sub: entityRef, ent: [entityRef] },
      });
    }
    throw error;
  }
}

export function usernameMatchingUserEntityName(
  options?: GithubCatalogResolverOptions,
) {
  return async (info: GithubSignInInfo, ctx: AuthResolverContext) =>
    resolveGithubCatalogUser(info, ctx, options);
}

async function issueCatalogIdentity(
  ctx: AuthResolverContext,
  query: Parameters<AuthResolverContext['findCatalogUser']>[0],
) {
  const { entity } = await ctx.findCatalogUser(query);
  const { ownershipEntityRefs: resolved } =
    await ctx.resolveOwnershipEntityRefs(entity);
  const ownershipEntityRefs = uniqueRefs([
    ...resolved,
    ...ownershipRefsFromUserEntity(entity),
  ]);
  if (!hasApprovedPlatformAccess(ownershipEntityRefs)) {
    throw new NotFoundError(
      `User ${entity.metadata.name} is not a member of an approved platform group`,
    );
  }
  return ctx.issueToken({
    claims: {
      sub: githubUserEntityRef(entity.metadata.name),
      ent: ownershipEntityRefs,
    },
  });
}

function uniqueRefs(refs: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ref of refs) {
    const normalized = ref.trim().toLocaleLowerCase('en-US');
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
