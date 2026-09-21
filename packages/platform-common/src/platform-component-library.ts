import {
  PlatformComponent,
  PlatformComponentCategory,
  PlatformComponentCertificationStatus,
  findPlatformComponent,
  normalizeEntityRef,
} from './platform-components';
import {
  type CompositionUsage,
  type CompositionUsageKind,
} from './composition';

/**
 * Catalog names that have a reusable Python runtime package in this
 * repository. Inspected from pyproject.toml + package source. Version
 * numbers are not used as a runtime signal.
 */
export const RUNTIME_PACKAGE_COMPONENT_NAMES = [
  'health',
  'observability',
  'rest-api',
  'rest-source',
  'mqtt-consumer',
  'timeseries',
  'aas-foundation',
  'unified-namespace',
] as const;

export type RuntimePackageComponentName =
  (typeof RUNTIME_PACKAGE_COMPONENT_NAMES)[number];

export const RUNTIME_PACKAGE_SOURCE_PATHS: Record<
  RuntimePackageComponentName,
  string
> = {
  health: 'platform-components/operations/health',
  observability: 'platform-components/operations/observability',
  'rest-api': 'platform-components/integration/rest-api',
  'rest-source': 'platform-components/integration/rest-source',
  'mqtt-consumer': 'platform-components/integration/mqtt-consumer',
  timeseries: 'platform-components/data/timeseries',
  'aas-foundation': 'platform-components/asset-semantic/aas-foundation',
  'unified-namespace': 'uns',
};

export const CATALOG_ONLY_COMPONENT_NAMES = [
  'kafka-consumer',
  'kafka-producer',
  'postgres',
  'object-storage',
  'audit',
  'document-loader',
  'chunker',
  'embeddings',
  'vector-store',
  'retriever',
  'rag',
  'llm-gateway',
  'knowledge-graph',
] as const;

export const PLATFORM_COMPONENT_CATEGORY_LABELS: Record<
  PlatformComponentCategory,
  string
> = {
  integration: 'Integration',
  data: 'Data',
  operations: 'Operations',
  'asset-semantic': 'Asset & Semantic',
  intelligence: 'Intelligence',
};

export const LIBRARY_STATUS_FILTERS = [
  'ALL',
  'CERTIFIED',
  'TESTED',
  'DEVELOPMENT',
  'PLANNED',
] as const;

export type LibraryStatusFilter = (typeof LIBRARY_STATUS_FILTERS)[number];

export const LIBRARY_RUNTIME_FILTERS = [
  'ALL',
  'runtime',
  'catalog-only',
] as const;

export type LibraryRuntimeFilter = (typeof LIBRARY_RUNTIME_FILTERS)[number];

export const LIBRARY_COMPATIBILITY_FILTERS = ['ALL', '1.x'] as const;

export type LibraryCompatibilityFilter =
  (typeof LIBRARY_COMPATIBILITY_FILTERS)[number];

export type RuntimeAvailability = 'runtime' | 'catalog-only';



// ── Configuration Schema (W2-2) ───────────────────────────────────────────────

/** Supported data types for a configuration key. */
export const CONFIG_KEY_TYPES = [
  'string',
  'number',
  'boolean',
  'url',
  'secret',   // value is a credential — never log, never display in UI
] as const;

export type ConfigKeyType = (typeof CONFIG_KEY_TYPES)[number];

/**
 * A formally typed configuration key for a Platform Component.
 *
 * Replaces the plain `string[]` in `configurationKeys` with a structured
 * schema entry that drives:
 *   - Documentation generation (type, required, default, description)
 *   - AI suggestions (the Governed AI Analyst knows what to ask for)
 *   - Validation (service can warn when required keys are missing)
 *   - Secret detection (type='secret' prevents UI display/logging)
 *
 * W2-2 — Configuration Schema.
 */
export interface ConfigKeySchema {
  /** Environment variable name, e.g. 'MQTT_HOST'. */
  key: string;
  /** Human description of what this variable controls. */
  description?: string;
  type: ConfigKeyType;
  /** Whether the component cannot start without this key. */
  required: boolean;
  /** Example or default value (never a real secret). */
  defaultValue?: string;
  /** Example value for documentation. */
  example?: string;
}

