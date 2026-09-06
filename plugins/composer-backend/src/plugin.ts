/**
 * Product Composer Backend Plugin
 *
 * Persists the Product Composer domain (Product, ProductVersion,
 * ProductComponent, DataContract, TraceabilityLink) via the Backstage
 * DatabaseService. URS classification and requirement lifecycle remain owned
 * by the URS Composer plugin; this plugin only links to them by stable IDs.
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { ComposerService } from './service';
import { ComposerRepository } from './repository';
import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';

export const composerPlugin = createBackendPlugin({
  pluginId: 'composer',
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
        const repository = await ComposerRepository.create(database);
        const ursBaselineResolver = createHttpUrsBaselineResolver({ discovery, auth });
        const service = new ComposerService({ logger, repository, ursBaselineResolver });

        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, service }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info('Composer backend plugin v0.1 mounted');
      },
    });
  },
});
