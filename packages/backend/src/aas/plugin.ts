import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { defaultSeedPath, MemoryAasRepository } from './repository';
import { createAasRouter } from './router';

export const aasPlugin = createBackendPlugin({
  pluginId: 'aas',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
      },
      async init({ httpRouter, logger, httpAuth, permissions }) {
        const repository = new MemoryAasRepository(defaultSeedPath());
        repository.seed();
        logger.warn(
          'AAS Control Plane adapter is a PROTOTYPE using in-memory storage. Production target is Assets UI → AAS backend client → AAS Foundation Service → persistent repository.',
        );
        httpRouter.use(
          await createAasRouter({
            logger,
            httpAuth,
            permissions,
            repository,
          }),
        );
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
