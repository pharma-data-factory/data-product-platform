/**
 * Sign in as one of a few named catalog users. Local development only.
 *
 * ## Why this exists
 *
 * The URS approval chain cannot be walked by one person, by design. Each step
 * requires its own approval role and ADMIN does not bypass the check
 * (`approveApprovalStep`); a version reaches APPROVED only through an
 * `APPROVED_QA` signature, and `verifySegregationOfDuties` refuses a signature
 * from whoever authored the version. That is correct GxP behaviour and must not
 * be softened to make a demo easier — an approval chain one person can walk
 * alone proves nothing, which `app-config.guest-developer.yaml` already says.
 *
 * The consequence was that the chain could not be demonstrated at all. Guest is
 * one identity, and the shipped profile granted it AUTHOR and PRODUCT_MANAGER,
 * so a live run of the golden path stopped with:
 *
 *     403 A APPROVED_QA signature requires the QUALITY_REVIEWER role.
 *         Your roles: PRODUCT_MANAGER, AUTHOR.
 *
 * Granting Guest every role would have cleared that message and proved nothing.
 * Several identities is the honest fix: the separation stays real, and the
 * person demonstrating it switches seat.
 *
 * ## Why a provider rather than something smaller
 *
 * Ownership comes from the catalog entity, not from a token claim — the guest
 * resolver calls `signInWithCatalogUser` and only falls back to configured
 * `ownershipEntityRefs` when that lookup fails (see `guestRole.ts`, which
 * records this being learned the hard way). `getUserApprovalRoles` then reads
 * `spec.memberOf` off the same entity. So a demo identity has to be a real
 * catalog user signed in as itself, which is what an auth provider does.
 *
 * Built on `createProxyAuthProviderFactory` and registered through
 * `authProvidersExtensionPoint` — both public API of `@backstage/plugin-auth-node`.
 * Nothing in `@backstage/*` is modified, patched or copied.
 *
 * ## Refusals
 *
 * Refused outright when `auth.environment` is production, like `guestRole.ts`
 * and for the same reason: this authenticates nobody. It is also inert unless
 * `auth.providers.demo.users` names identities, so a default install never
 * gains it by accident. The allow-list is closed — a name that is not on it is
 * rejected before the catalog is consulted, so this cannot be used to assume an
 * arbitrary user.
 */

import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  createProxyAuthenticator,
  createProxyAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { AuthenticationError, NotAllowedError } from '@backstage/errors';

/** The header the frontend names the desired identity in. */
export const DEMO_USER_HEADER = 'x-nexora-demo-user';

/** Config key holding the allow-list of demo identity names. */
export const DEMO_USERS_CONFIG_KEY = 'auth.providers.demo.users';

export interface DemoIdentityContext {
  /** Lower-cased catalog user names this provider may sign in as. */
  allowed: string[];
  enabled: boolean;
}

/**
 * Reads the allow-list, and decides whether the provider does anything.
 *
 * Exported for tests: the refusals are the part worth covering, and they are
 * pure functions of config.
 */
export function readDemoIdentityContext(config: {
  getOptionalString(key: string): string | undefined;
  getOptionalStringArray(key: string): string[] | undefined;
}): DemoIdentityContext {
  const environment = config.getOptionalString('auth.environment');
  const allowed = (config.getOptionalStringArray(DEMO_USERS_CONFIG_KEY) ?? [])
    .map(name => name.trim().toLowerCase())
    .filter(Boolean);

  if (environment === 'production') {
    return { allowed: [], enabled: false };
  }
  return { allowed, enabled: allowed.length > 0 };
}

/**
 * Resolves the requested identity, or says precisely why it will not.
 *
 * Separated from the authenticator so the decision can be tested without an
 * Express request or a catalog.
 */
export function resolveDemoUser(
  ctx: DemoIdentityContext,
  requested: string | undefined,
): string {
  if (!ctx.enabled) {
    throw new NotAllowedError(
      'Demo sign-in is not enabled. It requires a non-production ' +
        `auth.environment and at least one name in ${DEMO_USERS_CONFIG_KEY}.`,
    );
  }
  const name = (requested ?? '').trim().toLowerCase();
  if (!name) {
    throw new AuthenticationError(
      `Demo sign-in needs a user name in the ${DEMO_USER_HEADER} header.`,
    );
  }
  if (!ctx.allowed.includes(name)) {
    throw new NotAllowedError(
      `'${name}' is not a configured demo identity. Configured: ` +
        `${ctx.allowed.join(', ')}.`,
    );
  }
  return name;
}

/**
 * Builds the authenticator over an already-resolved context.
 *
 * Not read inside `initialize`, even though that receives a `config`: what it
 * receives is the provider's own section (`auth.providers.demo`), so
 * `auth.providers.demo.users` resolves to nothing there and `auth.environment`
 * is not reachable at all. The symptom was a provider that logged the right
 * allow-list at startup and then rejected every request with "Demo sign-in is
 * not enabled" — the module had read the root config and the authenticator had
 * not. Closing over the context keeps one reading of it.
 */
function createDemoAuthenticator(ctx: DemoIdentityContext) {
  return createProxyAuthenticator({
    defaultProfileTransform: async (result: { userName: string }) => ({
      profile: { displayName: result.userName },
    }),
    initialize(): DemoIdentityContext {
      return ctx;
    },
    async authenticate({ req }, context: DemoIdentityContext) {
      const header = req.headers[DEMO_USER_HEADER];
      const requested = Array.isArray(header) ? header[0] : header;
      return { result: { userName: resolveDemoUser(context, requested) } };
    },
  });
}

/**
 * Registers the `demo` provider on the auth backend.
 *
 * `signInWithCatalogUser` rather than `issueToken`: the whole point is that the
 * identity carries the groups the catalog holds for it, because that is where
 * both platform roles and URS approval roles are read from. A hand-built token
 * would look right and grant nothing.
 */
export const authModuleDemoIdentities = createBackendModule({
  pluginId: 'auth',
  moduleId: 'nexora-demo-identities',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ providers, logger, config }) {
        const ctx = readDemoIdentityContext(config);
        if (!ctx.enabled) {
          logger.info(
            'Demo identities are not configured; the demo auth provider is ' +
              'registered but will refuse every request.',
          );
        } else {
          logger.warn(
            `Demo sign-in is enabled for ${ctx.allowed.join(', ')}. ` +
              'These identities are not authenticated. Local development only.',
          );
        }

        providers.registerProvider({
          providerId: 'demo',
          factory: createProxyAuthProviderFactory({
            authenticator: createDemoAuthenticator(ctx),
            async signInResolver(info: any, context: any) {
              return context.signInWithCatalogUser({
                entityRef: { name: info.result.userName },
              });
            },
          }),
        });
      },
    });
  },
});
