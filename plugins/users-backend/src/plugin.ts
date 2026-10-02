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
import { applyGuestGroups } from './guestRole';
import { applyDemoUsers, readDemoUsers } from './demoUsers';
import { normalizeBootstrapAdmin, seed } from './db/seeds';
import { parseGithubTeamSyncConfig } from './githubTeamSync';
import { createGithubTeamsClientFromConfig } from './githubTeams';
import {
  disabledTeamSync,
  startTeamSync,
  TeamSyncController,
} from './teamSyncController';

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
        scheduler: coreServices.scheduler,
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
        scheduler,
      }) {
        // NXD-108. Validated before anything else touches the database, so a
        // urs-* group in the mapping stops the backend instead of starting a
        // half-configured one.
        const teamSyncConfig = parseGithubTeamSyncConfig(
          config.getOptional('users.githubTeamSync'),
        );

        const repository = await UsersRepository.create(database);

        // Migrate, then seed once. A restart must never rewrite a role an
        // administrator changed — that is why these records left the YAML
        // file, and the emptiness check is what guarantees it.
        const result = await seed(repository.client(), {
          environment: config.getOptionalString('auth.environment'),
          bootstrapAdmin: normalizeBootstrapAdmin(
            config.getOptional('users.bootstrapAdmin'),
          ),
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

        // After the seed, before the projection: the elevation has to be in
        // the database by the time the Catalog is written from it, because the
        // Catalog entity is what the guest sign-in resolver reads.
        await applyGuestGroups({
          environment: config.getOptionalString('auth.environment'),
          groups: config.getOptionalStringArray('users.guestGroups'),
          repository,
          log: message => logger.info(message),
          warn: message => logger.warn(message),
        });

        // Same placement and the same reason: in the database before the
        // Catalog is written from it, because the Catalog entity is what the
        // sign-in resolver and getUserApprovalRoles both read.
        await applyDemoUsers({
          environment: config.getOptionalString('auth.environment'),
          users: readDemoUsers(
            config.getOptional('users.demoIdentities'),
            message => logger.warn(message),
          ),
          repository,
          log: message => logger.info(message),
          warn: message => logger.warn(message),
        });

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

        // After the projection: the reconciler reads the same table the
        // Catalog was just written from.
        let teamSync: TeamSyncController = disabledTeamSync;
        if (teamSyncConfig?.enabled) {
          teamSync = await startTeamSync({
            config: teamSyncConfig,
            rootConfig: config,
            scheduler,
            client: createGithubTeamsClientFromConfig({
              config,
              organization: teamSyncConfig.organization,
            }),
            repository,
            logger,
          });
        }

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
            repository,
            projection,
            teamSync,
          }),
        );
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
