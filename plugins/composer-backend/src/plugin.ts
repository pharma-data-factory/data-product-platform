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
import { Config } from '@backstage/config';
import { createRouter } from './router';
import { ComposerService } from './service';
import { ComposerRepository } from './repository';
import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';
import { createHttpCatalogManifestPinResolver } from './catalog-pin-resolver';
import { createHttpCiStatusResolver } from './ci-status-resolver';
import { createHttpTechnicalEvidenceRegistrar } from './evidence-registrar';
import { createHttpTechnicalEvidenceLookup } from './evidence-lookup';
import {
  ComposerLLMClient,
  OpenAIComposerLLMClient,
  MockComposerLLMClient,
} from './llm-client';

function createLLMClient(config: Config, logger: any): ComposerLLMClient {
  const enabled = config.getOptionalBoolean('composer.ai.enabled') ?? false;

  if (!enabled) {
    logger.info('Composer AI is disabled (composer.ai.enabled=false)');
    return new MockComposerLLMClient();
  }

  const apiKey = config.getOptionalString('composer.ai.apiKey');
  if (!apiKey) {
    logger.warn(
      'Composer AI is enabled but no API key configured (composer.ai.apiKey). Falling back to mock.',
    );
    return new MockComposerLLMClient();
  }

  const baseUrl =
    config.getOptionalString('composer.ai.baseUrl') ?? 'https://api.openai.com';
  const model =
    config.getOptionalString('composer.ai.model') ?? 'gpt-4o-mini';

  logger.info(`Composer AI enabled: provider=openai, model=${model}`);

  return new OpenAIComposerLLMClient({
    baseUrl,
    apiKey,
    model,
    fetchApi: globalThis.fetch.bind(globalThis),
  });
}

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
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, httpAuth, permissions, database, discovery, auth, config }) {
        const repository = await ComposerRepository.create(database);
        const ursBaselineResolver = createHttpUrsBaselineResolver({ discovery, auth });
        const catalogManifestPinResolver = createHttpCatalogManifestPinResolver({
          discovery,
          auth,
        });
        const ciStatusResolver = createHttpCiStatusResolver({
          discovery,
          auth,
        });
        const technicalEvidenceRegistrar = createHttpTechnicalEvidenceRegistrar({
          discovery,
          auth,
        });
        const technicalEvidenceLookup = createHttpTechnicalEvidenceLookup({
          discovery,
          auth,
        });
        const llmClient = createLLMClient(config, logger);
        const llmEnabled = config.getOptionalBoolean('composer.ai.enabled') ?? false;
        const service = new ComposerService({
          logger,
          repository,
          ursBaselineResolver,
          catalogManifestPinResolver,
          ciStatusResolver,
          technicalEvidenceRegistrar,
          technicalEvidenceLookup,
          llmClient,
        });

        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, service, llmEnabled }),
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