export interface ComponentLibraryProfile {
  purpose: string;
  useWhen: string[];
  doNotUseWhen: string[];
  /**
   * Legacy flat list of env var names (kept for backward compatibility).
   * @deprecated Prefer `configurationSchema` for new components.
   */
  configurationKeys: string[];
  configurationNote?: string;
  /**
   * Formally typed configuration schema (W2-2).
   * When present, this supersedes `configurationKeys` for display and AI.
   */
  configurationSchema?: ConfigKeySchema[];
  importExample?: string;
  importProvenance?: string;
  documentationPageId: string;
  sourcePath?: string;
}

export interface LibraryPlatformComponent extends PlatformComponent {
  runtimeAvailability: RuntimeAvailability;
  runtimeUsedBy: string[];
  conceptualUsedBy: string[];
  designUsedBy: string[];
  profile: ComponentLibraryProfile;
}

export interface LibraryComponentFilters {
  query?: string;
  category?: PlatformComponentCategory | 'ALL';
  certification?: PlatformComponentCertificationStatus | 'ALL';
  runtime?: LibraryRuntimeFilter;
  compatibility?: LibraryCompatibilityFilter;
}

export interface BuiltWithItem {
  name: string;
  title: string;
  version: string;
  certificationStatus: PlatformComponentCertificationStatus;
  entityRef: string;
}

export interface BuiltWithSummary {
  productLabel: string;
  items: BuiltWithItem[];
  reusableCount: number;
  certifiedCount: number;
}

const RUNTIME_PACKAGE_SET = new Set<string>(RUNTIME_PACKAGE_COMPONENT_NAMES);

