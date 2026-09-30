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

import type { Config } from '@backstage/config';
import { createHttpUrsBaselineResolver } from './urs-baseline-resolver';
import { getPublishReadiness } from './scm-publish-readiness';

/** Value a template writes when the author chose no baseline. */
export const UNBOUND = 'unbound';

/**
 * Resolves the repository coordinate a scaffolded product is published to.
 *
 * The organisation was written into seven templates as a literal —
 * `github.com?owner=pharma-data-factory&repo=...` — in four places each, plus
 * once in the Compose page. A framework that bakes in its operator's GitHub
 * organisation is not a framework: every product any other operator scaffolds
 * would be published to the wrong address.
 *
 * Resolved here rather than in the template for the reason this file already
 * states about the URS binding: the picker runs in the browser, `/compose`
 * bypasses it entirely, and `scaffolder.task.create` can be called over the
 * API with any value at all. A configured organisation that a caller can
 * override is not configuration, it is a default. This action reads the
 * platform's setting inside the task, where the rule actually holds.
 *
 * The seven templates also *collected* a `repoUrl` from a RepoUrlPicker and
 * then discarded it — the publish step rebuilt the URL from
 * `parameters.name`. So the field asked the user a question whose answer was
 * thrown away. It is gone.
 *
 * Fails the task when nothing is configured, rather than falling back. A
 * silent default is how the literal survived this long. NXD-079.
 */
export function createScmResolveRepoAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'nexora:scm:resolve-repo',
    description:
      'Builds the publish coordinate from the platform\'s configured SCM host ' +
      'and organisation, so no template carries an operator\'s organisation.',
    schema: {
      input: {
        repo: z =>
          z.string().describe('Repository name, without host or organisation.'),
      },
      output: {
        repoUrl: z =>
          z
            .string()
            .describe('Coordinate for publish:github, host?owner=..&repo=..'),
        host: z => z.string().describe('Configured SCM host.'),
        owner: z => z.string().describe('Configured organisation.'),
      },
    },
    async handler(ctx) {
      const repo = ctx.input.repo?.trim();
      if (!repo) {
        throw new Error('A repository name is required.');
      }

      const host = options.config.getOptionalString('nexora.scm.host');
      const owner = options.config.getOptionalString('nexora.scm.organization');
      if (!host || !owner) {
        throw new Error(
          'No SCM target is configured. Set nexora.scm.host and ' +
            'nexora.scm.organization in app-config. This is deliberately not ' +
            'defaulted: a fallback organisation is how a hard-coded one ' +
            'survives unnoticed.',
        );
      }

      // NXD-099. This is the first step of every Golden Path, so a missing
      // credential stops the run here — in seconds, before the skeleton is
      // rendered — instead of at publish:github three steps later.
      const readiness = getPublishReadiness(options.config);
      if (!readiness.ready) {
        throw new Error(readiness.message);
      }

      ctx.logger.info(
        `Publishing to ${host}/${owner}/${repo} (from platform configuration).`,
      );
      ctx.output('repoUrl', `${host}?owner=${owner}&repo=${repo}`);
      ctx.output('host', host);
      ctx.output('owner', owner);
    },
  });
}

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

/**
 * Writes the `products` row for a product the task has just published, and
 * gives that row the repository and the Catalog entity it was born with.
 *
 * ## Why an action and not a page
 *
 * A Nexora Product has existed twice and the two halves had never met: the
 * scaffolder made a repository and a Catalog entity, `POST /products` made a
 * governed row, and nothing joined them. So `/products` could not show where
 * the code lives, `/data-products` could not find its governance, and the
 * `Development` tab NXD-056 specified was left unbuilt because it would have
 * had nothing to display. The join is free exactly once — at creation, when
 * both identities are in the same hand. That is this action.
 *
 * ## It runs as the person who started the task
 *
 * `POST /products` authorizes `product.create` against a *user* principal, and
 * refuses a service one by design: a service has no Catalog identity, so the
 * permission policy resolves an empty role set and denies (see the comment on
 * `authorizeService` in `router.ts`). So this uses
 * `ctx.getInitiatorCredentials()` as `onBehalfOf` — the same thing the built-in
 * `catalog:register` does — rather than the own-service credentials the read
 * clients in this plugin use.
 *
 * Two consequences, both wanted. Someone who may not create products cannot
 * create one through a template either, so the template is not a way around
 * the permission. And `createdBy` on the row is the human, not the scaffolder.
 *
 * ## It runs last, and that is the trade-off
 *
 * Three writes to three systems cannot be atomic, so the order decides what a
 * partial failure leaves behind. Last means the expensive, hard-to-undo
 * artifacts — the git repository, the Catalog entity — are already proven when
 * the cheap, reversible one is written. A failure here leaves a repository and
 * an entity with no row, which re-running fixes, because the action is
 * idempotent on the entity ref. The other order would leave a governed record
 * describing a repository that was never created, which in a regulated context
 * is the worse of the two.
 *
 * ## It fails closed
 *
 * A row that cannot be written fails the task, like `verify-urs` above and
 * unlike the policy client's deliberate fail-open (NXD-045). A product whose
 * governance record is missing is not a product this platform can release, and
 * a green task that quietly produced two thirds of one is how the first version
 * of this problem was created.
 */
