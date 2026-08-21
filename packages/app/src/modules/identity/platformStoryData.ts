export type CapabilityStatus =
  | 'AVAILABLE'
  | 'CERTIFIED'
  | 'TESTED'
  | 'DEVELOPMENT'
  | 'PLANNED'
  | 'FUTURE';

export const AAS_CAPABILITIES = [
  'Asset Registry',
  'Equipment',
  'Sensors',
  'Submodels',
  'Semantic IDs',
  'Units',
  'Relationships',
  'Endpoint Mapping',
] as const;

export const FILLER_ASSET_EXAMPLE = {
  name: 'Filler 01',
  properties: ['Temperature', 'Pressure', 'Speed', 'Machine State'],
} as const;

export const AAS_UNS_MAPPING = {
  asset: 'filler-01',
  property: 'speed',
  unit: 'rpm',
  topic: 'pharma/basel/packaging/line-01/filler-01/speed/value',
} as const;

export const UNS_TRANSPORTS = [
  { label: 'MQTT', status: 'AVAILABLE' as const },
  { label: 'REST', status: 'AVAILABLE' as const },
  { label: 'Events', status: 'AVAILABLE' as const },
  { label: 'Files / Streams', status: 'AVAILABLE' as const },
  { label: 'OPC UA', status: 'PLANNED' as const },
  { label: 'Kafka', status: 'PLANNED' as const },
] as const;

export const PLATFORM_COMPONENT_GROUPS = [
  {
    id: 'integration',
    title: 'INTEGRATION',
    items: [
      { name: 'REST Source', status: 'CERTIFIED' as const },
      { name: 'REST API', status: 'CERTIFIED' as const },
      { name: 'MQTT Consumer', status: 'CERTIFIED' as const },
      { name: 'Unified Namespace', status: 'DEVELOPMENT' as const },
    ],
  },
  {
    id: 'data',
    title: 'DATA',
    items: [
      { name: 'Time-Series Storage', status: 'CERTIFIED' as const },
      { name: 'PostgreSQL', status: 'PLANNED' as const },
      { name: 'Object Storage', status: 'PLANNED' as const },
    ],
  },
  {
    id: 'operations',
    title: 'OPERATIONS',
    items: [
      { name: 'Health', status: 'CERTIFIED' as const },
      { name: 'Observability', status: 'CERTIFIED' as const },
      { name: 'Audit', status: 'PLANNED' as const },
    ],
  },
  {
    id: 'intelligence',
    title: 'INTELLIGENCE',
    items: [
      { name: 'RAG', status: 'PLANNED' as const },
      { name: 'LLM Gateway', status: 'PLANNED' as const },
      { name: 'Knowledge Graph', status: 'PLANNED' as const },
      { name: 'Vector Store', status: 'PLANNED' as const },
    ],
  },
] as const;

export const GOLDEN_PATH_EXAMPLES = [
  { name: 'MQTT Temperature Data Product', status: 'CERTIFIED' as const },
  { name: 'REST Equipment Data Product', status: 'CERTIFIED' as const },
  { name: 'OEE', status: 'CERTIFIED' as const },
  { name: 'Cold Chain', status: 'FUTURE' as const },
  { name: 'Quality', status: 'FUTURE' as const },
  { name: 'Energy', status: 'FUTURE' as const },
  { name: 'AI Assistant', status: 'FUTURE' as const },
] as const;

export const OEE_GOLDEN_PATH_COMPOSITION = [
  { name: 'REST Source', status: 'CERTIFIED' as const },
  { name: 'MQTT Consumer / UNS', status: 'CERTIFIED' as const },
  { name: 'Time-Series Storage', status: 'CERTIFIED' as const },
  { name: 'REST API', status: 'CERTIFIED' as const },
  { name: 'Health', status: 'CERTIFIED' as const },
  { name: 'Observability', status: 'CERTIFIED' as const },
  { name: 'OEE Domain Logic', status: 'CERTIFIED' as const },
] as const;

export const STORY_DATA_PRODUCTS = [
  {
    id: 'temperature',
    name: 'Temperature',
    status: 'CERTIFIED' as const,
    protocol: 'MQTT',
    version: 'v1.0',
    owner: 'Packaging',
  },
  {
    id: 'equipment',
    name: 'Equipment',
    status: 'CERTIFIED' as const,
    protocol: 'REST',
    version: 'v1.0',
    owner: 'Packaging',
  },
  {
    id: 'oee',
    name: 'OEE',
    status: 'CERTIFIED' as const,
    protocol: 'MQTT+REST',
    version: 'v1.0',
    owner: 'Operations',
  },
  {
    id: 'cold-chain',
    name: 'Cold Chain',
    status: 'FUTURE' as const,
    owner: 'Quality',
  },
  {
    id: 'quality',
    name: 'Quality',
    status: 'FUTURE' as const,
    owner: 'Quality',
  },
] as const;

export const DATA_PRODUCT_TRAITS = [
  'Contract',
  'Quality',
  'Compatibility',
  'CI/CD',
  'Version',
  'Owner',
] as const;

export const CONTROL_PLANE_CAPABILITIES = [
  'Catalog',
  'Create',
  'Marketplace',
  'Golden Paths',
  'Contracts',
  'Quality',
  'Compatibility',
  'CI/CD',
  'TechDocs',
  'Search',
  'RBAC',
  'Certification',
  'Versioning',
  'Upgrade Status',
  'Developer Hub',
] as const;

