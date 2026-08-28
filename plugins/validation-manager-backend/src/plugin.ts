import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

export const validationManagerPlugin = createBackendPlugin({
  pluginId: 'validation-manager',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
      },
      async init({ httpRouter, logger, httpAuth, permissions }) {
        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info('Validation Manager v0.1 mounted');
      },
    });
  },
});
