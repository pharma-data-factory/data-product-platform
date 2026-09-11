import type { LoggerService } from '@backstage/backend-plugin-api';
import { loadFactoryModel, validateFactoryModel } from './factory';
import {
  advanceTick,
  applyScenario,
  createInitialState,
  setSpeed,
} from './engine';
import { campaignValueStream } from './autoinjectorCampaign';
import { RuntimeMqttBridge } from './mqttBridge';
import { SCENARIO_DEFINITIONS, scenarioById } from './scenarios';
import { FileSimulationStore } from './store';
import type {
  DataProductStatusView,
  FactoryModel,
  OverviewSnapshot,
  ScenarioId,
  SimulationSpeed,
  SimulationState,
  UnsMessage,
} from './types';
import { buildUnsTree, unsConfigFromModel } from './uns/topics';

function mapUnsStatus(
  uns: import('./types').UnsLinkStatus | string,
): 'HEALTHY' | 'IDLE' | 'NOT_CONNECTED' {
  if (uns === 'ACTIVE') {
    return 'HEALTHY';
  }
  if (uns === 'IDLE') {
    return 'IDLE';
  }
  return 'NOT_CONNECTED';
}

function mapBrokerStatus(
  mqtt: import('./types').MqttLinkStatus | string,
  brokerConfigured: boolean | undefined,
): 'CONNECTED' | 'DISCONNECTED' | 'CONFIGURED' | 'NOT_CONFIGURED' {
  if (mqtt === 'CONNECTED') {
    return 'CONNECTED';
  }
  if (mqtt === 'DISCONNECTED') {
    return 'DISCONNECTED';
  }
  if (brokerConfigured) {
    return 'CONFIGURED';
  }
  return 'NOT_CONFIGURED';
}

function resolveDataProductProbeUrl(
  bindingId: string,
  probes: NonNullable<ModelCompanyServiceOptions['integrationProbes']>,
): string | undefined {
  if (bindingId.includes('oee')) {
    return probes.oee;
  }
  if (bindingId.includes('equipment')) {
    return probes.equipment;
  }
  if (bindingId.includes('temperature')) {
    return probes.temperature;
  }
  return undefined;
}

export interface ModelCompanyServiceOptions {
  factoryPath: string;
  store: FileSimulationStore;
  logger: LoggerService;
  runtimeBaseUrl?: string;
  brokerConfigured?: boolean;
  integrationProbes?: {
    oee?: string;
    equipment?: string;
    temperature?: string;
  };
}

export class ModelCompanyService {
  private readonly model: FactoryModel;
  private state: SimulationState;
  private timer?: NodeJS.Timeout;
  private readonly recentMessages: UnsMessage[] = [];
  private readonly latestByTopic = new Map<string, UnsMessage>();
  private readonly mqttBridge?: RuntimeMqttBridge;

  constructor(private readonly options: ModelCompanyServiceOptions) {
    this.model = loadFactoryModel(options.factoryPath);
    if (options.runtimeBaseUrl) {
      this.mqttBridge = new RuntimeMqttBridge(options.runtimeBaseUrl, options.logger);
    }
    const errors = validateFactoryModel(this.model);
    if (errors.length) {
      options.logger.warn(`Factory model validation warnings: ${errors.join('; ')}`);
    }
    const loaded = options.store.loadState() as SimulationState | undefined;
    if (loaded && loaded.equipment && typeof loaded.tick === 'number') {
      // Migrate missing UNS fields on older persisted state
      for (const eq of Object.values(loaded.equipment)) {
        if (!(eq as { availability?: string }).availability) {
          (eq as { availability: string }).availability = 'ONLINE';
        }
        if ((eq as { targetSpeed?: number }).targetSpeed === undefined) {
          (eq as { targetSpeed: number }).targetSpeed = 300;
        }
      }
      this.state = { ...loaded };
    } else {
      this.state = createInitialState(this.model);
    }
    if (this.state.status === 'RUNNING') {
      this.startTicker();
    }
  }

  getModel(): FactoryModel {
    return this.model;
  }

  getUnsConfig() {
    return unsConfigFromModel(this.model);
  }

  getUnsTree() {
    return buildUnsTree(this.model, unsConfigFromModel(this.model));
  }

