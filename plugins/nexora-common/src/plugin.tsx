import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import {
  NexoraIndustrialClient,
  nexoraConnectivityApiRef,
  nexoraContractApiRef,
  nexoraDataQualityApiRef,
  nexoraEquipmentStateApiRef,
  nexoraMetricsApiRef,
} from './api';

const deps = {
  discoveryApi: discoveryApiRef,
  fetchApi: fetchApiRef,
};

function factory({
  discoveryApi,
  fetchApi,
}: {
  discoveryApi: { getBaseUrl(pluginId: string): Promise<string> };
  fetchApi: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
}) {
  return new NexoraIndustrialClient({ discoveryApi, fetchApi });
}

const metricsApi = ApiBlueprint.make({
  name: 'metrics',
  params: defineParams =>
    defineParams({ api: nexoraMetricsApiRef, deps, factory }),
});

const connectivityApi = ApiBlueprint.make({
  name: 'connectivity',
  params: defineParams =>
    defineParams({ api: nexoraConnectivityApiRef, deps, factory }),
});

const dataQualityApi = ApiBlueprint.make({
  name: 'data-quality',
  params: defineParams =>
    defineParams({ api: nexoraDataQualityApiRef, deps, factory }),
});

const contractApi = ApiBlueprint.make({
  name: 'contracts',
  params: defineParams =>
    defineParams({ api: nexoraContractApiRef, deps, factory }),
});

const equipmentStateApi = ApiBlueprint.make({
  name: 'equipment-state',
  params: defineParams =>
    defineParams({ api: nexoraEquipmentStateApiRef, deps, factory }),
});

export const nexoraCommonPlugin = createFrontendPlugin({
  pluginId: 'nexora-common',
  extensions: [
    metricsApi,
    connectivityApi,
    dataQualityApi,
    contractApi,
    equipmentStateApi,
  ],
});
