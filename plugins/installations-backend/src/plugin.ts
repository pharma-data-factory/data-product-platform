/**
 * Installations backend plugin (NXD-129 slice 1, NXD-139).
 *
 * Owns governed desired state: which released artifact version runs on which
 * runtime target, with which configuration, and every act that changed it.
 * It executes nothing. A runtime provider outside the Backstage backend
 * pulls desired state and reports what it observes (NXD-143), so this
 * plugin holds no container client, no host credential and no dependency the
 * other backend plugins do not already have.
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  createHttpArtifactVersionReader,
  createHttpGmpClassifier,
  createHttpPinVerifier,
} from './clients';
import { InstallationsRepository } from './repository';
import { createRouter } from './router';
import { InstallationsService } from './service';

export const installationsPlugin = createBackendPlugin({
  pluginId: 'installations',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        database: coreServices.database,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ httpRouter, logger, httpAuth, permissions, database, discovery, auth }) {
        const repository = await InstallationsRepository.create(database);
        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
            service: new InstallationsService(repository),
            readArtifactVersion: createHttpArtifactVersionReader({ discovery, auth }),
            classify: createHttpGmpClassifier({ discovery, auth, logger }),
            pinVerifier: createHttpPinVerifier({ discovery, auth }),
          }),
        );
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
        logger.info('Installations backend plugin v0.1 mounted');
      },
    });
  },
});