  async getOverview(): Promise<OverviewSnapshot> {
    const site = this.model.sites[0];
    const eqList = Object.values(this.state.equipment);
    const running = eqList.filter(e => e.state === 'RUNNING').length;
    const stopped = eqList.filter(
      e =>
        e.state !== 'RUNNING' &&
        e.state !== 'SETUP' &&
        e.state !== 'CHANGEOVER',
    ).length;
    const activeLines = new Set(
      eqList.filter(e => e.state === 'RUNNING' || e.state === 'SETUP').map(e => e.lineId),
    ).size;
    const tree = this.getUnsTree();
    const topicCount =
      tree.equipment.reduce((n, e) => n + e.topics.length, 0) +
      tree.businessTopics.length;

    const connectivity = await this.resolveConnectivity();

    return {
      companyName: this.model.company.name,
      companyId: this.model.company.id,
      siteId: site?.id ?? 'MODEL-PHARMA-01',
      siteName: site?.displayName ?? site?.name ?? 'Model Pharma Plant',
      classification: this.model.company.classification,
      simulation: this.state.status,
      unsRoot: this.model.uns.root,
      unsStatus: mapUnsStatus(connectivity.uns),
      brokerStatus: mapBrokerStatus(
        connectivity.mqtt,
        this.options.brokerConfigured,
      ),
      currentScenario: this.state.scenarioName,
      simulationSpeed: this.state.speed,
      currentOrders: this.state.orders.filter(
        o => o.status === 'IN_PROCESS' || o.status === 'BLOCKED_MATERIAL',
      ).length,
      activeBatches: this.state.batches?.length
        ? this.state.batches.filter(
            b => b.status === 'IN_PROCESS' || b.status === 'QUALITY_HOLD',
          ).length
        : this.state.orders.filter(o => o.status === 'IN_PROCESS').length,
      activeLines:
        this.state.status === 'RUNNING'
          ? Math.max(activeLines, this.model.lines.length)
          : activeLines,
      equipmentCount: this.model.equipment.length,
      equipmentRunning: running,
      equipmentStopped: stopped,
      eventsLive: this.state.status === 'RUNNING',
      eventsPerSec: this.state.eventsPerSec,
      publishers: 4,
      topicCount,
      labels: {
        syntheticData: 'SYNTHETIC DATA',
        nonGxp: 'NON-GXP DEMONSTRATION ENVIRONMENT',
      },
      connectivity,
    };
  }

  private async resolveConnectivity(): Promise<import('./types').ConnectivityStatus> {
    const simulation = this.state.status;

    if (!this.mqttBridge) {
      return {
        simulation,
        runtime: 'NOT_CONFIGURED',
        mqtt: 'NOT_CONFIGURED',
        uns: 'NOT_CONNECTED',
        oee: await this.probeOeeStatus(),
        detail: { oeeHealthUrl: this.options.integrationProbes?.oee },
      };
    }

    const bridge = await this.mqttBridge.probe();
    const runtime = bridge.runtimeReachable ? 'CONNECTED' : 'DISCONNECTED';
    let mqtt: import('./types').MqttLinkStatus = 'UNKNOWN';
    if (bridge.mqttConnected === true) {
      mqtt = 'CONNECTED';
    } else if (bridge.mqttConnected === false) {
      mqtt = 'DISCONNECTED';
    } else if (!bridge.runtimeReachable) {
      mqtt = 'DISCONNECTED';
    }

    let uns: import('./types').UnsLinkStatus = 'NOT_CONNECTED';
    if (runtime === 'CONNECTED' && mqtt === 'CONNECTED') {
      if (this.state.status === 'RUNNING' || Boolean(bridge.lastSuccessAt)) {
        uns = 'ACTIVE';
      } else {
        uns = 'IDLE';
      }
    }

    return {
      simulation,
      runtime,
      mqtt,
      uns,
      oee: await this.probeOeeStatus(),
      detail: {
        runtimeBaseUrl: bridge.runtimeBaseUrl,
        runtimeError: bridge.lastError,
        lastMqttPublishAt: bridge.lastSuccessAt,
        oeeHealthUrl: this.options.integrationProbes?.oee,
      },
    };
  }

