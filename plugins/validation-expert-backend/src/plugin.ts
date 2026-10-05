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
import {
  createHttpGmpClassifier,
  createHttpPinVerifier,
  createHttpProductEvidenceReader,
} from './decision-collaborators';

type PersistenceMode = 'postgres' | 'file' | 'memory';

export function getPersistenceMode(config: Config): PersistenceMode {
  const raw = config
    .getOptionalString('validationExpert.persistence.mode')
    ?.toLowerCase();
  const mode: string = raw ?? 'file';

  if (mode !== 'postgres' && mode !== 'file' && mode !== 'memory') {
    throw new Error(
      `Invalid validationExpert.persistence.mode: '${mode}'. ` +
        `Allowed values: 'postgres', 'file', 'memory'`,
    );
  }

  // NXD-090. The fallback to 'file' is kept for local development, where the
  // runs store is a convenience. In production it wrote validation evidence
  // to a JSON file inside the container — not on a volume, not copied into
  // the image — so every redeploy discarded it, and the only signal was a
  // warning in the log. Same refusal ursComposer has made since NXD-064:
  // starting and silently losing regulated records is worse than not starting.
  if (
    mode !== 'postgres' &&
    config.getOptionalString('auth.environment') === 'production'
  ) {
    throw new Error(
      `validationExpert.persistence.mode is '${mode}'${
        raw ? '' : ' (the default)'
      } while auth.environment is 'production'. Validation runs are ` +
        'regulated evidence; a file or in-memory store loses them on every ' +
        'restart or redeploy. Set validationExpert.persistence.mode: postgres ' +
        'in the production config.',
    );
  }

  return mode;
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
          gmpClassifier: createHttpGmpClassifier({ discovery, auth }),
          productEvidenceReader: createHttpProductEvidenceReader({ discovery, auth }),
        });

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            userInfo,
            permissions,
            service,
            pinVerifier: createHttpPinVerifier({ discovery, auth }),
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
