/**
 * Bootstrap: register Nexora Core as a PLATFORM_PRODUCT (7-R5).
 *
 * "Nexora manages Nexora" — the platform manages its own lifecycle using
 * the same Product mechanics as any other product: versions, baselines,
 * validation, and release gates.
 *
 * This module is called from plugin.ts after the repository is ready.
 * It is idempotent: if a PLATFORM_PRODUCT named 'nexora-core' already
 * exists, it returns immediately without writing anything.
 */

import type { LoggerService } from '@backstage/backend-plugin-api';
import type { IComposerRepository } from './repository-interface';

const NEXORA_CORE_NAME = 'nexora-core';
const NEXORA_CORE_OWNER = 'group:default/platform-team';

export async function bootstrapPlatformProduct(options: {
  repository: IComposerRepository;
  logger: LoggerService;
}): Promise<void> {
  const { repository, logger } = options;

  try {
    // Check if already registered — idempotent
    const { items } = await repository.listProducts(100, 0);
    const existing = items.find(
      p => p.name === NEXORA_CORE_NAME && p.productType === 'PLATFORM_PRODUCT',
    );
    if (existing) {
      logger.debug(`PLATFORM_PRODUCT "${NEXORA_CORE_NAME}" already registered (id: ${existing.id})`);
      return;
    }

    // Register the Core itself
    const { randomUUID } = await import('crypto');
    const product = {
      id: randomUUID(),
      name: NEXORA_CORE_NAME,
      description:
        'Nexora Core Platform — the integrated Data Product Platform for Life Sciences and Manufacturing. ' +
        'Managed as a Product within itself: Nexora manages Nexora.',
      businessPurpose:
        'Provide a stable, governed platform for building, publishing and operating Data Products across the enterprise.',
      productType: 'PLATFORM_PRODUCT' as const,
      domain: 'platform',
      owner: NEXORA_CORE_OWNER,
      team: NEXORA_CORE_OWNER,
      lifecycle: 'PRODUCTION' as const,
      status: 'ACTIVE' as const,
      gxpRelevance: 'INDIRECT',
      dataClassification: 'INTERNAL' as const,
      declaredPolicies: ['nexora/gxp-data-product-policy@1.0.0'],
      createdBy: 'system:bootstrap',
      createdAt: new Date(),
      revision: 1,
    };

    await repository.createProduct(product);
    logger.info(`PLATFORM_PRODUCT "${NEXORA_CORE_NAME}" registered (id: ${product.id})`);
  } catch (err) {
    // Non-fatal: bootstrap failure must not prevent the plugin from starting.
    logger.warn(
      `PLATFORM_PRODUCT bootstrap failed (non-fatal): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
