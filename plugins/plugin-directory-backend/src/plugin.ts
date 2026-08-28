import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { resolveWorkspaceRoot } from './inventory';
import { createRouter } from './router';
import { PluginDirectoryService } from './service';

export const pluginDirectoryPlugin = createBackendPlugin({
  pluginId: 'plugin-directory',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
      },
      async init({ httpRouter, logger, config, httpAuth, permissions }) {
        const configuredRoot = config.getOptionalString(
          'pluginDirectory.workspaceRoot',
        );
        const workspaceRoot =
          configuredRoot ?? resolveWorkspaceRoot(__dirname);

        const service = new PluginDirectoryService(workspaceRoot, logger);

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
            service,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info(
          `Plugin Directory v0.1 mounted (workspaceRoot=${workspaceRoot})`,
        );
      },
    });
  },
});
