import { NotFoundError } from '@backstage/errors';
import type { AuthResolverContext, SignInInfo } from '@backstage/plugin-auth-node';
import type { OAuthAuthenticatorResult } from '@backstage/plugin-auth-node';
import type { GithubProfile } from '@backstage/plugin-auth-backend-module-github-provider';
import { resolveGithubCatalogUser } from './githubCatalogResolver';

function info(username?: string) {
  return {
    result: { fullProfile: { username } },
  } as SignInInfo<OAuthAuthenticatorResult<GithubProfile>>;
}

function context(options: {
  users?: Record<string, { name: string; memberOf?: string[] }>;
}) {
  const users = options.users ?? {};
  const issued: Array<{ sub: string; ent?: string[] }> = [];
  const ctx = {
    issued,
    async findCatalogUser(query: {
      entityRef?: { name: string };
      annotations?: Record<string, string>;
    }) {
      if ('entityRef' in query && query.entityRef) {
        const user = users[query.entityRef.name];
        if (!user) {
          throw new NotFoundError('User not found');
        }
        return {
          entity: {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'User',
            metadata: { name: user.name },
            spec: { memberOf: user.memberOf ?? [] },
          },
        };
      }
      throw new NotFoundError('User not found');
    },
    async resolveOwnershipEntityRefs(entity: { metadata: { name: string } }) {
      return { ownershipEntityRefs: [`user:default/${entity.metadata.name}`] };
    },
    async issueToken(params: { claims: { sub: string; ent?: string[] } }) {
      issued.push(params.claims);
      return { token: 'session' };
    },
  };
  return ctx as typeof ctx & AuthResolverContext;
}

describe('resolveGithubCatalogUser', () => {
  it('lowercases the GitHub login and includes spec.memberOf groups', async () => {
    const ctx = context({
      users: {
        schmeckm: { name: 'schmeckm', memberOf: ['platform-admins'] },
      },
    });

    await resolveGithubCatalogUser(info('Schmeckm'), ctx);

    expect(ctx.issued).toEqual([
      {
        sub: 'user:default/schmeckm',
        ent: ['user:default/schmeckm', 'group:default/platform-admins'],
      },
    ]);
  });

  it('rejects an authenticated GitHub user with no platform group', async () => {
    const ctx = context({
      users: { stranger: { name: 'stranger', memberOf: [] } },
    });

    await expect(resolveGithubCatalogUser(info('stranger'), ctx)).rejects.toThrow(
      /not a member of an approved platform group/,
    );
    expect(ctx.issued).toEqual([]);
  });

  it('signs in without groups only when catalog fallback is enabled', async () => {
    const ctx = context({ users: {} });

    await resolveGithubCatalogUser(info('new-github-user'), ctx, {
      dangerouslyAllowSignInWithoutUserInCatalog: true,
    });

    expect(ctx.issued).toEqual([
      {
        sub: 'user:default/new-github-user',
        ent: ['user:default/new-github-user'],
      },
    ]);
  });

  it('throws when the catalog user is missing and fallback is disabled', async () => {
    const ctx = context({ users: {} });

    await expect(resolveGithubCatalogUser(info('schmeckm'), ctx)).rejects.toThrow(
      NotFoundError,
    );
    expect(ctx.issued).toEqual([]);
  });
});
