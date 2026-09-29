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
 * Default: postgres, and since MVP1 item 8 that is also what `app-config.yaml`
 * ships rather than only what the code falls back to. Memory is an opt-in you
 * have to write down — `app-config.memory.yaml` is the supported way — and it
 * is refused outright when `auth.environment` is production or when
 * `permission.enabled` is true. Never silently falls back to volatile memory.
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { Config } from '@backstage/config';
import { readLLMTimeoutMs } from '@internal/platform-common';
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

export function getPersistenceMode(config: Config): PersistenceMode {
  const mode = config
    .getOptionalString('ursComposer.persistence.mode')
    ?.toLowerCase() as PersistenceMode | undefined;

  // Default: postgres (production mode)
  if (!mode || mode === 'postgres') {
    return 'postgres';
  }

  if (mode === 'memory') {
    // The safe default above is not enough on its own. An overlay that simply
    // omits the key inherits whatever was layered first. That is how production
    // came to run the audit trail in process memory, with none of the
    // immutability triggers, which exist only in the Postgres schema. Refused
    // here rather than left to each overlay to remember.
    if (config.getOptionalString('auth.environment') === 'production') {
      throw new Error(
        "ursComposer.persistence.mode is 'memory' while auth.environment is " +
          "'production'. In-memory storage has no audit trail, no immutability " +
          'triggers and no transactions, and loses every record on restart. ' +
          "Set ursComposer.persistence.mode: postgres in the production config.",
      );
    }

    // The second half of NXD-064 C-1, and the one that does not depend on
    // remembering to set auth.environment. Permissions on means the platform is
    // deciding who may approve, sign and release — decisions that are only
    // meaningful if the record of them survives. Authorizing against a store
    // with no audit trail produces a decision nobody can later evidence, which
    // is worse than refusing to start.
    if (config.getOptionalBoolean('permission.enabled') === true) {
      throw new Error(
        "ursComposer.persistence.mode is 'memory' while permission.enabled is " +
          'true. Authorization decisions about approvals, signatures and ' +
          'releases would be enforced against a store that has no audit trail, ' +
          'no immutability triggers and loses every record on restart. Either ' +
          'set ursComposer.persistence.mode: postgres (the default), or run ' +
          'with app-config.memory.yaml, which turns permissions off and says ' +
          'why.',
      );
    }
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
  // See the composer plugin: an unbounded call holds a request handler and a
  // database connection for as long as the provider stays silent.
  const timeoutMs = readLLMTimeoutMs(config, 'ursComposer.ai.timeoutMs');

  logger.info(
    `URS Composer AI enabled: provider=openai, model=${model}, timeout=${timeoutMs}ms`,
  );

  return new OpenAILLMClient({
    baseUrl,
    apiKey,
    model,
    timeoutMs,
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
        catalog: catalogServiceRef,
      },
      async init({ httpRouter, logger, httpAuth, permissions, database, config, catalog }) {
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
          const inMemoryRepository = new URSRepository();
          inMemoryRepository.seedRequirementSets();
          repository = inMemoryRepository;
        } else {
          // Defensive: should never reach here
          throw new Error(`Unexpected persistence mode: ${persistenceMode}`);
        }

        const llmClient = createLLMClient(config, logger);

        const service = new URSService({
          logger,
          repository,
          llmClient,
          catalog,
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