  private async probeOeeStatus(): Promise<import('./types').OeeLinkStatus> {
    const url = this.options.integrationProbes?.oee;
    if (!url) {
      return 'NOT_CONFIGURED';
    }
    try {
      const health = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!health.ok) {
        return 'NOT_CONNECTED';
      }
      const base = url.replace(/\/health\/?$/, '');
      const oeeRes = await fetch(`${base}/api/v1/oee/CHECKWEIGHER-01?window=hour`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!oeeRes.ok) {
        return 'INSUFFICIENT_DATA';
      }
      const body = (await oeeRes.json()) as {
        source?: string;
        calculationStatus?: string;
        oee?: number | null;
      };
      if (body.source === 'fixture') {
        return 'NOT_CONNECTED';
      }
      const status = String(body.calculationStatus ?? '').toUpperCase();
      if (
        status.includes('INSUFFICIENT') ||
        body.oee === null ||
        body.oee === undefined
      ) {
        return 'INSUFFICIENT_DATA';
      }
      return 'CONNECTED';
    } catch {
      return 'NOT_CONNECTED';
    }
  }

  async getUnsHealth() {
    const overview = await this.getOverview();
    return {
      broker: overview.brokerStatus,
      uns: overview.unsStatus,
      publishers: overview.publishers,
      topics: overview.topicCount,
      eventsPerSec: overview.eventsPerSec,
      staleSources: Object.values(this.state.equipment).filter(
        e => e.availability === 'DEGRADED' || e.availability === 'OFFLINE',
      ).length,
      note: 'Subscribers count requires live broker introspection — not measured in v0.1 Control Plane buffer.',
    };
  }

  getState(): SimulationState {
    return this.state;
  }

  getSites() {
    return this.model.sites;
  }

  getLines() {
    return this.model.lines;
  }

  getEquipment() {
    return this.model.equipment.map(eq => ({
      ...eq,
      runtime: this.state.equipment[eq.id],
    }));
  }

  getOrders() {
    return this.state.orders;
  }

  getWarehouse() {
    return this.state.warehouse;
  }

  listScenarios() {
    const autoinjector = this.model.sites.some(s =>
      s.areas.some(a => a.id === 'DRUG-PRODUCT'),
    );
    if (autoinjector) {
      return SCENARIO_DEFINITIONS.filter(s => s.id.startsWith('SCN-AI-'));
    }
    return SCENARIO_DEFINITIONS.filter(s => !s.id.startsWith('SCN-AI-'));
  }

  getBatches() {
    return this.state.batches ?? [];
  }

  getGenealogy() {
    return this.state.genealogy ?? [];
  }

  getSerials() {
    return this.state.serials ?? [];
  }

  getCampaign() {
    return campaignValueStream(this.state);
  }

  getMessages(limit = 100): UnsMessage[] {
    const fromMemory = this.recentMessages.slice(0, limit);
    if (fromMemory.length >= limit) {
      return fromMemory;
    }
    const fromDisk = this.options.store.readMessages(limit);
    const merged = [...fromMemory];
    for (const msg of fromDisk) {
      if (!merged.find(e => e.envelope.eventId === msg.envelope.eventId)) {
        merged.push(msg);
      }
    }
    return merged.slice(0, limit);
  }

  /** Legacy alias for /events */
  getEvents(limit = 100) {
    return this.getMessages(limit).map(m => ({
      eventId: m.envelope.eventId,
      eventType: m.informationType,
      timestamp: m.envelope.timestamp,
      siteId: m.envelope.siteId,
      lineId: m.envelope.lineId ?? undefined,
      source: m.envelope.equipmentId ?? m.envelope.sourceSystem,
      orderId: m.envelope.orderId ?? undefined,
      batch: m.envelope.batchId ?? undefined,
      payload: m.envelope.payload,
      topic: m.topic,
      qos: m.qos,
      retained: m.retained,
      schemaId: m.schemaId,
      valid: m.valid,
      dataQuality: m.envelope.dataQuality,
    }));
  }

  getTopicLatest(topic: string): UnsMessage | undefined {
    return this.latestByTopic.get(topic);
  }

  getAllTopicLatest(): UnsMessage[] {
    return [...this.latestByTopic.values()];
  }

  async getDataProductStatuses(): Promise<DataProductStatusView[]> {
    const probes = this.options.integrationProbes ?? {};
    const results: DataProductStatusView[] = [];

    for (const binding of this.model.dataProducts) {
      const compat = binding.unsCompatibility;
      const probeUrl = resolveDataProductProbeUrl(binding.id, probes);

      if (
        compat === 'REQUIRES_EXTENSION' ||
        compat === 'NOT_COMPATIBLE' ||
        compat === 'CUSTOMER_COMPONENT_GAP'
      ) {
        results.push({
          id: binding.id,
          name: binding.name,
          goldenPath: binding.goldenPath,
          status: 'CUSTOMER_COMPONENT_GAP',
          unsCompatibility: compat,
          detail:
            (binding.integration?.gap as string) ??
            `Golden Path UNS compatibility: ${compat}`,
        });
        continue;
      }

      if (!probeUrl) {
        results.push({
          id: binding.id,
          name: binding.name,
          goldenPath: binding.goldenPath,
          status: 'NOT_CONFIGURED',
          unsCompatibility: compat,
          detail: 'No health probe configured for Model Company integration.',
        });
        continue;
      }

      try {
        const response = await fetch(probeUrl, { signal: AbortSignal.timeout(2000) });
        results.push({
          id: binding.id,
          name: binding.name,
          goldenPath: binding.goldenPath,
          status: response.ok ? 'ACTIVE' : 'CUSTOMER_COMPONENT_GAP',
          unsCompatibility: compat,
          detail: response.ok
            ? `Health probe ok: ${probeUrl}`
            : `Probe HTTP ${response.status}`,
        });
      } catch {
        results.push({
          id: binding.id,
          name: binding.name,
          goldenPath: binding.goldenPath,
          status: 'CUSTOMER_COMPONENT_GAP',
          unsCompatibility: compat,
          detail: `Unreachable probe ${probeUrl}`,
        });
      }
    }
    return results;
  }

  getTraceability(equipmentId: string) {
    const eq = this.model.equipment.find(e => e.id === equipmentId);
    if (!eq) {
      return undefined;
    }
    const config = unsConfigFromModel(this.model);
    const stateTopic = `${config.root}/${config.enterpriseId}/${eq.siteId}/${config.areaSlugs[eq.areaId] ?? eq.areaId}/${eq.lineId}/${eq.id}/state`;
    return {
      equipmentId,
      flow: [
        equipmentId,
        'Equipment Simulator',
        'MQTT',
        'UNS',
        'Golden Path Data Product (when configured)',
        'Customer-facing API',
      ],
      mqttTopic: stateTopic,
      note: 'ACTIVE only when a Golden Path instance is configured and UNS-compatible.',
    };
  }

  start(speed?: SimulationSpeed) {
    if (speed) {
      this.state = setSpeed(this.state, speed);
    }
    this.state = {
      ...this.state,
      status: 'RUNNING',
      startedAt: this.state.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    this.startTicker();
    return this.state;
  }

  stop() {
    this.state = {
      ...this.state,
      status: 'STOPPED',
      updatedAt: new Date().toISOString(),
      eventsPerSec: 0,
    };
    this.stopTicker();
    this.persist();
    return this.state;
  }

  reset(seed = 42) {
    this.stopTicker();
    this.state = createInitialState(this.model, seed, this.state.scenarioId);
    this.recentMessages.length = 0;
    this.latestByTopic.clear();
    this.options.store.clearMessages();
    this.persist();
    return this.state;
  }

  runScenario(scenarioId: ScenarioId, seed?: number, autoStart = true) {
    scenarioById(scenarioId);
    this.state = applyScenario(this.state, scenarioId, seed);
    const base = createInitialState(this.model, this.state.seed, scenarioId);
    this.state = {
      ...base,
      scenarioId: this.state.scenarioId,
      scenarioName: this.state.scenarioName,
      seed: this.state.seed,
      runId: this.state.runId,
      status: autoStart ? 'RUNNING' : 'STOPPED',
      speed: this.state.speed,
      startedAt: autoStart ? new Date().toISOString() : undefined,
    };
    this.recentMessages.length = 0;
    this.latestByTopic.clear();
    this.options.store.clearMessages();
    this.persist();
    if (autoStart) {
      this.startTicker();
    } else {
      this.stopTicker();
    }
    return this.state;
  }

  tickOnce(): { state: SimulationState; messages: UnsMessage[] } {
    const result = advanceTick(this.model, {
      ...this.state,
      status: 'RUNNING',
    });
    this.state = {
      ...result.state,
      status: this.state.status,
    };
    this.captureMessages(result.messages);
    this.persist();
    return { state: this.state, messages: result.messages };
  }

  private captureMessages(messages: UnsMessage[]) {
    if (!messages.length) {
      return;
    }
    this.options.store.appendMessages(messages);
    for (const msg of messages) {
      this.recentMessages.unshift(msg);
      if (msg.retained || !msg.informationType.startsWith('events/')) {
        this.latestByTopic.set(msg.topic, msg);
      }
    }
    if (this.recentMessages.length > 500) {
      this.recentMessages.length = 500;
    }
    // Control Plane → Scenario Runtime → Mosquitto (never browser MQTT).
    void this.mqttBridge?.publish(messages);
  }

  private persist() {
    this.options.store.saveState(this.state);
  }

  private startTicker() {
    this.stopTicker();
    const intervalMs = Math.max(200, Math.floor(1000 / Math.max(1, this.state.speed / 5)));
    this.timer = setInterval(() => {
      if (this.state.status !== 'RUNNING') {
        return;
      }
      const result = advanceTick(this.model, this.state);
      this.state = result.state;
      this.captureMessages(result.messages);
      this.persist();
    }, intervalMs);
    this.timer.unref?.();
  }

  private stopTicker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
