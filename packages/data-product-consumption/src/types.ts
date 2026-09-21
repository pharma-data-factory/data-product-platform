/** Consumption Framework error categories (normalized). */
export type ConsumptionErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INTERFACE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'CONTRACT_VIOLATION'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UNKNOWN';

export class ConsumptionError extends Error {
  constructor(
    readonly code: ConsumptionErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ConsumptionError';
  }
}

export type InterfaceType = 'rest' | 'stream' | 'mqtt' | 'openapi';
export type StreamProtocol = 'websocket' | 'sse';

export type PresentationCapability =
  | 'table'
  | 'metric-cards'
  | 'timeseries'
  | 'realtime'
  | 'json'
  | 'schema';

export type ValidationStatusView =
  | 'NOT_VALIDATED'
  | 'BASELINED'
  | 'VALIDATION_IN_PROGRESS'
  | 'VALIDATED'
  | 'NOT_AVAILABLE';

export interface DataProductInterface {
  id: string;
  type: InterfaceType;
  /** Catalog API ref or logical id */
  apiRef?: string;
  /** Relative path on product service, e.g. /api/v1/oee */
  path?: string;
  protocol?: StreamProtocol;
  /** MQTT topic template — never used directly from browser */
  topic?: string;
  /** OpenAPI path annotation if present */
  openApiPath?: string;
}

export interface DataProductContracts {
  inputs: string[];
  outputs: string[];
}

export interface DataProductQualityMeta {
  freshnessTargetSeconds?: number;
  completenessTarget?: number;
  endpoint?: string;
  checks: string[];
  /** Live values — only when measured */
  freshnessSeconds?: number | 'NOT_AVAILABLE';
  completeness?: number | 'NOT_AVAILABLE';
  lastUpdate?: string | 'NOT_AVAILABLE';
  status?: string | 'NOT_AVAILABLE';
}

export interface DataProductPresentation {
  defaultView: PresentationCapability;
  capabilities: PresentationCapability[];
  extensions: string[];
}

export interface DataProductValidationMeta {
  status: ValidationStatusView;
  baseline?: string | 'NOT_AVAILABLE';
  urs?: string | 'NOT_AVAILABLE';
  systemSpec?: string | 'NOT_AVAILABLE';
  traceability?: string | 'NOT_AVAILABLE';
  lastValidationRun?: string | 'NOT_AVAILABLE';
}

export interface DataProductLineageEdge {
  from: string;
  to: string;
  relation: string;
}

// ── Analytics Providers (Phase 6, P6-S1) ─────────────────────────────────────

export const ANALYTICS_PROVIDER_TYPES = [
  'PowerBI',
  'Tableau',
  'Looker',
  'Metabase',
  'Jupyter',
  'Grafana',
  'Custom',
] as const;

export type AnalyticsProviderType = (typeof ANALYTICS_PROVIDER_TYPES)[number];

/**
 * A BI tool or analytics environment that consumes this data product.
 *
 * Declared in the catalog entity as a JSON annotation
 * `dataprod.platform/analytics-providers` — an array of objects with at least
 * `name` and `type`. Phase 6 (P6-S1).
 */
export interface AnalyticsProvider {
  /** Human-readable name, e.g. "OEE Dashboard". */
  name: string;
  type: AnalyticsProviderType;
  /** Direct URL to the dashboard or notebook, if known. */
  url?: string;
  description?: string;
}

export interface DataProductDescriptor {
  entityRef: string;
  name: string;
  namespace: string;
  title: string;
  description: string;
  domain: string;
  owner: string;
  lifecycle: string;
  version: string;
  interfaces: DataProductInterface[];
  contracts: DataProductContracts;
  quality: DataProductQualityMeta;
  presentation: DataProductPresentation;
  validation: DataProductValidationMeta;
  lineage: DataProductLineageEdge[];
  /**
   * Analytics tools and dashboards that consume this product. Phase 6 (P6-S1).
   * Empty when none are declared.
   */
  analyticsProviders: AnalyticsProvider[];
  repository?: string;
  documentation?: string;
  catalogClass?: string;
  templateName?: string;
}

export interface QueryResult {
  columns: Array<{ id: string; type?: string; semanticType?: string; unit?: string }>;
  rows: Array<Record<string, unknown>>;
  total?: number;
  source: 'upstream' | 'fixture' | 'unavailable';
  detail?: string;
}

export interface StreamEvent {
  eventId: string;
  timestamp: string;
  source?: string;
  dataQuality?: string;
  payload: Record<string, unknown>;
}

export interface ConsumeContext {
  site?: string;
  area?: string;
  line?: string;
  equipment?: string;
}
