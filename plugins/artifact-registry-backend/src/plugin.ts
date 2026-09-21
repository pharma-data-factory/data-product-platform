/**
 * Artifact Registry Backend Plugin
 *
 * Mounts the registry's HTTP surface over the persistent repository. What an
 * Artifact is and which lifecycle acts are allowed stays in the service; this
 * file only wires the Backstage services it needs.
 */

import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import {
  loadManifestsFromDisk,
  resolveManifestDirectory,
} from './manifestLoader';
import { ArtifactRegistryRepository } from './repository';
import { ArtifactRegistryService } from './service';

export const DEFAULT_MANIFEST_DIRECTORY = 'catalog/artifacts';

export const artifactRegistryPlugin = createBackendPlugin({
  pluginId: 'artifact-registry',
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
      async init({
        httpRouter,
        logger,
        httpAuth,
        permissions,
        database,
        config,
      }) {
        const repository = await ArtifactRegistryRepository.create(database);
        const service = new ArtifactRegistryService(repository);

        httpRouter.use(
          await createRouter({ logger, httpAuth, permissions, service }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });

        // Manifests on disk are the registry's content source. Loading them
        // here rather than in a migration keeps them data the platform reads,
        // not schema it is pinned to, so a manifest can be corrected by
        // editing a file and restarting.
        //
        // Wrapped because startup must survive bad content: the alternative is
        // a malformed manifest taking the whole backend down.
        const directory = resolveManifestDirectory(
          config.getOptionalString('artifactRegistry.manifests.directory') ??
            DEFAULT_MANIFEST_DIRECTORY,
        );
        try {
          await loadManifestsFromDisk({ directory, service, logger });
        } catch (error) {
          logger.warn(
            `Artifact manifest load failed; the registry keeps whatever it ` +
              `already held: ${
                error instanceof Error ? error.message : String(error)
              }`,
          );
        }

        // A-3: Multi-registry sync scheduler — starts a periodic fan-out when
        // federation is enabled in app-config.yaml.
        try {
          const { createFederationClient, loadFederationConfig } = await import('./federatedRegistry');
          const fedConfig = loadFederationConfig(config as any);
          if (fedConfig.enabled && fedConfig.registries.length > 0) {
            const fedClient = createFederationClient({ config: fedConfig, logger });
            const intervalMs = (fedConfig.syncIntervalSeconds ?? 3600) * 1000;
            logger.info(
              `Federation: ${fedConfig.registries.filter(r => r.enabled).length} registries, sync every ${fedConfig.syncIntervalSeconds ?? 3600}s`,
            );
            // Initial sync + periodic schedule
            const runSync = async () => {
              const result = await fedClient.searchFederated();
              logger.info(
                `Federation sync: ${result.remote.length} remote artifacts, ` +
                  `${result.unreachable.length} unreachable registries`,
              );
            };
            runSync().catch(err => logger.warn(`Federation initial sync failed: ${err}`));
            setInterval(() => runSync().catch(err => logger.warn(`Federation sync failed: ${err}`)), intervalMs);
          }
        } catch {
          // Federation is best-effort; its failure must not prevent startup.
        }

        logger.info('Artifact Registry backend plugin v0.1 mounted');
      },
    });
  },
});
