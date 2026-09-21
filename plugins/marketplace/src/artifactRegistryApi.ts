/**
 * Read access to the Artifact Registry from the Marketplace.
 *
 * The Marketplace is a frontend plugin and the registry is a backend one
 * behind `artifact.read`, so this goes over HTTP like any other consumer
 * rather than reaching into the registry's tables. That is the boundary the
 * registry was given a permissioned API for: when the Marketplace becomes one
 * consumer among several, none of them gets a private path.
 *
 * Read-only on purpose. Registering, reviewing, certifying and publishing are
 * producer acts with their own permissions; a discovery surface has no
 * business holding a client that can perform them.
 */

import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type { RegistryArtifactWithVersions } from '@internal/platform-common';

export interface ArtifactRegistryApi {
  /** Every artifact with its versions and manifests embedded. */
  listArtifactsWithVersions(): Promise<RegistryArtifactWithVersions[]>;
}

export const artifactRegistryApiRef = createApiRef<ArtifactRegistryApi>({
  id: 'plugin.marketplace.artifact-registry',
});

export class ArtifactRegistryClient implements ArtifactRegistryApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  async listArtifactsWithVersions(): Promise<RegistryArtifactWithVersions[]> {
    const baseUrl = await this.options.discoveryApi.getBaseUrl(
      'artifact-registry',
    );
    const response = await this.options.fetchApi.fetch(
      `${baseUrl}/artifacts?includeVersions=true`,
    );
    if (!response.ok) {
      throw new Error(
        `Artifact registry returned ${response.status} ${response.statusText}`,
      );
    }
    return (await response.json()) as RegistryArtifactWithVersions[];
  }
}
