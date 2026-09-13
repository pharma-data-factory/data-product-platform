import path from 'path';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import { resolveValidationRoot } from './parsers';
import { PostgresValidationRunRepository } from './postgres-repository';
import {
  FileValidationRunRepository,
  MemoryValidationRunRepository,
  type ValidationRunRepository,
} from './repository';
import { createRouter } from './router';
import { createDefaultRunnerRegistry } from './runners';
import { ValidationExpertService } from './service';
import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';
import { createHttpProductComposerResolver } from './product-resolver';

type PersistenceMode = 'postgres' | 'file' | 'memory';

export function getPersistenceMode(config: Config): PersistenceMode {
  const mode = config
    .getOptionalString('validationExpert.persistence.mode')
    ?.toLowerCase();

  if (!mode || mode === 'file') {
    return 'file';
  }
  if (mode === 'postgres' || mode === 'memory') {
    return mode;
  }
  throw new Error(
    `Invalid validationExpert.persistence.mode: '${mode}'. ` +
      `Allowed values: 'postgres', 'file', 'memory'`,
  );
}

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
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        database: coreServices.database,
      },
      async init({
        httpRouter,
        logger,
        config,
        httpAuth,
        userInfo,
        permissions,
        discovery,
        auth,
        database,
      }) {
        const validationRoot = resolveValidationRoot(
          config.getOptionalString('validationExpert.validationRoot'),
        );
        const storePath =
          config.getOptionalString('validationExpert.runtimeStorePath') ??
          path.join(validationRoot, 'runtime', 'runs-store.json');
        const healthBaseUrl = config.getOptionalString(
          'validationExpert.healthBaseUrl',
        );
        const persistenceMode = getPersistenceMode(config);
        const authEnvironment = config.getOptionalString('auth.environment');

        let repository: ValidationRunRepository;

        logger.info(`Validation Expert persistence mode: ${persistenceMode}`);

        if (persistenceMode === 'postgres') {
          try {
            repository = await PostgresValidationRunRepository.create(database);
            logger.info(
              'Validation Expert initialized with PostgreSQL repository',
            );
          } catch (error) {
            logger.error(
              'Failed to initialize Validation Expert PostgreSQL repository',
              error as Error,
            );
            throw new Error(
              `Validation Expert PostgreSQL initialization failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        } else if (persistenceMode === 'memory') {
          logger.warn(
            'Validation Expert using in-memory repository. ' +
              'Data will NOT persist across restarts. ' +
              'For durable evidence, use validationExpert.persistence.mode=postgres.',
          );
          repository = new MemoryValidationRunRepository();
        } else {
          if (authEnvironment === 'production') {
            logger.warn(
              'validationExpert.persistence.mode is file while auth.environment is production. ' +
                'File store is not suitable for regulated evidence. Prefer postgres for durable storage.',
            );
          }
          repository = new FileValidationRunRepository(storePath);
        }

        const service = new ValidationExpertService({
          validationRoot,
          repository,
          runners: createDefaultRunnerRegistry(),
          healthBaseUrl,
          ursBaselineResolver: createHttpUrsBaselineResolver({
            discovery,
            auth,
          }),
          productResolver: createHttpProductComposerResolver({
            discovery,
            auth,
          }),
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
          `Validation Expert v0.1 mounted (root=${validationRoot}, persistence=${persistenceMode}${
            persistenceMode === 'file' ? `, store=${storePath}` : ''
          })`,
        );
      },
    });
  },
});
