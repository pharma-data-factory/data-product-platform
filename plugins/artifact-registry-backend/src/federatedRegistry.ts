/**
 * Multi-Registry Federation — HTTP Fan-out Client (W3-7 / 7-R2).
 *
 * Queries multiple remote Artifact Registries in parallel and merges the
 * results. Local artifacts always take precedence: if the same coordinate
 * exists locally and in a remote registry, the local version wins.
 *
 * Configuration in app-config.yaml:
 *
 *   artifactRegistry:
 *     federation:
 *       enabled: true
 *       syncIntervalSeconds: 3600
 *       registries:
 *         - id: partner-registry
 *           displayName: "Nexora Partner Registry"
 *           baseUrl: https://registry.nexora-partners.com/api
 *           namespaces: [roche, novartis, pfizer-cmo]
 *           level: READ_ONLY
 *           defaultTrustLevel: PARTNER
 *           includeInMarketplace: true
 */

import type { LoggerService } from '@backstage/backend-plugin-api';
import type { FederatedRegistry, FederatedSearchResult, FederationConfig } from '@internal/platform-common';
import type { RegistryArtifactWithVersions } from '@internal/platform-common';

export interface FederationClient {
  /**
   * Fan out to all enabled remote registries and collect their artifacts.
   * Remote artifacts are enriched with publisherTrustLevel and externalPublisher
   * from the federation configuration.
   */
  searchFederated(options?: {
    kind?: string;
    namespace?: string;
  }): Promise<FederatedSearchResult>;

  /**
   * Fetch artifacts from a single remote registry.
   * Returns null when the registry is unreachable.
   */
  fetchFromRegistry(
    registry: FederatedRegistry,
    options?: { kind?: string; namespace?: string },
  ): Promise<RegistryArtifactWithVersions[] | null>;
}

export function createFederationClient(options: {
  config: FederationConfig;
  fetchImpl?: typeof fetch;
  logger: LoggerService;
}): FederationClient {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const { config, logger } = options;

  async function fetchFromRegistry(
    registry: FederatedRegistry,
    queryOptions?: { kind?: string; namespace?: string },
  ): Promise<RegistryArtifactWithVersions[] | null> {
    try {
      const url = new URL(`${registry.baseUrl.replace(/\/$/, '')}/artifacts`);
      url.searchParams.set('includeVersions', 'true');
      if (queryOptions?.kind) url.searchParams.set('kind', queryOptions.kind);
      if (queryOptions?.namespace) url.searchParams.set('namespace', queryOptions.namespace);

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (registry.apiKey) headers.Authorization = `Bearer ${registry.apiKey}`;

      const res = await doFetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        logger.warn(`Federation: registry "${registry.id}" returned HTTP ${res.status}`);
        return null;
      }

      const artifacts = (await res.json()) as RegistryArtifactWithVersions[];

      // Filter to declared namespaces; enrich with trust from federation config.
      return artifacts
        .filter(
          a =>
            registry.namespaces.length === 0 ||
            registry.namespaces.includes(a.namespace),
        )
        .map(a => ({
          ...a,
          publisherTrustLevel: registry.defaultTrustLevel,
          externalPublisher: true,
        }));
    } catch (err) {
      logger.warn(
        `Federation: failed to reach registry "${registry.id}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  return {
    fetchFromRegistry,

    async searchFederated(queryOptions) {
      if (!config.enabled) {
        return { local: [], remote: [], unreachable: [] };
      }

      const enabled = config.registries.filter(r => r.enabled);
      const results = await Promise.allSettled(
        enabled.map(async registry => ({
          registry,
          artifacts: await fetchFromRegistry(registry, queryOptions),
        })),
      );

      const remote: FederatedSearchResult['remote'] = [];
      const unreachable: string[] = [];

      for (const result of results) {
        if (result.status === 'rejected') continue;
        const { registry, artifacts } = result.value;
        if (!artifacts) {
          unreachable.push(registry.id);
          continue;
        }
        for (const artifact of artifacts) {
          remote.push({
            registryId: registry.id,
            namespace: artifact.namespace,
            name: artifact.name,
            version: artifact.versions?.[0]?.version ?? 'unknown',
            displayName: undefined,
            kind: artifact.versions?.[0]?.manifest
              ? (artifact.versions[0].manifest as { kind?: string }).kind ?? 'COMPONENT'
              : 'COMPONENT',
            lifecycle: artifact.versions?.[0]?.lifecycle ?? 'DRAFT',
            certificationStatus: artifact.versions?.[0]?.certificationStatus,
            trustLevel: registry.defaultTrustLevel,
          });
        }
      }

      return { local: [], remote, unreachable };
    },
  };
}

/**
 * Load federation config from Backstage app-config.yaml.
 * Returns a disabled config when the section is absent.
 */
export function loadFederationConfig(
  config: { getOptionalConfig?(key: string): { getBoolean?(k: string): boolean; getOptionalNumber?(k: string): number | undefined; getOptionalConfigArray?(k: string): Array<{ getString(k: string): string; getOptionalString(k: string): string | undefined; getStringArray(k: string): string[]; getOptionalBoolean(k: string): boolean | undefined }> } | undefined },
): FederationConfig {
  const section = config.getOptionalConfig?.('artifactRegistry.federation');
  if (!section) return { enabled: false, registries: [] };

  const enabled = section.getBoolean?.('enabled') ?? false;
  const syncIntervalSeconds = section.getOptionalNumber?.('syncIntervalSeconds') ?? 3600;
  const registryConfigs = section.getOptionalConfigArray?.('registries') ?? [];

  const registries: FederatedRegistry[] = registryConfigs.map(rc => ({
    id: rc.getString('id'),
    displayName: rc.getString('displayName'),
    baseUrl: rc.getString('baseUrl'),
    namespaces: rc.getStringArray('namespaces'),
    level: (rc.getOptionalString('level') ?? 'READ_ONLY') as FederatedRegistry['level'],
    defaultTrustLevel: (rc.getOptionalString('defaultTrustLevel') ?? 'COMMUNITY') as FederatedRegistry['defaultTrustLevel'],
    includeInMarketplace: rc.getOptionalBoolean('includeInMarketplace') ?? false,
    apiKey: rc.getOptionalString('apiKey'),
    enabled: rc.getOptionalBoolean('enabled') ?? true,
  }));

  return { enabled, registries, syncIntervalSeconds };
}
