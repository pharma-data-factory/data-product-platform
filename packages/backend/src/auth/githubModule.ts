import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  githubAuthenticator,
  githubSignInResolvers,
} from '@backstage/plugin-auth-backend-module-github-provider';
import {
  authProvidersExtensionPoint,
  commonSignInResolvers,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { usernameMatchingUserEntityName } from './githubCatalogResolver';

/**
 * Official GitHub OAuth authenticator with a case-insensitive catalog User
 * resolver. Replaces the stock github-provider module so the configured
 * usernameMatchingUserEntityName resolver lowercases the GitHub login
 * before lookup and includes spec.memberOf in ownership claims.
 */
export const githubAuthModule = createBackendModule({
  pluginId: 'auth',
  moduleId: 'github-provider',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'github',
          factory: createOAuthProviderFactory({
            authenticator: githubAuthenticator,
            signInResolverFactories: {
              ...githubSignInResolvers,
              ...commonSignInResolvers,
              usernameMatchingUserEntityName,
            },
          }),
        });
      },
    });
  },
});