export const LAYER_ROLE_CARDS = [
  {
    id: 'system-of-record',
    title: 'SYSTEM OF RECORD',
    body: 'Owns operational and business source data. Remains stable and close to standard.',
  },
  {
    id: 'aas',
    title: 'AAS',
    body: 'Explains assets, sensors and semantic meaning. Does not store time-series values.',
  },
  {
    id: 'uns',
    title: 'UNIFIED NAMESPACE',
    body: 'Provides governed operational data flow: topics, transport and access paths.',
  },
  {
    id: 'platform-component',
    title: 'PLATFORM COMPONENT',
    body: 'Reusable technical building block with a certified or declared lifecycle status.',
  },
  {
    id: 'golden-path',
    title: 'GOLDEN PATH',
    body: 'Certified composition pattern that turns reusable capabilities into a Data Product.',
  },
  {
    id: 'data-product',
    title: 'DATA PRODUCT',
    body: 'Independent domain capability with contract, quality, version and owner.',
  },
  {
    id: 'control-plane',
    title: 'PHARMA DATA FACTORY',
    body: 'Control Plane for engineering and governance. It does not process all operational data.',
  },
  {
    id: 'consumer',
    title: 'CONSUMER',
    body: 'Uses the governed Data Product through its contract and API.',
  },
] as const;

export const LAYER_COMPARISON = [
  {
    id: 'aas',
    title: 'AAS',
    question: 'What is this asset and what does its data mean?',
    owns: 'Asset metadata and semantics.',
  },
  {
    id: 'uns',
    title: 'UNS',
    question: 'Where and how does operational data flow?',
    owns: 'Topic/namespace and operational transport.',
  },
  {
    id: 'data-product',
    title: 'DATA PRODUCT',
    question: 'What business capability/value is produced?',
    owns: 'Domain logic, contracts and consumable output.',
  },
  {
    id: 'control-plane',
    title: 'PHARMA DATA FACTORY',
    question: 'How do we build and govern all of this?',
    owns: 'Control-plane standards and lifecycle.',
  },
] as const;

export const FILLER_TO_OEE_STEPS = [
  {
    id: 'aas',
    title: 'Step 1 — AAS knows the asset',
    body: 'Filler 01, speed sensor, unit rpm, machine state and semantic IDs. AAS does not store the measurements.',
    status: 'DEVELOPMENT' as const,
  },
  {
    id: 'uns',
    title: 'Step 2 — UNS exposes the path',
    body: 'Operational values flow on pharma/site/packaging/line-01/filler-01/…',
    status: 'DEVELOPMENT' as const,
  },
  {
    id: 'components',
    title: 'Step 3 — Platform Components provide capabilities',
    body: 'MQTT Consumer, REST Source, Time-Series Storage, REST API, Health and Observability.',
    status: 'CERTIFIED' as const,
  },
  {
    id: 'golden-path',
    title: 'Step 4 — OEE Golden Path composes them',
    body: 'OEE Golden Path 1.0 composes Wave 1 components. CERTIFIED is technical platform status only, not GxP.',
    status: 'CERTIFIED' as const,
  },
  {
    id: 'oee',
    title: 'Step 5 — OEE Data Product calculates Availability, Performance and Quality',
    body: 'The generated OEE runtime calculates A × P × Q independently of the Control Plane. Dashboards are out of this pilot.',
    status: 'CERTIFIED' as const,
  },
  {
    id: 'consumers',
    title: 'Step 6 — Consumers use the product',
    body: 'Dashboard and analytics consume the Data Product API. AI Assistant is a future consumer.',
    status: 'FUTURE' as const,
  },
] as const;

export const DISTRIBUTION_PIPELINE = [
  'BUILD ONCE',
  'CERTIFY',
  'RELEASE',
  'DISTRIBUTE',
] as const;

export const COMMERCIAL_EDITION_STORY = [
  {
    id: 'internal',
    title: 'INTERNAL DEVELOPER PLATFORM',
    body: 'Our engineering teams build and certify capabilities.',
    status: 'AVAILABLE' as const,
  },
  {
    id: 'template',
    title: 'TEMPLATE EDITION',
    body: 'Customers consume selected Golden Paths and templates.',
    status: 'AVAILABLE' as const,
    detail: 'AVAILABLE FOR PILOT',
  },
  {
    id: 'platform',
    title: 'PLATFORM EDITION',
    body: 'Customer runs its own Pharma Data Factory Control Plane.',
    status: 'PLANNED' as const,
  },
  {
    id: 'saas',
    title: 'SAAS EDITION',
    body: 'Future managed service. Not available in this release.',
    status: 'FUTURE' as const,
  },
] as const;

export const AUTHENTICATED_ARCHITECTURE_LINKS = [
  { id: 'hub', label: 'Developer Hub Architecture', href: '/developer' },
  {
    id: 'aas',
    label: 'AAS Developer Docs',
    href: '/docs/default/component/data-product-platform/aas/index',
  },
  {
    id: 'uns',
    label: 'Unified Namespace Docs',
    href: '/docs/default/component/data-product-platform/uns/index',
  },
  { id: 'components', label: 'Component Registry', href: '/platform-components' },
  { id: 'marketplace', label: 'Marketplace', href: '/marketplace' },
  { id: 'data-products', label: 'Data Products UI', href: '/data-products' },
] as const;