const PROFILES: Record<string, ComponentLibraryProfile> = {
  health: {
    purpose:
      'Reusable health and readiness convention for Data Products. Liveness is GET /health. Readiness is GET /health/ready with optional injected dependency checks. No product-specific dependencies in the base component.',
    useWhen: [
      'exposing a standard liveness payload from a generated Data Product',
      'adding readiness checks without inventing a second health contract',
    ],
    doNotUseWhen: [
      'product-specific business checks belong in domain logic, not this package',
      'you need Prometheus, OpenTelemetry, or Grafana — those are not this component',
    ],
    configurationKeys: [],
    configurationNote:
      'No environment secrets. Service name and version are supplied by the host application.',
    importExample: 'from pdf_health import HealthCheckResult',
    importProvenance: 'templates/oee-data-product/content/app/main.py',
    documentationPageId: 'platform-component-health',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS.health,
  },
  observability: {
    purpose:
      'Structured logging, request correlation ID (X-Request-ID), in-process metrics, request timing, and error counters. Does not require Prometheus, OpenTelemetry, or Grafana.',
    useWhen: [
      'structured logs and correlation IDs are required in a generated Data Product',
      'in-process counters and request timing are enough for the current wave',
    ],
    doNotUseWhen: [
      'you need to deploy Prometheus, OpenTelemetry, or Grafana in this wave',
      'credential-like fields must be logged — this component masks them instead',
    ],
    configurationKeys: ['LOG_LEVEL'],
    importExample: 'from pdf_observability import Observability',
    importProvenance: 'templates/oee-data-product/content/app/main.py',
    documentationPageId: 'platform-component-observability',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS.observability,
  },
  'rest-api': {
    purpose:
      'FastAPI host with health, observability, validation handling, API prefix /api/v1, and OpenAPI. No business endpoints. A Golden Path adds domain routers without modifying this component.',
    useWhen: [
      'hosting a Data Product HTTP API on the platform REST convention',
      'reusing the Wave 1 health and observability wiring instead of a custom FastAPI app',
    ],
    doNotUseWhen: [
      'you need domain routes inside this package — add them on the host',
      'you need a non-HTTP interface as the product contract',
    ],
    configurationKeys: ['SERVICE_NAME', 'SERVICE_VERSION'],
    configurationNote: 'Host identity only. No source credentials in this component.',
    importExample: 'from pdf_rest_api import create_rest_app',
    importProvenance: 'templates/oee-data-product/content/app/main.py',
    documentationPageId: 'platform-component-rest-api',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS['rest-api'],
  },
  'rest-source': {
    purpose:
      'Generic GET client for governed HTTP/REST sources. No SAP/MES/customer API knowledge. Supports auth header abstraction, timeout, retry, validation hook, and observability. Tokens stay in environment variables.',
    useWhen: [
      'consuming HTTP/REST source systems',
      'reading production context from a governed external API',
      'calling MES or similar REST endpoints without embedding customer API SDKs',
    ],
    doNotUseWhen: [
      'direct database access is required',
      'event streaming semantics are required',
      'you need a SAP- or customer-specific client inside this package',
    ],
    configurationKeys: [
      'SOURCE_API_URL',
      'SOURCE_API_TOKEN',
      'SOURCE_API_TIMEOUT',
      'SOURCE_API_RETRIES',
      'SOURCE_API_AUTH_HEADER',
      'SOURCE_API_AUTH_SCHEME',
    ],
    importExample:
      'from pdf_rest_source import RestSource, RestSourceSettings',
    importProvenance: 'templates/oee-data-product/content/app/main.py',
    documentationPageId: 'platform-component-rest-source',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS['rest-source'],
  },
  'mqtt-consumer': {
    purpose:
      'Generic MQTT subscribe/reconnect client. Aligns conceptually with Unified Namespace. Does not copy MQTT Temperature business logic and does not implement UNS topic governance.',
    useWhen: [
      'subscribing to MQTT topics from a generated Data Product',
      'reusing bounded reconnect and optional TLS instead of a one-off paho client',
    ],
    doNotUseWhen: [
      'you need Kafka or other event-streaming semantics',
      'you need Unified Namespace topic governance — that is a separate DEVELOPMENT component',
      'you need MQTT Temperature domain parsing inside this package',
    ],
    configurationKeys: [
      'MQTT_HOST',
      'MQTT_PORT',
      'MQTT_USERNAME',
      'MQTT_PASSWORD',
      'MQTT_TOPIC',
      'MQTT_CLIENT_ID',
      'MQTT_KEEPALIVE',
      'MQTT_TLS_ENABLED',
      'MQTT_TLS_CA_CERTS',
      'MQTT_RECONNECT_MIN_DELAY',
      'MQTT_RECONNECT_MAX_DELAY',
    ],
    importExample:
      'from pdf_mqtt_consumer import MqttConsumer, MqttConsumerSettings',
    importProvenance: 'templates/oee-data-product/content/app/main.py',
    documentationPageId: 'platform-component-mqtt-consumer',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS['mqtt-consumer'],
  },
  timeseries: {
    purpose:
      'Generic time-series points: timestamp, entityId, metric, value, unit, tags. SQLite MVP with write_point, query_range, latest, and delete_before. Not an OEE schema. Future adapters (TimescaleDB, InfluxDB, AWS Timestream) are not dependencies in this version.',
    useWhen: [
      'persisting metric points locally in a generated Data Product',
      'querying a time range or latest value without an OEE-specific table',
    ],
    doNotUseWhen: [
      'you need a shared plant historian or TimescaleDB in this wave',
      'you need an OEE result schema — that belongs in domain logic',
    ],
    configurationKeys: ['TIMESERIES_SQLITE_PATH'],
    importExample:
      'from pdf_timeseries import SqliteTimeSeriesStore, TimeSeriesSettings',
    importProvenance: 'templates/oee-data-product/content/app/main.py',
    documentationPageId: 'platform-component-timeseries',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS.timeseries,
  },
  'aas-foundation': {
    purpose:
      'Reusable Asset Administration Shell repository for what an asset or property means. It is not a Data Product, not Unified Namespace, and not a historian. DEVELOPMENT runtime. Not CERTIFIED.',
    useWhen: [
      'looking up asset or property meaning independently of a Data Product',
      'running the local pdf-aas SQLite repository during development',
    ],
    doNotUseWhen: [
      'you need a CERTIFIED Wave 1 building block for OEE 1.0 — AAS is optional and DEVELOPMENT',
      'you need time-series storage or Unified Namespace semantics from this package',
    ],
    configurationKeys: ['AAS_SQLITE_PATH', 'AAS_SEED'],
    importExample:
      'from pdf_aas.repository import SqliteAasRepository\nfrom pdf_aas.main import create_app',
    importProvenance:
      'platform-components/asset-semantic/aas-foundation/src/pdf_aas/__init__.py',
    documentationPageId: 'platform-component-aas',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS['aas-foundation'],
  },
  'unified-namespace': {
    purpose:
      'Unified Namespace platform component for topic naming, envelope, and local MQTT/HTTP event access. DEVELOPMENT. Not required by OEE Mode A.',
    useWhen: [
      'composing a product that depends on Unified Namespace events',
      'consuming accepted UNS events from the local namespace service',
    ],
    doNotUseWhen: [
      'you only need a generic MQTT subscribe client — use MQTT Consumer',
      'you are building OEE 1.0 Mode A — UNS is optional and not in that composition',
    ],
    configurationKeys: [
      'UNS_MQTT_HOST',
      'UNS_MQTT_PORT',
      'UNS_MQTT_USERNAME',
      'UNS_MQTT_PASSWORD',
      'UNS_ROOT_TOPIC',
      'UNS_MQTT_ENABLED',
      'UNS_TOPIC_FIELDS',
    ],
    importExample:
      'import httpx\n\nresponse = httpx.get("http://localhost:8080/api/v1/events", timeout=10.0)',
    importProvenance: 'uns/examples/consume.py',
    documentationPageId: 'uns-overview',
    sourcePath: RUNTIME_PACKAGE_SOURCE_PATHS['unified-namespace'],
  },
};

