import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { AuthorizationProfileRegistry } from './registry';
import { createRouter } from './router';

export const authorizationRegistryPlugin = createBackendPlugin({
  pluginId: 'authorization-registry',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        logger.info('Initializing Authorization Registry Plugin');

        const registry = new AuthorizationProfileRegistry(logger);

        // Initialize registry with profiles
        const baseDir = process.cwd();
        await registry.initialize(baseDir);

        // Create and register router
        const router = await createRouter({
          logger,
          registry,
        });

        // HttpRouterService.use() takes only a middleware/router, not a path.
        // Routes are served under /api/authorization-registry/...
        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info('Authorization Registry Plugin initialized successfully');
      },
    });
  },
});
