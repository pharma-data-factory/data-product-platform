import path from 'path';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  catalogServiceRef,
  locationSpecToMetadataName,
} from '@backstage/plugin-catalog-node';
import { createRouter } from './router';
import { UsersRepository } from './repository';
import { CatalogUserProjection } from './entityProvider';
import { seed } from './db/seeds';

/** Committed first-install content. Read once, when the table is empty. */
const SEED_FILE = '../../catalog/users.seed.yaml';

/**
 * Derived projection the Catalog reads. Rewritten from the database; never a
 * source of truth. Kept next to the seed so the existing catalog location in
 * app-config needs only its target changed.
 */
const PROJECTION_FILE = '../../catalog/runtime/platform-users.yaml';

export const usersBackendPlugin = createBackendPlugin({
  pluginId: 'users',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        database: coreServices.database,
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        catalog: catalogServiceRef,
      },
      async init({
        httpRouter,
        logger,
        httpAuth,
        permissions,
        database,
        config,
        auth,
        catalog,
      }) {
        const repository = await UsersRepository.create(database);

        // Migrate, then seed once. A restart must never rewrite a role an
        // administrator changed — that is why these records left the YAML
        // file, and the emptiness check is what guarantees it.
        const result = await seed(repository.client(), {
          environment: config.getOptionalString('auth.environment'),
          bootstrapAdmin: config.getOptionalString('users.bootstrapAdmin'),
          seedFile: path.resolve(
            process.cwd(),
            config.getOptionalString('users.seedFile') ?? SEED_FILE,
          ),
          log: message => logger.info(message),
        });
        if (result.reason === 'ALREADY_POPULATED') {
          logger.info(
            'Platform users already present; seed skipped. Role changes and ' +
              'the audit trail persist across restarts.',
          );
        }

        const projectionTarget =
          config.getOptionalString('users.projectionFile') ?? PROJECTION_FILE;
        const locationRef = `location:default/${locationSpecToMetadataName({
          type: 'file',
          target: projectionTarget,
        })}`;
        const projection = new CatalogUserProjection(
          repository,
          path.resolve(process.cwd(), projectionTarget),
          logger,
          async () => {
            const credentials = await auth.getOwnServiceCredentials();
            await catalog.refreshEntity(locationRef, { credentials });
          },
        );
        // Written at startup so the catalog has the current set even after the
        // container replaced whatever the previous one left behind.
        await projection.publish();

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
            repository,
            projection,
          }),
        );
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