export function createProductCreateAction(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  /** Injected by tests; production uses global fetch. */
  fetchImpl?: typeof fetch;
}) {
  const doFetch: typeof fetch =
    options.fetchImpl ?? ((...args) => fetch(...args));

  return createTemplateAction({
    id: 'nexora:product:create',
    description:
      'Creates the Composer product record for a scaffolded product, carrying ' +
      'the repository URL and the Catalog entity ref it was created with. ' +
      'Idempotent: a second run against the same entity returns the existing id.',
    schema: {
      input: {
        name: z => z.string().describe('Product name.'),
        productType: z =>
          z
            .string()
            .describe('Product type, e.g. DATA_PRODUCT. Validated server-side.'),
        repositoryUrl: z =>
          z
            .string()
            .describe('Repository the code lives in; publish step remoteUrl.'),
        catalogEntityRef: z =>
          z
            .string()
            .describe(
              'Catalog entity describing it, as kind:namespace/name; register step entityRef.',
            ),
        domain: z => z.string().optional().describe('Business domain.'),
        description: z => z.string().optional().describe('Short description.'),
        owner: z =>
          z
            .string()
            .optional()
            .describe('Owning group entity ref. Defaults to the task initiator.'),
      },
      output: {
        productId: z => z.string().describe('Id of the product record.'),
        productUrl: z =>
          z.string().describe('Path to the product page, for a task link.'),
        created: z =>
          z
            .boolean()
            .describe('False when a product already claimed this entity.'),
      },
    },
    async handler(ctx) {
      const entityRef = ctx.input.catalogEntityRef?.trim();
      if (!entityRef) {
        throw new Error(
          'catalogEntityRef is required. It comes from the catalog:register ' +
            'step, which must run before this one.',
        );
      }

      const base = await options.discovery.getBaseUrl('composer');
      const { token } = await options.auth.getPluginRequestToken({
        // The initiator, not this service. See the note above: the create
        // permission is checked against a user principal and a service token is
        // refused there.
        onBehalfOf: await ctx.getInitiatorCredentials(),
        targetPluginId: 'composer',
      });
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Idempotence first. A scaffolder task can be retried, and a retry must
      // not leave two governed records for one product.
      const existing = await doFetch(
        `${base}/products/by-entity-ref?ref=${encodeURIComponent(entityRef)}`,
        { headers },
      );
      if (existing.ok) {
        const product = (await existing.json()) as { id: string; name: string };
        ctx.logger.info(
          `Product ${product.name} (${product.id}) already claims ${entityRef}. ` +
            'Nothing written.',
        );
        ctx.output('productId', product.id);
        ctx.output('productUrl', `/products/${product.id}`);
        ctx.output('created', false);
        return;
      }
      if (existing.status !== 404) {
        // Anything other than "no product claims it" means the lookup did not
        // answer the question, and creating on top of an unknown state is how
        // duplicates happen.
        throw new Error(
          `Could not check whether ${entityRef} is already claimed: ` +
            `${existing.status} ${await existing.text()}`,
        );
      }

      const response = await doFetch(`${base}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: ctx.input.name,
          productType: ctx.input.productType,
          domain: ctx.input.domain,
          description: ctx.input.description,
          owner: ctx.input.owner,
          repositoryUrl: ctx.input.repositoryUrl,
          catalogEntityRef: entityRef,
        }),
      });

      if (!response.ok) {
        // Verbatim, including the status. A 403 here means the initiator lacks
        // product.create and the task should say so; a 400 names the field.
        throw new Error(
          `Creating the product record failed: ${response.status} ` +
            `${await response.text()}`,
        );
      }

      const product = (await response.json()) as { id: string };
      ctx.logger.info(
        `Product ${product.id} created for ${entityRef}, repository ` +
          `${ctx.input.repositoryUrl}.`,
      );
      ctx.output('productId', product.id);
      ctx.output('productUrl', `/products/${product.id}`);
      ctx.output('created', true);
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
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, discovery, auth, config }) {
        scaffolder.addActions(
          createScmResolveRepoAction({ config }),
          createUrsVerifyBaselineAction({
            discovery,
            auth: auth as never,
          }),
          createProductCreateAction({
            discovery,
            auth: auth as never,
          }),
        );
      },
    });
  },
});