const CATALOG_ONLY_SOURCE_PATHS: Record<string, string> = {
  'kafka-consumer': 'platform-components/integration/kafka-consumer',
  'kafka-producer': 'platform-components/integration/kafka-producer',
  postgres: 'platform-components/data/postgres',
  'object-storage': 'platform-components/data/object-storage',
  audit: 'platform-components/operations/audit',
  'document-loader': 'platform-components/intelligence/document-loader',
  chunker: 'platform-components/intelligence/chunker',
  embeddings: 'platform-components/intelligence/embeddings',
  'vector-store': 'platform-components/intelligence/vector-store',
  retriever: 'platform-components/intelligence/retriever',
  rag: 'platform-components/intelligence/rag',
  'llm-gateway': 'platform-components/intelligence/llm-gateway',
  'knowledge-graph': 'platform-components/intelligence/knowledge-graph',
};

export function hasRuntimePackage(name: string): boolean {
  return RUNTIME_PACKAGE_SET.has(name);
}

export function runtimeAvailabilityFor(name: string): RuntimeAvailability {
  return hasRuntimePackage(name) ? 'runtime' : 'catalog-only';
}

export function componentNameFromRef(ref: string): string {
  const normalized = normalizeEntityRef(ref);
  const slash = normalized.lastIndexOf('/');
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

export function usageLabelsForComponent(
  name: string,
  kind: CompositionUsageKind,
  compositionUsage: readonly CompositionUsage[],
): string[] {
  const labels: string[] = [];
  for (const usage of compositionUsage) {
    if (usage.kind !== kind) {
      continue;
    }
    if (
      usage.componentRefs.some(ref => componentNameFromRef(ref) === name)
    ) {
      labels.push(usage.consumerLabel);
    }
  }
  return labels;
}

export function libraryProfileFor(
  component: Pick<PlatformComponent, 'name' | 'description' | 'title'>,
): ComponentLibraryProfile {
  const known = PROFILES[component.name];
  if (known) {
    return known;
  }
  const catalogOnly = runtimeAvailabilityFor(component.name) === 'catalog-only';
  return {
    purpose:
      component.description ||
      `${component.title} is registered in Catalog. ${
        catalogOnly
          ? 'No reusable runtime package exists in this repository.'
          : 'See component documentation for capabilities.'
      }`,
    useWhen: catalogOnly
      ? []
      : ['the Catalog description matches the needed technical capability'],
    doNotUseWhen: catalogOnly
      ? [
          'a reusable Python runtime package is required — none exists here',
          'treating version 1.0.0 as equivalent to a CERTIFIED Wave 1 runtime',
        ]
      : ['the capability is domain logic that belongs in a Data Product'],
    configurationKeys: [],
    configurationNote: catalogOnly
      ? 'No runtime configuration. This entity is Catalog-only.'
      : undefined,
    documentationPageId: 'platform-components',
    sourcePath: CATALOG_ONLY_SOURCE_PATHS[component.name],
  };
}

export function toLibraryComponents(
  components: PlatformComponent[],
  compositionUsage: readonly CompositionUsage[],
): LibraryPlatformComponent[] {
  return components.map(component => ({
    ...component,
    runtimeAvailability: runtimeAvailabilityFor(component.name),
    runtimeUsedBy: usageLabelsForComponent(
      component.name,
      'runtime',
      compositionUsage,
    ),
    conceptualUsedBy: usageLabelsForComponent(
      component.name,
      'conceptual',
      compositionUsage,
    ),
    designUsedBy: usageLabelsForComponent(
      component.name,
      'design',
      compositionUsage,
    ),
    profile: libraryProfileFor(component),
  }));
}

export function matchesStandard1x(component: PlatformComponent): boolean {
  return component.compatibleStandardVersions.some(value => {
    const trimmed = value.trim();
    return trimmed === '1.x' || trimmed.startsWith('1.');
  });
}

export function filterLibraryComponents(
  components: LibraryPlatformComponent[],
  filters: LibraryComponentFilters = {},
): LibraryPlatformComponent[] {
  const query = filters.query?.trim().toLowerCase() || '';
  return components.filter(component => {
    const categoryOk =
      !filters.category ||
      filters.category === 'ALL' ||
      component.category === filters.category;
    const certOk =
      !filters.certification ||
      filters.certification === 'ALL' ||
      component.certificationStatus === filters.certification;
    const runtimeOk =
      !filters.runtime ||
      filters.runtime === 'ALL' ||
      component.runtimeAvailability === filters.runtime;
    const compatibilityOk =
      !filters.compatibility ||
      filters.compatibility === 'ALL' ||
      (filters.compatibility === '1.x' && matchesStandard1x(component));
    const haystack = [
      component.name,
      component.title,
      component.description,
      component.category,
      PLATFORM_COMPONENT_CATEGORY_LABELS[component.category],
      component.owner,
    ]
      .join(' ')
      .toLowerCase();
    const queryOk = !query || haystack.includes(query);
    return categoryOk && certOk && runtimeOk && compatibilityOk && queryOk;
  });
}

/**
 * What a composition is built from, resolved against the Catalog.
 *
 * This was `oeeBuiltWithSummary`, which named one Golden Path in Core and read
 * its component list from a constant beside it — GP-4 in the hard-coded domain
 * inventory. The refs and the label are inputs now, so Core describes the shape
 * of a "built with" panel without knowing which product is being described.
 */
export function builtWithSummary(
  catalog: PlatformComponent[],
  componentRefs: readonly string[],
  productLabel: string,
): BuiltWithSummary {
  const items: BuiltWithItem[] = componentRefs.map(ref => {
    const match = findPlatformComponent(catalog, ref);
    const name = componentNameFromRef(ref);
    return {
      name,
      title: match?.title || name,
      version: match?.version || '1.x',
      certificationStatus: match?.certificationStatus || 'DEVELOPMENT',
      entityRef: match?.entityRef || ref,
    };
  });
  return {
    productLabel,
    items,
    reusableCount: items.length,
    certifiedCount: items.filter(item => item.certificationStatus === 'CERTIFIED')
      .length,
  };
}

export function compositionSnippetFor(name: string): string {
  return `- ref: component:default/${name}\n  version: "1.x"`;
}

