export type SimulationStatus = 'STOPPED' | 'RUNNING';
export type SimulationSpeed = 1 | 5 | 10 | 60;

export type ScenarioId =
  | 'SCN-001'
  | 'SCN-002'
  | 'SCN-003'
  | 'SCN-004'
  | 'SCN-005'
  | 'SCN-006'
  | 'SCN-007'
  | 'SCN-008'
  | 'SCN-009'
  | 'SCN-010'
  | 'SCN-AI-001'
  | 'SCN-AI-002'
  | 'SCN-AI-003'
  | 'SCN-AI-004'
  | 'SCN-AI-005'
  | 'SCN-AI-006'
  | 'SCN-AI-007'
  | 'SCN-AI-008'
  | 'SCN-AI-009'
  | 'SCN-AI-010';

export type QualityStatus =
  | 'CREATED'
  | 'IN_PROCESS'
  | 'QUALITY_HOLD'
  | 'RELEASED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'BLOCKED_MATERIAL'
  | 'BLOCKED_SERIALIZATION';

/** Platform UNS Standard 1.0 equipment states */
export type EquipmentState =
  | 'OFF'
  | 'IDLE'
  | 'SETUP'
  | 'RUNNING'
  | 'MICROSTOP'
  | 'STOPPED'
  | 'BREAKDOWN'
  | 'MATERIAL_STARVED'
  | 'QUALITY_HOLD'
  | 'MAINTENANCE'
  | 'CHANGEOVER';

export type DataQuality = 'GOOD' | 'UNCERTAIN' | 'BAD' | 'STALE';

export interface Classification {
  environment: string;
  dataClassification: string;
  gxpScope: string;
  productionUse: boolean;
}

export interface FactoryEquipment {
  id: string;
  type: string;
  capabilities: string[];
  lineId: string;
  areaId: string;
  siteId: string;
}

export interface FactoryLine {
  id: string;
  name: string;
  areaId: string;
  siteId: string;
  equipment: FactoryEquipment[];
}

export interface FactoryArea {
  id: string;
  name: string;
  siteId: string;
  lines: FactoryLine[];
}

export interface FactorySite {
  id: string;
  name: string;
  displayName: string;
  areas: FactoryArea[];
}

export interface DataProductBinding {
  id: string;
  name: string;
  goldenPath: string;
  statusSource: string;
  unsCompatibility?: string;
  integration: Record<string, unknown>;
}

export interface UnsFactoryConfig {
  root: string;
  enterpriseId: string;
  sourceSystem: string;
  areaSlugs: Record<string, string>;
}

export interface FactoryModel {
  company: {
    id: string;
    name: string;
    classification: Classification;
  };
  uns: UnsFactoryConfig;
  sites: FactorySite[];
  dataProducts: DataProductBinding[];
  mqtt: {
    topicPrefix: string;
    patterns: Record<string, string>;
  };
  lines: FactoryLine[];
  equipment: FactoryEquipment[];
}

/** Published UNS message (state or event) for Explorer + JSONL */
export interface UnsMessage {
  topic: string;
  qos: 0 | 1;
  retained: boolean;
  informationType: string;
  envelope: {
    schemaVersion: '1.0';
    eventId: string;
    timestamp: string;
    sourceSystem: string;
    enterpriseId: string;
    siteId: string;
    areaId?: string | null;
    lineId?: string | null;
    equipmentId?: string | null;
    orderId?: string | null;
    batchId?: string | null;
    dataQuality: DataQuality;
    payload: Record<string, unknown>;
  };
  schemaId: string;
  valid: boolean;
  validationErrors: string[];
}

/** @deprecated legacy shape — prefer UnsMessage */
export interface ModelCompanyEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  siteId: string;
  lineId?: string;
  source: string;
  orderId?: string;
  batch?: string;
  payload: Record<string, unknown>;
  topic?: string;
}

export interface SyntheticOrder {
  orderId: string;
  material: string;
  batch: string;
  targetQuantity: number;
  goodQuantity: number;
  rejectQuantity: number;
  status: string;
  lineId: string;
  role?: string;
  linkedUpstream?: string;
  linkedDownstream?: string;
}

export interface WarehouseHu {
  huId: string;
  material: string;
  quantity: number;
  status: string;
  location: string;
  batchId?: string;
  qualityStatus?: QualityStatus | string;
  warehouse?: string;
  uom?: string;
  createdAt?: string;
}

export interface BatchRecord {
  batchId: string;
  materialId: string;
  orderId: string;
  role: string;
  status: QualityStatus | string;
  goodQuantity: number;
  rejectQuantity: number;
}

export interface GenealogyLink {
  from: string;
  to: string;
  relation: string;
}

export interface SerialNode {
  serialId: string;
  level: 'unit' | 'carton' | 'case' | 'pallet';
  status: 'commissioned' | 'packed' | 'aggregated';
  parentId?: string;
  batchId?: string;
}

export interface AutoinjectorCampaign {
  productFamily: string;
  phase: string;
  drugProductReleased: boolean;
  packagingMaterialsStaged: boolean;
  serializationAvailable: boolean;
  assemblyBlocked: boolean;
  packagingBlocked: boolean;
  functionalTested: number;
  functionalPassed: number;
  functionalRejected: number;
  serialCommissioned: number;
}

export interface EquipmentRuntime {
  id: string;
  type: string;
  lineId: string;
  areaId: string;
  siteId: string;
  state: EquipmentState;
  speed: number;
  targetSpeed: number;
  goodCount: number;
  rejectCount: number;
  temperatureC?: number;
  reasonCode?: string;
  availability: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
}

export interface SimulationState {
  status: SimulationStatus;
  speed: SimulationSpeed;
  scenarioId: ScenarioId;
  scenarioName: string;
  seed: number;
  tick: number;
  startedAt?: string;
  updatedAt: string;
  runId: string;
  orders: SyntheticOrder[];
  warehouse: WarehouseHu[];
  equipment: Record<string, EquipmentRuntime>;
  eventsPerSec: number;
  batches?: BatchRecord[];
  genealogy?: GenealogyLink[];
  serials?: SerialNode[];
  campaign?: AutoinjectorCampaign;
}

export interface DataProductStatusView {
  id: string;
  name: string;
  goldenPath: string;
  status: 'ACTIVE' | 'NOT_CONFIGURED' | 'CUSTOMER_COMPONENT_GAP' | 'UNKNOWN';
  unsCompatibility?: string;
  detail: string;
}

export type RuntimeLinkStatus = 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
export type MqttLinkStatus = 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN' | 'NOT_CONFIGURED';
export type UnsLinkStatus = 'ACTIVE' | 'IDLE' | 'NOT_CONNECTED';
export type OeeLinkStatus =
  | 'CONNECTED'
  | 'INSUFFICIENT_DATA'
  | 'NOT_CONNECTED'
  | 'NOT_CONFIGURED';

export interface ConnectivityStatus {
  simulation: SimulationStatus;
  runtime: RuntimeLinkStatus;
  mqtt: MqttLinkStatus;
  uns: UnsLinkStatus;
  oee: OeeLinkStatus;
  detail?: {
    runtimeBaseUrl?: string;
    runtimeError?: string;
    oeeHealthUrl?: string;
    lastMqttPublishAt?: string;
  };
}

export interface OverviewSnapshot {
  companyName: string;
  companyId: string;
  siteId: string;
  siteName: string;
  classification: Classification;
  simulation: SimulationStatus;
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
  labels: {
    syntheticData: string;
    nonGxp: string;
  };
  connectivity: ConnectivityStatus;
}
