/**
 * Scaffolder action that makes the URS binding of a scaffolded product real.
 *
 * A template can carry a `ursBaselineId` parameter and write it into the
 * generated catalog-info.yaml, but a parameter is only a claim: the picker runs
 * in the browser, the /compose page bypasses it entirely, and
 * `scaffolder.task.create` can be called over the API with any value at all.
 * Verifying the claim server-side, inside the task, is the only place the rule
 * actually holds.
 *
 * The action fails the task when the referenced baseline is not APPROVED, so a
 * product cannot be published claiming a binding it does not have. It
 * deliberately does NOT require a binding — that is the release gate's job, per
 * the agreed rule: free to create, bound to release.
 *
 * Lives in composer-backend rather than in a module of its own so it can reuse
 * createHttpUrsBaselineResolver, the same cross-plugin HTTP boundary the
 * release gate already uses. data-products-backend sets the precedent for a
 * plugin package exporting a module for a different plugin
 * (catalogModuleCertificationOverlay).
 */

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  createTemplateAction,
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';

import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';

/** Value a template writes when the author chose no baseline. */
export const UNBOUND = 'unbound';

export function createUrsVerifyBaselineAction(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: Parameters<typeof createHttpUrsBaselineResolver>[0]['auth'];
  /** Injected by tests; production uses the resolver's own global fetch. */
  fetchImpl?: typeof fetch;
}) {
  const resolver = createHttpUrsBaselineResolver({
    discovery: options.discovery,
    auth: options.auth,
    fetchImpl: options.fetchImpl,
  });

  return createTemplateAction({
    id: 'nexora:urs:verify-baseline',
    description:
      'Fails the task unless the given URS baseline exists and is APPROVED. ' +
      'Accepts "unbound" for a product deliberately created without a URS.',
    schema: {
      input: {
        ursBaselineId: z =>
          z
            .string()
            .describe(
              'URS baseline id to verify, or "unbound" to skip verification.',
            ),
      },
      output: {
        bound: z =>
          z.boolean().describe('Whether a URS baseline was actually verified.'),
        baselineVersion: z =>
          z
            .string()
            .optional()
            .describe('Version label of the verified baseline.'),
      },
    },
    async handler(ctx) {
      const id = ctx.input.ursBaselineId?.trim();

      if (!id || id === UNBOUND) {
        // Not an error. The product may be created unbound; the release gate
        // is what refuses to release it later.
        ctx.logger.info(
          'No URS baseline given. The product will be created unbound and ' +
            'cannot be released until it references an approved baseline.',
        );
        ctx.output('bound', false);
        return;
      }

      // Throws when the baseline is missing or not APPROVED, which fails the
      // task — deliberately, so an unapproved claim never reaches the catalog.
      const baseline = await resolver.resolveApprovedBaseline(id);

      ctx.logger.info(
        `URS baseline ${id} verified as APPROVED (version ${baseline.baselineVersion}).`,
      );
      ctx.output('bound', true);
      ctx.output('baselineVersion', baseline.baselineVersion);
    },
  });
}

export const scaffolderModuleUrsBinding = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'urs-binding',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ scaffolder, discovery, auth }) {
        scaffolder.addActions(
          createUrsVerifyBaselineAction({
            discovery,
            auth: auth as never,
          }),
        );
      },
    });
  },
});
