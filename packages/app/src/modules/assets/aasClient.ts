import { useMemo } from 'react';
import {
  DiscoveryApi,
  FetchApi,
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';

export interface AasConnectivity {
  protocol: string;
  topic?: string | null;
  endpoint?: string | null;
  contract?: string | null;
  contractVersion?: string | null;
}

export interface AasProperty {
  id: string;
  idShort: string;
  name: string;
  description?: string | null;
  semanticId?: { keys?: Array<{ value: string }> } | null;
  dataType: string;
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  connectivity?: AasConnectivity | null;
}

export interface AasAsset {
  id: string;
  displayName: string;
  description?: string | null;
  revision: number;
  active: boolean;
  assetInformation: {
    globalAssetId?: string | null;
    assetType?: string | null;
    specificAssetIds: Array<{ name: string; value: string }>;
  };
  context: { site?: string | null; area?: string | null; line?: string | null };
  submodels: Array<{ id: string; idShort: string }>;
  properties: AasProperty[];
  relationships: Array<{
    id: string;
    semanticId: string;
    firstAssetId: string;
    secondAssetId: string;
  }>;
}

async function aasFetch(
  discoveryApi: DiscoveryApi,
  fetchApi: FetchApi,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = await discoveryApi.getBaseUrl('aas');
  return fetchApi.fetch(`${baseUrl}${path}`, init);
}

export function useAasClient() {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  return useMemo(
    () => ({
      listAssets: async () => {
        const response = await aasFetch(discoveryApi, fetchApi, '/assets');
        if (!response.ok) {
          throw new Error('Unable to load assets');
        }
        return (await response.json()) as AasAsset[];
      },
      getAsset: async (assetId: string) => {
        const response = await aasFetch(
          discoveryApi,
          fetchApi,
          `/assets/${encodeURIComponent(assetId)}`,
        );
        if (!response.ok) {
          throw new Error('Asset was not found');
        }
        return (await response.json()) as AasAsset;
      },
      createAsset: async (body: Record<string, unknown>) => {
        const response = await aasFetch(discoveryApi, fetchApi, '/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error('Unable to create asset');
        }
        return (await response.json()) as AasAsset;
      },
      addProperty: async (assetId: string, body: Record<string, unknown>) => {
        const response = await aasFetch(
          discoveryApi,
          fetchApi,
          `/assets/${encodeURIComponent(assetId)}/properties`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );
        if (!response.ok) {
          throw new Error('Unable to add property');
        }
        return response.json();
      },
    }),
    [discoveryApi, fetchApi],
  );
}
