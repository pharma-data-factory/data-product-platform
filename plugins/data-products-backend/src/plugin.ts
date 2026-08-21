import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

import {
  FileCertificationOverlay,
  certificationOverlayPath,
} from './certificationOverlay';
import { FileReleaseOverlay, releaseOverlayPath } from './releaseCatalog';
import { createGithubActionsClient } from './githubActions';
import { createRouter } from './router';

export const dataProductsPlugin = createBackendPlugin({
  pluginId: 'data-products',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        catalog: catalogServiceRef,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
      },
      async init({
        httpRouter,
        logger,
        config,
        catalog,
        httpAuth,
        permissions,
      }) {
        const github = createGithubActionsClient({ config });
        const certificationOverlay = new FileCertificationOverlay(
          certificationOverlayPath(config),
        );
        const releaseOverlay = new FileReleaseOverlay(releaseOverlayPath(config));
        httpRouter.use(
          await createRouter({
            logger,
            catalog,
            httpAuth,
            github,
            permissions,
            certificationOverlay,
            releaseOverlay,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
