export const ARCHITECTURE_PATH = '/platform/architecture';

export const DEVELOPER_ARCHITECTURE_PATH = '/platform/architecture/developer';

export const ARCHITECTURE_OVERVIEW_IMAGE_SRC = '/architecture-overview.png';

export const ARCHITECTURE_OVERVIEW_IMAGE_ALT =
  'Nexora architecture overview: keep ERP, MES, LIMS and other core systems standard, connect them through governed APIs, events, MQTT, REST and streams, and innovate with independently evolving Data Products';

export function isPublicArchitecturePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (
    normalized === ARCHITECTURE_PATH ||
    normalized === DEVELOPER_ARCHITECTURE_PATH
  );
}

export function isDeveloperArchitecturePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === DEVELOPER_ARCHITECTURE_PATH;
}

export const ARCHITECTURE_CONCEPTS = [
  {
    id: 'standard-core',
    title: 'STANDARD CORE',
    body: 'Existing operational platforms remain stable and close to standard.',
  },
  {
    id: 'governed-integration',
    title: 'GOVERNED INTEGRATION',
    body: 'APIs, events, MQTT, REST and streams provide controlled interfaces to operational data.',
  },
  {
    id: 'independent-data-products',
    title: 'INDEPENDENT DATA PRODUCTS',
    body: 'Data Products evolve independently with contracts, quality gates, compatibility, CI/CD, catalog and governance.',
  },
] as const;

export const SYSTEM_OF_RECORD_SYSTEMS = [
  'ERP',
  'MES',
  'LIMS',
  'EWM',
  'Historian',
  'CMO / Other IT-OT',
  'PLC / SCADA',
] as const;

export const GOVERNED_INTERFACES = [
  'API',
  'Events',
  'MQTT',
  'REST',
  'Files / Streams',
] as const;

export const FACTORY_CAPABILITIES = [
  'Golden Paths',
  'Data Contracts',
  'Quality',
  'Compatibility',
  'CI/CD',
  'Catalog',
  'Governance',
  'Versioning',
] as const;

export const EXAMPLE_DATA_PRODUCTS = [
  'Temperature',
  'Equipment',
  'Quality',
  'OEE',
  'Cold Chain',
] as const;

export const RUNTIME_STEPS = [
  'Source System / Sensor',
  'MQTT or REST',
  'Ingestion',
  'Data Contract',
  'Schema Validation',
  'Quality Validation',
  'Product Storage',
  'Product API',
  'Consumers',
] as const;

export const RUNTIME_CONSUMERS = [
  'Dashboards',
  'Analytics',
  'AI / ML',
  'Applications',
] as const;

export const DEVELOPER_FLOW_STEPS = [
  'Developer',
  'Nexora',
  'Certified Golden Path',
  'GitHub Repository',
  'CI/CD',
  'Contract Tests',
  'Quality Tests',
  'Compatibility Tests',
  'Docker Build',
  'Catalog',
  'TechDocs',
] as const;

export const CATALOG_RELATIONSHIPS = [
  'Provides',
  'Consumes',
  'Depends On',
  'Used By',
] as const;

export const IDP_PILLARS = [
  {
    id: 'self-service',
    title: 'SELF-SERVICE',
    body: 'Teams create from a Golden Path. They do not wait for a platform ticket.',
  },
  {
    id: 'catalog',
    title: 'SOFTWARE CATALOG',
    body: 'Products, owners, APIs, docs and dependencies are discoverable in one place.',
  },
  {
    id: 'paved-road',
    title: 'PAVED ROAD',
    body: 'The standard way is encoded. Golden Paths carry CI/CD, tests and structure.',
  },
  {
    id: 'guardrails',
    title: 'GUARDRAILS BY DEFAULT',
    body: 'Contracts, quality, compatibility and TechDocs ship with the product.',
  },
] as const;

export const PLATFORM_FEATURES = [
  {
    id: 'discover',
    title: 'DISCOVER',
    body: 'Catalog, Marketplace, Search, TechDocs and ownership.',
  },
  {
    id: 'create',
    title: 'CREATE',
    body: 'Golden Paths, templates and GitHub repository generation.',
  },
  {
    id: 'deliver',
    title: 'DELIVER',
    body: 'GitHub Actions, contract tests, quality gates and Docker.',
  },
  {
    id: 'operate',
    title: 'OPERATE',
    body: 'Lifecycle, health, contracts, compatibility and versioning.',
  },
  {
    id: 'control-plane',
    title: 'CONTROL PLANE',
    body: 'Engineering and governance around products. Not a second MES.',
  },
  {
    id: 'data-plane',
    title: 'DATA PLANE',
    body: 'Products run independently. Operational data stays on governed interfaces.',
  },
] as const;
