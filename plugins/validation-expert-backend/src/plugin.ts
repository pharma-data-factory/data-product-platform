import path from 'path';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { resolveValidationRoot } from './parsers';
import { FileValidationRunRepository } from './repository';
import { createRouter } from './router';
import { createDefaultRunnerRegistry } from './runners';
import { ValidationExpertService } from './service';

export const validationExpertPlugin = createBackendPlugin({
  pluginId: 'validation-expert',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        permissions: coreServices.permissions,
      },
      async init({ httpRouter, logger, config, httpAuth, userInfo, permissions }) {
        const validationRoot = resolveValidationRoot(
          config.getOptionalString('validationExpert.validationRoot'),
        );
        const storePath =
          config.getOptionalString('validationExpert.runtimeStorePath') ??
          path.join(validationRoot, 'runtime', 'runs-store.json');
        const healthBaseUrl = config.getOptionalString(
          'validationExpert.healthBaseUrl',
        );

        const repository = new FileValidationRunRepository(storePath);
        const service = new ValidationExpertService({
          validationRoot,
          repository,
          runners: createDefaultRunnerRegistry(),
          healthBaseUrl,
        });

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            userInfo,
            permissions,
            service,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info(
          `Validation Expert v0.1 mounted (root=${validationRoot}, store=${storePath})`,
        );
      },
    });
  },
});
