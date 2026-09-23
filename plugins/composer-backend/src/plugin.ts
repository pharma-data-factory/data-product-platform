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
import { createHttpCatalogComponentLoader } from './catalog-component-loader';
import { createHttpValidationDecisionResolver } from './validation-decision-resolver';
import { createHttpPolicyResolverClient } from './policy-resolver-client';
import { bootstrapPlatformProduct } from './platformProductBootstrap';
import {
  AnthropicComposerLLMClient,
  ComposerLLMClient,
  MockComposerLLMClient,
  OpenAIComposerLLMClient,
} from './llm-client';

/**
 * Instantiates the LLM client based on `composer.ai` config.
 *
 * Supported providers (composer.ai.provider):
 *   `openai`     — OpenAI-compatible chat-completions API (default).
 *                  Use composer.ai.baseUrl to point at a local proxy or
 *                  compatible API.
 *   `anthropic`  — Anthropic Messages API (Claude). Default model:
 *                  `claude-haiku-4-5`. Override with composer.ai.model.
 *
 * AI is disabled (MockComposerLLMClient) when composer.ai.enabled is false
 * or no API key is configured.
 */
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

  const provider =
    config.getOptionalString('composer.ai.provider') ?? 'openai';

  if (provider === 'anthropic') {
    const model =
      config.getOptionalString('composer.ai.model') ?? 'claude-haiku-4-5';
    logger.info(`Composer AI enabled: provider=anthropic, model=${model}`);
    return new AnthropicComposerLLMClient({
      apiKey,
      model,
      fetchApi: globalThis.fetch.bind(globalThis),
    });
  }

  // Default: OpenAI-compatible
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
        // Every one of these degrades quietly on failure — by design, but the
        // logger is what makes the degradation visible. Without it a broken
        // cross-plugin call is indistinguishable from a real finding about the
        // product. See NXD-053 and NXD-054.
        const ursBaselineResolver = createHttpUrsBaselineResolver({
          discovery,
          auth,
          logger,
        });
        const catalogLoader = createHttpCatalogComponentLoader({
          discovery,
          auth,
          logger,
        });
        const validationDecisionResolver = createHttpValidationDecisionResolver({
          discovery,
          auth,
          logger,
        });
        const policyResolverClient = createHttpPolicyResolverClient({
          discovery,
          auth,
          logger,
        });
        const llmClient = createLLMClient(config, logger);
        const llmEnabled = config.getOptionalBoolean('composer.ai.enabled') ?? false;
        const service = new ComposerService({
          logger,
          repository,
          ursBaselineResolver,
          llmClient,
          catalogLoader,
          validationDecisionResolver,
          policyResolverClient,
        });

        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, service, llmEnabled }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        // 7-R5: Register Nexora Core as a PLATFORM_PRODUCT on first startup.
        bootstrapPlatformProduct({ repository, logger }).catch(() => {/* non-fatal */});

        logger.info('Composer backend plugin v0.1 mounted');
      },
    });
  },
});
