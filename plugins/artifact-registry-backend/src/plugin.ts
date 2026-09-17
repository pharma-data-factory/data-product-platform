/**
 * Artifact Registry Backend Plugin
 *
 * Mounts the registry's HTTP surface over the persistent repository. What an
 * Artifact is and which lifecycle acts are allowed stays in the service; this
 * file only wires the Backstage services it needs.
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { ArtifactRegistryRepository } from './repository';
import { ArtifactRegistryService } from './service';

export const artifactRegistryPlugin = createBackendPlugin({
  pluginId: 'artifact-registry',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        database: coreServices.database,
      },
      async init({ httpRouter, logger, httpAuth, permissions, database }) {
        const repository = await ArtifactRegistryRepository.create(database);
        const service = new ArtifactRegistryService(repository);

        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, service }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info('Artifact Registry backend plugin v0.1 mounted');
      },
    });
  },
});
