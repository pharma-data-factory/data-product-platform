import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

export const modelCompanyApiRef = createApiRef<ModelCompanyApi>({
  id: 'plugin.model-company.service',
});

export interface CampaignView {
  productFamily: string;
  phase: string;
  drugProduct: Record<string, unknown>;
  assembly: Record<string, unknown>;
  packaging: Record<string, unknown>;
  finishedGoods: Record<string, unknown>;
  genealogy: Array<{ from: string; to: string; relation: string }>;
  serialSample: unknown[];
}

export interface Overview {
  companyName: string;
  companyId: string;
  siteId: string;
  siteName: string;
  classification: {
    environment: string;
    dataClassification: string;
    gxpScope: string;
    productionUse: boolean;
  };
  simulation: 'STOPPED' | 'RUNNING';
  unsRoot: string;
  unsStatus: string;
  brokerStatus: string;
  currentScenario: string;
  simulationSpeed: number;
  currentOrders: number;
  activeBatches: number;
  activeLines: number;
  equipmentCount: number;
  equipmentRunning: number;
  equipmentStopped: number;
  eventsLive: boolean;
  eventsPerSec: number;
  publishers: number;
  topicCount: number;
  labels: { syntheticData: string; nonGxp: string };
  connectivity?: {
    simulation: 'STOPPED' | 'RUNNING';
    runtime: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
    mqtt: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN' | 'NOT_CONFIGURED';
    uns: 'ACTIVE' | 'IDLE' | 'NOT_CONNECTED';
    oee: 'CONNECTED' | 'INSUFFICIENT_DATA' | 'NOT_CONNECTED' | 'NOT_CONFIGURED';
  };
}


export interface UnsMessageView {
  topic: string;
  qos: number;
  retained: boolean;
  informationType: string;
  schemaId: string;
  valid: boolean;
  envelope: {
    schemaVersion: string;
    eventId: string;
    timestamp: string;
    dataQuality: string;
    payload: Record<string, unknown>;
  };
}

export interface PublicModelCompanyDemo {
  overview: Overview;
  factory: unknown;
  equipment: unknown[];
  orders: unknown[];
  batches: unknown[];
  genealogy: unknown[];
  warehouse: unknown[];
}

export interface ModelCompanyApi {
  getPublicDemo(): Promise<PublicModelCompanyDemo>;
  getOverview(): Promise<Overview>;
  getFactory(): Promise<unknown>;
  getLines(): Promise<{ items: unknown[] }>;
  getEquipment(): Promise<{ items: unknown[] }>;
  getOrders(): Promise<{ items: unknown[] }>;
  getBatches(): Promise<{ items: unknown[] }>;
  getGenealogy(): Promise<{ items: unknown[] }>;
  getCampaign(): Promise<CampaignView>;
  getWarehouse(): Promise<{ items: unknown[] }>;
  getScenarios(): Promise<{ items: unknown[]; current: string }>;
  getEvents(limit?: number): Promise<{ items: unknown[] }>;
  getDataProducts(): Promise<{
    items: Array<{
      id: string;
      name: string;
      status: string;
      detail: string;
      goldenPath: string;
      unsCompatibility?: string;
    }>;
  }>;
  getTraceability(equipmentId: string): Promise<unknown>;
  getUnsTree(): Promise<unknown>;
  getUnsHealth(): Promise<unknown>;
  getUnsTopics(): Promise<{ items: UnsMessageView[] }>;
  getUnsTopic(path: string): Promise<UnsMessageView>;
  start(speed?: number): Promise<unknown>;
  stop(): Promise<unknown>;
  reset(seed?: number): Promise<unknown>;
  runScenario(scenarioId: string, seed?: number): Promise<unknown>;
}

export class ModelCompanyClient implements ModelCompanyApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  private async url(path: string) {
    const base = await this.options.discoveryApi.getBaseUrl('model-company');
    return `${base}${path}`;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.options.fetchApi.fetch(await this.url(path));
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 180);
      throw new Error(
        `Model Company API ${path} failed: ${response.status}${
          detail ? ` — ${detail}` : ''
        }`,
      );
    }
    return response.json() as Promise<T>;
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.options.fetchApi.fetch(await this.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 180);
      throw new Error(
        `Model Company API ${path} failed: ${response.status}${
          detail ? ` — ${detail}` : ''
        }`,
      );
    }
    return response.json() as Promise<T>;
  }

  getPublicDemo() {
    return this.get<PublicModelCompanyDemo>('/public/demo');
  }

  getOverview() {
    return this.get<Overview>('/overview');
  }

  getFactory() {
    return this.get<unknown>('/factory');
  }

  getLines() {
    return this.get<{ items: unknown[] }>('/lines');
  }

  getEquipment() {
    return this.get<{ items: unknown[] }>('/equipment');
  }

  getOrders() {
    return this.get<{ items: unknown[] }>('/orders');
  }

  getBatches() {
    return this.get<{ items: unknown[] }>('/batches');
  }

  getGenealogy() {
    return this.get<{ items: unknown[] }>('/genealogy');
  }

  getCampaign() {
    return this.get<CampaignView>('/campaign');
  }

  getWarehouse() {
    return this.get<{ items: unknown[] }>('/warehouse');
  }

  getScenarios() {
    return this.get<{ items: unknown[]; current: string }>('/scenarios');
  }

  getEvents(limit = 100) {
    return this.get<{ items: unknown[] }>(`/events?limit=${limit}`);
  }

  getDataProducts() {
    return this.get<{
      items: Array<{
        id: string;
        name: string;
        status: string;
        detail: string;
        goldenPath: string;
        unsCompatibility?: string;
      }>;
    }>('/data-products');
  }

  getTraceability(equipmentId: string) {
    return this.get<unknown>(
      `/traceability/${encodeURIComponent(equipmentId)}`,
    );
  }

  getUnsTree() {
    return this.get<unknown>('/uns/tree');
  }

  getUnsHealth() {
    return this.get<unknown>('/uns/health');
  }

  getUnsTopics() {
    return this.get<{ items: UnsMessageView[] }>('/uns/topics');
  }

  getUnsTopic(path: string) {
    return this.get<UnsMessageView>(
      `/uns/topics?path=${encodeURIComponent(path)}`,
    );
  }

  start(speed?: number) {
    return this.post<unknown>(
      '/simulation/start',
      speed !== undefined ? { speed } : {},
    );
  }

  stop() {
    return this.post<unknown>('/simulation/stop');
  }

  reset(seed = 42) {
    return this.post<unknown>('/simulation/reset', { seed });
  }

  runScenario(scenarioId: string, seed?: number) {
    return this.post<unknown>('/scenarios/run', { scenarioId, seed });
  }
}
