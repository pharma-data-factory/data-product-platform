import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

import { CertificationStatus } from './model';
import {
  DataProductCiStatus,
  sanitizeCiStatus,
  unknownCiStatus,
} from './ciStatus';

export interface DataProductCiApi {
  getCiStatus(entityRef: string): Promise<DataProductCiStatus>;
  setCertification(
    entityRef: string,
    status: CertificationStatus,
  ): Promise<{ ok: boolean; status: string }>;
}

export const dataProductCiApiRef = createApiRef<DataProductCiApi>({
  id: 'plugin.data-products.ci-status',
});

export class DataProductCiClient implements DataProductCiApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  async getCiStatus(entityRef: string): Promise<DataProductCiStatus> {
    try {
      const baseUrl = await this.options.discoveryApi.getBaseUrl(
        'data-products',
      );
      const response = await this.options.fetchApi.fetch(
        `${baseUrl}/ci-status?entityRef=${encodeURIComponent(entityRef)}`,
      );
      if (!response.ok) {
        return unknownCiStatus();
      }
      return sanitizeCiStatus(await response.json());
    } catch {
      return unknownCiStatus();
    }
  }

  async setCertification(
    entityRef: string,
    status: CertificationStatus,
  ): Promise<{ ok: boolean; status: string }> {
    const baseUrl = await this.options.discoveryApi.getBaseUrl('data-products');
    const response = await this.options.fetchApi.fetch(
      `${baseUrl}/certification`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityRef, status }),
      },
    );
    if (!response.ok) {
      throw new Error('Not allowed to manage technical certification');
    }
    return response.json();
  }
}
