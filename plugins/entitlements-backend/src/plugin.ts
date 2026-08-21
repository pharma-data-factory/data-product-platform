import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { createEntitlementRuntime } from './runtime';

export const entitlementsPlugin = createBackendPlugin({
  pluginId: 'entitlements',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        permissions: coreServices.permissions,
      },
      async init({
        httpRouter,
        logger,
        config,
        httpAuth,
        userInfo,
        permissions,
      }) {
        const runtime = createEntitlementRuntime({ config });
        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            userInfo,
            permissions,
            runtime,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        // AWS fulfillment POSTs are unauthenticated by design. Rate-limited
        // in the router. Do not provision tenants.
        httpRouter.addAuthPolicy({
          path: '/marketplace/register',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
