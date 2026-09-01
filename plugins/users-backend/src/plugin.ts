import fs from 'fs';
import path from 'path';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createRouter } from './router';

const LOCATION_TYPE = 'file';
const LOCATION_TARGET = '../../catalog/runtime/users.yaml';

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
        auth: coreServices.auth,
      },
      async init({
        httpRouter,
        logger,
        httpAuth,
        permissions,
        catalog,
        config,
        auth,
      }) {
        // Ensure the runtime users file exists before the location is read.
        const file = path.resolve(process.cwd(), LOCATION_TARGET);
        if (!fs.existsSync(file)) {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, '[]\n', 'utf8');
        }
        // Register the runtime location so the catalog reads it (and refreshes
        // re-read it after writes).
        try {
          const credentials = await auth.getOwnServiceCredentials();
          await catalog.addLocation(
            { type: LOCATION_TYPE, target: LOCATION_TARGET },
            { credentials },
          );
        } catch (error) {
          logger.warn(
            `users-backend: failed to register runtime location: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, catalog, config }),
        );
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
