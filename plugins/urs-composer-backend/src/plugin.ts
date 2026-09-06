/**
 * URS Composer Backend Plugin
 * Backstage backend plugin registration
 *
 * P1A: PostgreSQL repository with explicit configuration
 * 
 * Configuration (app-config.yaml):
 * ursComposer:
 *   persistence:
 *     mode: postgres  # 'postgres' or 'memory'
 * 
 * Default: postgres (production)
 * Never silently falls back to volatile memory
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createRouter } from './router';
import { URSService } from './service';
import { URSRepository } from './repository';
import { PostgresURSRepository } from './postgres-repository';
import { IURSRepository } from './repository-interface';
import {
  LLMClient,
  OpenAILLMClient,
  MockLLMClient,
} from './llm-client';

type PersistenceMode = 'postgres' | 'memory';

function getPersistenceMode(config: Config): PersistenceMode {
  const mode = config
    .getOptionalString('ursComposer.persistence.mode')
    ?.toLowerCase() as PersistenceMode | undefined;

  // Default: postgres (production mode)
  if (!mode || mode === 'postgres') {
    return 'postgres';
  }

  if (mode === 'memory') {
    return 'memory';
  }

  throw new Error(
    `Invalid ursComposer.persistence.mode: '${mode}'. ` +
    `Allowed values: 'postgres', 'memory'`,
  );
}

function createLLMClient(config: Config, logger: any): LLMClient {
  const enabled = config.getOptionalBoolean('ursComposer.ai.enabled') ?? false;

  if (!enabled) {
    logger.info('URS Composer AI is disabled (ursComposer.ai.enabled=false)');
    return new MockLLMClient();
  }

  const apiKey = config.getOptionalString('ursComposer.ai.apiKey');
  if (!apiKey) {
    logger.warn(
      'URS Composer AI is enabled but no API key configured (ursComposer.ai.apiKey). Falling back to mock.',
    );
    return new MockLLMClient();
  }

  const baseUrl =
    config.getOptionalString('ursComposer.ai.baseUrl') ?? 'https://api.openai.com';
  const model =
    config.getOptionalString('ursComposer.ai.model') ?? 'gpt-4o-mini';

  logger.info(`URS Composer AI enabled: provider=openai, model=${model}`);

  return new OpenAILLMClient({
    baseUrl,
    apiKey,
    model,
    fetchApi: globalThis.fetch.bind(globalThis),
  });
}

export const ursComposerPlugin = createBackendPlugin({
  pluginId: 'urs-composer',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        database: coreServices.database,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, httpAuth, permissions, database, config }) {
        const persistenceMode = getPersistenceMode(config);
        let repository: IURSRepository;

        logger.info(`URS Composer persistence mode: ${persistenceMode}`);

        if (persistenceMode === 'postgres') {
          // Production: PostgreSQL required
          try {
            repository = await PostgresURSRepository.create(database);
            logger.info('URS Composer initialized with PostgreSQL repository (P1A)');
          } catch (error) {
            logger.error(
              'Failed to initialize PostgreSQL repository. ' +
              'URS Composer requires PostgreSQL to be configured and running. ' +
              'Set ursComposer.persistence.mode=memory in app-config.yaml to use in-memory ' +
              '(development/testing only).',
              error as Error,
            );
            throw new Error(
              `URS Composer PostgreSQL initialization failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        } else if (persistenceMode === 'memory') {
          // Development/Testing: In-memory allowed
          logger.warn(
            'URS Composer using in-memory repository. ' +
            'Data will NOT persist across restarts. ' +
            'For production, use ursComposer.persistence.mode=postgres (default).',
          );
          repository = new URSRepository();
        } else {
          // Defensive: should never reach here
          throw new Error(`Unexpected persistence mode: ${persistenceMode}`);
        }

        const llmClient = createLLMClient(config, logger);

        const service = new URSService({
          logger,
          repository,
          llmClient,
        });

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
            service,
          }),
        );

        // Health endpoint is public
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        logger.info('URS Composer backend plugin v0.1 mounted');
      },
    });
  },
});
