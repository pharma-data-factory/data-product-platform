import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import {
  ConnectivityInterface,
  ContractView,
  DataProductHealth,
  EquipmentStateView,
  MetricValue,
  ProviderResult,
  unconfiguredResult,
  unavailableResult,
  type CapabilityGroup,
} from '@internal/platform-common';

export interface NexoraMetricsApi {
  getMetrics(entityRef: string): Promise<ProviderResult<MetricValue[]>>;
}

export interface NexoraConnectivityApi {
  getConnectivity(
    entityRef: string,
  ): Promise<ProviderResult<ConnectivityInterface[]>>;
}

export interface NexoraDataQualityApi {
  getQuality(entityRef: string): Promise<ProviderResult<DataProductHealth>>;
}

export interface NexoraContractApi {
  getContract(entityRef: string): Promise<ProviderResult<ContractView>>;
  getCapabilities(
    entityRef: string,
  ): Promise<ProviderResult<CapabilityGroup[]>>;
}

export interface NexoraEquipmentStateApi {
  getState(entityRef: string): Promise<ProviderResult<EquipmentStateView>>;
}

export const nexoraMetricsApiRef = createApiRef<NexoraMetricsApi>({
  id: 'plugin.nexora.metrics',
});

export const nexoraConnectivityApiRef = createApiRef<NexoraConnectivityApi>({
  id: 'plugin.nexora.connectivity',
});

export const nexoraDataQualityApiRef = createApiRef<NexoraDataQualityApi>({
  id: 'plugin.nexora.data-quality',
});

export const nexoraContractApiRef = createApiRef<NexoraContractApi>({
  id: 'plugin.nexora.contracts',
});

export const nexoraEquipmentStateApiRef = createApiRef<NexoraEquipmentStateApi>({
  id: 'plugin.nexora.equipment-state',
});

export class NexoraIndustrialClient
  implements
    NexoraMetricsApi,
    NexoraConnectivityApi,
    NexoraDataQualityApi,
    NexoraContractApi,
    NexoraEquipmentStateApi
{
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  getMetrics(entityRef: string) {
    return this.get<MetricValue[]>('metrics', entityRef);
  }

  getConnectivity(entityRef: string) {
    return this.get<ConnectivityInterface[]>('connectivity', entityRef);
  }

  getQuality(entityRef: string) {
    return this.get<DataProductHealth>('quality', entityRef);
  }

  getContract(entityRef: string) {
    return this.get<ContractView>('contracts', entityRef);
  }

  getCapabilities(entityRef: string) {
    return this.get<CapabilityGroup[]>('capabilities', entityRef);
  }

  getState(entityRef: string) {
    return this.get<EquipmentStateView>('equipment-state', entityRef);
  }

  private async get<T>(
    path: string,
    entityRef: string,
  ): Promise<ProviderResult<T>> {
    try {
      const baseUrl = await this.options.discoveryApi.getBaseUrl(
        'nexora-industrial',
      );
      const response = await this.options.fetchApi.fetch(
        `${baseUrl}/${path}?entityRef=${encodeURIComponent(entityRef)}`,
      );
      if (response.status === 404) {
        return unconfiguredResult(
          'The catalog entity is registered, but no provider is configured.',
        );
      }
      if (response.status === 403) {
        return unavailableResult('Not authorized to read industrial data.', 403);
      }
      if (!response.ok) {
        return unavailableResult(
          'Industrial provider request failed.',
          response.status,
        );
      }
      const payload = (await response.json()) as ProviderResult<T>;
      if (!payload || !payload.status) {
        return { status: 'invalid', message: 'Provider returned invalid data.' };
      }
      return payload;
    } catch {
      return unavailableResult('Industrial provider is unavailable.');
    }
  }
}
