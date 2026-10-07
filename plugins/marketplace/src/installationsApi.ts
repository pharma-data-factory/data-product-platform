/**
 * The Marketplace's client of the installations store (NXD-141).
 *
 * Installing is the one act the Marketplace performs, and the store decides
 * everything about it: whether the version is installable, whether the
 * configuration is valid, and whether the act is a signature or a
 * confirmation (NXD-139, NXD-140). This client carries the request and hands
 * back the store's reason verbatim when it refuses.
 *
 * Upgrade and removal stay out of it until the Marketplace offers them.
 */

import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import {
  messageFromErrorBody,
  type ArtifactInstallation,
  type GmpClassificationSource,
  type InstallationConfig,
  type InstallationSignatureInput,
  type RuntimeTarget,
} from '@internal/platform-common';

export interface GmpClassificationView {
  gmpRelevant: boolean;
  source: GmpClassificationSource;
}

export interface InstallRequestView {
  targetId: string;
  /** `namespace/name@version`. */
  artifactRef: string;
  name?: string;
  config: InstallationConfig;
  signature: InstallationSignatureInput;
}

export interface InstallationsApi {
  listTargets(): Promise<RuntimeTarget[]>;
  listInstallations(): Promise<ArtifactInstallation[]>;
  gmpClassification(namespace: string, name: string): Promise<GmpClassificationView>;
  install(request: InstallRequestView): Promise<ArtifactInstallation>;
}

export const installationsApiRef = createApiRef<InstallationsApi>({
  id: 'plugin.marketplace.installations',
});

export class InstallationsClient implements InstallationsApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = await this.options.discoveryApi.getBaseUrl('installations');
    const response = await this.options.fetchApi.fetch(`${baseUrl}${path}`, init);
    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new Error(
        messageFromErrorBody(
          body,
          `Installations returned ${response.status} ${response.statusText}`,
        ),
      );
    }
    return (await response.json()) as T;
  }

  async listTargets(): Promise<RuntimeTarget[]> {
    return (await this.request<{ items: RuntimeTarget[] }>('/targets')).items;
  }

  async listInstallations(): Promise<ArtifactInstallation[]> {
    return (await this.request<{ items: ArtifactInstallation[] }>('/installations'))
      .items;
  }

  async gmpClassification(
    namespace: string,
    name: string,
  ): Promise<GmpClassificationView> {
    return this.request<GmpClassificationView>(
      `/artifacts/${encodeURIComponent(namespace)}/${encodeURIComponent(
        name,
      )}/gmp-classification`,
    );
  }

  async install(request: InstallRequestView): Promise<ArtifactInstallation> {
    return this.request<ArtifactInstallation>('/installations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }
}
