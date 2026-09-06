import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createRouter } from './router';

export const usersBackendPlugin = createBackendPlugin({
  pluginId: 'users',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        catalog: catalogServiceRef,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, httpAuth, permissions, catalog, config }) {
        // Users live in the committed catalog/users.seed.yaml (a static catalog
        // location in app-config.yaml). The router reads/writes it and refreshes
        // its location after each change.
        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, catalog, config }),
        );
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
