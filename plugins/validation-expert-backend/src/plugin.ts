import path from 'path';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { resolveValidationRoot } from './parsers';
import { FileValidationRunRepository } from './repository';
import { createRouter } from './router';
import { createDefaultRunnerRegistry } from './runners';
import {
  ValidationExpertService,
  type UrsBaselineResolver,
} from './service';
import type { CreateValidationContextRequest } from './types';

/**
 * Production URS baseline resolver: an explicit HTTP boundary to the URS
 * Composer backend (`GET /api/urs-composer/baselines/:id`). The Validation
 * Expert never reads URS PostgreSQL tables directly. Requires baseline status
 * APPROVED, otherwise the request is denied.
 */
function createHttpUrsBaselineResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: { getPluginRequestToken(options: { onBehalfOf: unknown; targetPluginId: string }): Promise<{ token: string }> };
  fetchImpl?: typeof fetch;
}): UrsBaselineResolver {
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  return {
    async resolveApprovedBaseline(request: CreateValidationContextRequest) {
      const base = await options.discovery.getBaseUrl('urs-composer');
      const url = `${base}/baselines/${encodeURIComponent(request.baselineId)}`;
      let token: string | undefined;
      try {
        const t = await options.auth.getPluginRequestToken({
          onBehalfOf: await Promise.resolve({} as never),
          targetPluginId: 'urs-composer',
        });
        token = t.token;
      } catch {
        token = undefined;
      }
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await doFetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Unable to resolve URS baseline ${request.baselineId} (HTTP ${res.status})`);
      }
      const baseline = (await res.json()) as {
        id: string;
        requirementSetId?: string;
        baselineVersion?: string;
        status?: string;
        requirementVersionIds?: string[];
        createdBy?: string;
      };
      const status = String(baseline.status ?? '').toUpperCase();
      if (status !== 'APPROVED') {
        throw new Error(
          `URS baseline ${request.baselineId} is ${status || 'NOT_FOUND'}; a validation context may only be created from an APPROVED baseline`,
        );
      }
      // Fetch the requirement set to capture title + business capability refs
      // (stable IDs only). Failure to resolve context is non-fatal for the
      // ApprovedURSReference core (baseline identity + approval status).
      let solutionName: string | undefined;
      let businessCapabilityIds: string[] = [];
      if (baseline.requirementSetId) {
        try {
          const setRes = await doFetch(
            `${base}/requirement-sets/${encodeURIComponent(baseline.requirementSetId)}`,
            { headers },
          );
          if (setRes.ok) {
            const set = (await setRes.json()) as {
              solutionName?: string;
              businessCapabilityRefs?: string[];
            };
            solutionName = set.solutionName;
            businessCapabilityIds = set.businessCapabilityRefs ?? [];
          }
        } catch {
          // best-effort enrichment
        }
      }
      return {
        reference: {
          requirementSetId: request.requirementSetId,
          baselineId: baseline.id,
          baselineVersion: String(baseline.baselineVersion ?? ''),
          requirementSetTitle: solutionName,
          requirementSetName: baseline.requirementSetId ?? request.requirementSetId,
          businessCapabilityIds,
          approvalStatus: 'APPROVED',
          approvedAt: undefined,
          approvedBy: baseline.createdBy,
          sourceSystem: 'urs-composer',
          requirementIds: baseline.requirementVersionIds ?? [],
          createdAt: new Date().toISOString(),
        },
      };
    },
  };
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
      },
      async init({ httpRouter, logger, config, httpAuth, userInfo, permissions, discovery, auth }) {
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
          ursBaselineResolver: createHttpUrsBaselineResolver({
            discovery: discovery as never,
            auth: auth as never,
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
          `Validation Expert v0.1 mounted (root=${validationRoot}, store=${storePath})`,
        );
      },
    });
  },
});
