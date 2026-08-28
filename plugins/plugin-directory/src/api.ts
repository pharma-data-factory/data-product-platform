import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

export type PluginType =
  | 'PLATFORM'
  | 'DOMAIN'
  | 'INDUSTRIAL'
  | 'VALIDATION'
  | 'INTEGRATION'
  | 'EXPERIMENTAL';

export type PluginLifecycle =
  | 'ENABLED'
  | 'DISABLED'
  | 'DEVELOPMENT'
  | 'DEPRECATED';

export type PluginValidationStatus =
  | 'NOT_VALIDATED'
  | 'VALIDATION_IN_PROGRESS'
  | 'VALIDATED'
  | 'NOT_APPLICABLE'
  | 'NOT_ESTABLISHED';

export interface NexoraPluginDescriptor {
  id: string;
  name: string;
  description?: string;
  frontendPackage?: string;
  backendPackage?: string;
  version?: string;
  type: PluginType;
  lifecycle: PluginLifecycle;
  frontendRoute?: string;
  backendRoute?: string;
  permissions?: string[];
  owner?: string;
  source: string;
  validationStatus: PluginValidationStatus;
  validationReference?: string;
  dependencies?: string[];
  runtimeLoaded?: boolean;
  frontendLoaded?: boolean;
  backendLoaded?: boolean;
  experimental?: boolean;
  presentInWorkspace?: boolean;
}

export interface PluginDirectorySummary {
  total: number;
  enabled: number;
  development: number;
  disabled: number;
  deprecated: number;
  validationRelevant: number;
  backstageCoreVersion?: string;
}

export interface PluginDirectoryListResponse {
  items: NexoraPluginDescriptor[];
  summary: PluginDirectorySummary;
}

export const pluginDirectoryApiRef = createApiRef<PluginDirectoryApi>({
  id: 'plugin.plugin-directory.service',
});

export interface PluginDirectoryApi {
  listPlugins(query?: {
    q?: string;
    type?: string;
    lifecycle?: string;
    validationStatus?: string;
  }): Promise<PluginDirectoryListResponse>;
  getPlugin(id: string): Promise<NexoraPluginDescriptor>;
  getSummary(): Promise<PluginDirectorySummary>;
}

export class PluginDirectoryClient implements PluginDirectoryApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async json<T>(path: string): Promise<T> {
    const base = await this.discoveryApi.getBaseUrl('plugin-directory');
    const response = await this.fetchApi.fetch(`${base}${path}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  async listPlugins(query: {
    q?: string;
    type?: string;
    lifecycle?: string;
    validationStatus?: string;
  } = {}): Promise<PluginDirectoryListResponse> {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.type) params.set('type', query.type);
    if (query.lifecycle) params.set('lifecycle', query.lifecycle);
    if (query.validationStatus) {
      params.set('validationStatus', query.validationStatus);
    }
    const qs = params.toString();
    return this.json(`/plugins${qs ? `?${qs}` : ''}`);
  }

  getPlugin(id: string): Promise<NexoraPluginDescriptor> {
    return this.json(`/plugins/${encodeURIComponent(id)}`);
  }

  getSummary(): Promise<PluginDirectorySummary> {
    return this.json('/summary');
  }
}
