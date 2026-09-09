import { canExecuteScaffolder } from './policy';
import type { PlatformRole } from './roles';

export const PLATFORM_DOCS_ENTITY_REF = 'component:default/data-product-platform';
export const PLATFORM_DOCS_BASE =
  '/docs/default/component/data-product-platform';
export const DEVELOPER_HUB_PATH = '/developer';
export const SEARCH_PATH = '/search';
export const ARCHITECTURE_STORY_PATH = '/platform/architecture';
export const DEVELOPER_ARCHITECTURE_PATH = '/platform/architecture/developer';

export const DOCUMENTATION_VERSION = '1.0';
export const APPLICABLE_PLATFORM = 'Data Product Standard 1.0.x';
export const LAST_REVIEWED = '2026-08';

export const DOC_AUDIENCES = [
  'INTERNAL_ENGINEERING',
  'PLATFORM_USER',
  'CUSTOMER_PLATFORM',
  'SAAS_CUSTOMER',
] as const;

export type DocAudience = (typeof DOC_AUDIENCES)[number];

export const DOC_SEARCH_KINDS = [
  'Platform Documentation',
  'Architecture',
  'Golden Path',
  'How-To',
  'Data Product Documentation',
  'Contract Documentation',
] as const;

export type DocSearchKind = (typeof DOC_SEARCH_KINDS)[number];

export interface DocumentationPage {
  id: string;
  title: string;
  path: string;
  kind: DocSearchKind;
  audience: DocAudience;
  owner: string;
  lastReviewed: string;
  documentationVersion: string;
  applicablePlatform: string;
  version: string;
  section: string;
  hubTitle?: string;
}

export interface DeveloperHubSection {
  id: string;
  title: string;
  pages: DocumentationPage[];
}

export interface FirstDayStep {
  id: string;
  title: string;
  why: string;
  action: string;
  expected: string;
  commonError: string;
  learnMoreId: string;
  platformRoute?: string;
}

export interface DeveloperHubAction {
  id: string;
  label: string;
  to: string;
  developerOnly?: boolean;
}

export interface HubGoldenPathCard {
  id: string;
  name: string;
  statusLabel: 'CERTIFIED';
  marketplacePath: string;
  docsId: string;
}

function page(
  partial: Omit<
    DocumentationPage,
    'lastReviewed' | 'version' | 'documentationVersion' | 'applicablePlatform'
  > &
    Partial<
      Pick<
        DocumentationPage,
        'lastReviewed' | 'version' | 'documentationVersion' | 'applicablePlatform'
      >
    >,
): DocumentationPage {
  return {
    lastReviewed: LAST_REVIEWED,
    documentationVersion: DOCUMENTATION_VERSION,
    applicablePlatform: APPLICABLE_PLATFORM,
    version: DOCUMENTATION_VERSION,
    ...partial,
  };
}

export const DOCUMENTATION_PAGES: DocumentationPage[] = [
  page({
    id: 'quick-start',
    title: 'Developer Quick Start',
    path: '/developer/quick-start',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'getting-started',
    title: 'Getting started',
    path: '/developer/getting-started',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'first-data-product',
    title: 'Build Your First Data Product',
    hubTitle: 'Build Your First Data Product',
    path: '/developer/first-data-product',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'local-development',
    title: 'Development Environment',
    path: '/developer/local-development',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'troubleshooting',
    title: 'Troubleshooting',
    path: '/developer/troubleshooting',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'fundamentals-data-products',
    title: 'What is Nexora?',
    path: '/fundamentals/data-products',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'system-of-record',
    title: 'System of Record vs Data Product',
    path: '/fundamentals/system-of-record',
    kind: 'Architecture',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'control-plane',
    title: 'Control Plane vs Data Plane',
    path: '/fundamentals/control-plane',
    kind: 'Architecture',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'golden-paths',
    title: 'Golden Path concept',
    path: '/fundamentals/golden-paths',
    kind: 'Golden Path',
    audience: 'PLATFORM_USER',
    owner: 'Golden Path Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'glossary',
    title: 'Glossary',
    path: '/fundamentals/glossary',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'architecture-platform',
    title: 'Platform Architecture',
    path: '/architecture/platform',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'architecture-data-product',
    title: 'Data Product Architecture',
    path: '/architecture/data-product',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'architecture-integration',
    title: 'Integration Architecture',
    path: '/architecture/integration',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'platform-components',
    title: 'Platform Component Library',
    path: '/platform-components/index',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
    hubTitle: 'What is a Platform Component?',
  }),
  page({
    id: 'platform-component-browse',
    title: 'Browse the Component Library',
    path: '/platform-components/browse',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-decision',
    title: 'Developer Decision Model',
    path: '/platform-components/decision-model',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-vs-golden-path',
    title: 'Platform Component vs Golden Path',
    path: '/platform-components/vs-golden-path',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-vs-plugin',
    title: 'Platform Component vs Backstage Plugin',
    path: '/platform-components/vs-backstage-plugin',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-equipment-use-log',
    title: 'Equipment Use Log composition example',
    path: '/platform-components/equipment-use-log-example',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-future-composer',
    title: 'Future Composition UI',
    path: '/platform-components/future-composer',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-composer',
    title: 'Composition Builder',
    path: '/platform-components/composer',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-product-model',
    title: 'Product model',
    path: '/platform-components/product-model',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-vendoring',
    title: 'Vendoring and reuse',
    path: '/platform-components/vendoring',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-model',
    title: 'Component Model',
    path: '/platform-components/component-model',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-standard',
    title: 'Component Standard',
    path: '/platform-components/component-standard',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-certification',
    title: 'Component Lifecycle',
    path: '/platform-components/certification',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
    hubTitle: 'Platform Component Certification',
  }),
  page({
    id: 'platform-component-wave1-certified',
    title: 'Wave 1 Certified Components',
    path: '/platform-components/wave-1-certified',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-wave1-baseline',
    title: 'Wave 1 Baseline Freeze',
    path: '/platform-components/wave-1-baseline',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-certification-checklist',
    title: 'Certification Checklist',
    path: '/platform-components/certification-checklist',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-security',
    title: 'Security Limitations',
    path: '/platform-components/security',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-upgrade-policy',
    title: 'Component Upgrade Policy',
    path: '/platform-components/upgrade-policy',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-wave1-conformance',
    title: 'Wave 1 Conformance Matrix',
    path: '/platform-components/wave-1-conformance',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-oee-ready',
    title: 'OEE Definition of Ready',
    path: '/platform-components/oee-ready',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-versioning',
    title: 'Component Versioning',
    path: '/platform-components/versioning',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
    hubTitle: 'Versioning & Compatibility',
  }),
  page({
    id: 'platform-component-composition',
    title: 'Component Composition',
    path: '/platform-components/composition',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
    hubTitle: 'Composition Model',
  }),
  page({
    id: 'platform-component-creating',
    title: 'Creating a Platform Component',
    path: '/platform-components/creating',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-using',
    title: 'Using Components in Golden Paths',
    path: '/platform-components/using',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
    hubTitle: 'How to reuse a Component',
  }),
  page({
    id: 'platform-component-health',
    title: 'Health',
    path: '/platform-components/health',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-observability',
    title: 'Observability',
    path: '/platform-components/observability',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-rest-api',
    title: 'REST API',
    path: '/platform-components/rest-api',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-rest-source',
    title: 'REST Source',
    path: '/platform-components/rest-source',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-mqtt-consumer',
    title: 'MQTT Consumer',
    path: '/platform-components/mqtt-consumer',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-timeseries',
    title: 'Time-Series Storage',
    path: '/platform-components/timeseries',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-from-components',
    title: 'Build a Data Product from Platform Components',
    path: '/platform-components/build-from-components',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-machine-metrics',
    title: 'Machine Metrics Reference',
    path: '/platform-components/machine-metrics',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-aas',
    title: 'Asset Administration Shell',
    path: '/platform-components/aas-foundation',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'aas-overview',
    title: 'What is AAS?',
    path: '/aas/index',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'aas-vs-catalog',
    title: 'AAS vs Backstage Catalog',
    path: '/aas/vs-catalog',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'aas-vs-uns',
    title: 'AAS vs Unified Namespace',
    path: '/aas/vs-uns',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'aas-administration',
    title: 'Asset & Sensor Administration',
    path: '/aas/administration',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'aas-submodels',
    title: 'AAS Submodels',
    path: '/aas/submodels',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'aas-semantic-ids',
    title: 'Semantic IDs',
    path: '/aas/semantic-ids',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'aas-connectivity',
    title: 'Connectivity Mapping',
    path: '/aas/connectivity',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'aas-from-data-product',
    title: 'Using AAS from a Data Product',
    path: '/aas/using-from-data-product',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'aas-oee',
    title: 'AAS + OEE',
    path: '/aas/oee',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'platform-component-intelligence',
    title: 'Intelligence Foundation',
    path: '/platform-components/intelligence',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'platform-component-oee',
    title: 'OEE Composition Example',
    path: '/platform-components/oee-example',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-domain',
    title: 'OEE Domain Model',
    path: '/oee/domain-model',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-contracts',
    title: 'OEE Contracts',
    path: '/oee/contracts',
    kind: 'Contract Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-calculation',
    title: 'OEE Calculation',
    path: '/oee/calculation',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-time-windows',
    title: 'OEE Time Windows',
    path: '/oee/time-windows',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-edge-cases',
    title: 'OEE Edge Cases',
    path: '/oee/edge-cases',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-composition',
    title: 'OEE Composition',
    path: '/oee/composition',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-mvp-boundary',
    title: 'OEE MVP Boundary',
    path: '/oee/mvp-boundary',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-overview',
    title: 'OEE Domain & Contract Design',
    hubTitle: 'OEE Overview (CERTIFIED)',
    path: '/oee/index',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-golden-path-design',
    title: 'OEE Golden Path Design',
    hubTitle: 'OEE Architecture (CERTIFIED)',
    path: '/oee/golden-path-design',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-quality',
    title: 'OEE Data Quality',
    path: '/oee/quality',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-edge-case-matrix',
    title: 'OEE Edge-Case Matrix',
    path: '/oee/edge-case-matrix',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-api',
    title: 'OEE API',
    path: '/oee/api',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-storage',
    title: 'OEE Storage',
    path: '/oee/storage',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-source-mapping',
    title: 'OEE Source Mapping',
    path: '/oee/source-mapping',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-create-config',
    title: 'OEE Create and Configuration',
    path: '/oee/create-and-config',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-pilot-limitations',
    title: 'OEE Pilot Limitations',
    path: '/oee/pilot-limitations',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-pilot-integration',
    title: 'OEE Pilot Integration Proof',
    path: '/oee/pilot-integration',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-pilot-vendoring',
    title: 'OEE Wave 1 Vendoring Assessment',
    path: '/oee/pilot-vendoring',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-decisions',
    title: 'OEE Product Decisions',
    path: '/oee/decisions',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'oee-dod',
    title: 'OEE Definition of Done',
    path: '/oee/definition-of-done',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'platform-component-uns',
    title: 'UNS as a Platform Component',
    path: '/platform-components/unified-namespace',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-component-standard-root',
    title: 'Platform Component Standard',
    path: '/platform-component-standard',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-overview',
    title: 'Unified Namespace',
    path: '/uns/index',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-architecture',
    title: 'UNS Architecture',
    path: '/uns/architecture',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'uns-namespace',
    title: 'Namespace Convention',
    path: '/uns/namespace',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-topic-naming',
    title: 'UNS Topic Naming',
    path: '/uns/topic-naming',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-envelope',
    title: 'UNS Event Envelope',
    path: '/uns/event-envelope',
    kind: 'Contract Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-contracts',
    title: 'UNS Contracts',
    path: '/uns/contracts',
    kind: 'Contract Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-mqtt',
    title: 'UNS MQTT Setup',
    path: '/uns/mqtt-setup',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'uns-local',
    title: 'UNS Local Development',
    path: '/uns/local-development',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'uns-producer',
    title: 'UNS Producer Guide',
    path: '/uns/producer-guide',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'uns-consumer',
    title: 'UNS Consumer Guide',
    path: '/uns/consumer-guide',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-compose-uns',
    title: 'Compose a Data Product with Unified Namespace',
    path: '/how-to/compose-uns',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'uns-governance',
    title: 'UNS Governance',
    path: '/uns/governance',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'uns-troubleshooting',
    title: 'UNS Troubleshooting',
    path: '/uns/troubleshooting',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'uns-oee',
    title: 'OEE via Unified Namespace',
    path: '/uns/oee-example',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'uns-cold-chain',
    title: 'Cold Chain via Unified Namespace',
    path: '/uns/cold-chain-example',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'architecture-identity',
    title: 'Identity & RBAC',
    path: '/architecture/identity',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'architecture-deployment',
    title: 'Deployment Models',
    path: '/architecture/deployment-models',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'commercial-architecture',
    title: 'Commercial Architecture',
    path: '/commercial-architecture',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'entitlements-vs-rbac',
    title: 'Entitlements vs RBAC',
    path: '/entitlements-vs-rbac',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'aws-marketplace-integration',
    title: 'AWS Marketplace Integration',
    path: '/aws-marketplace-integration',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'aws-marketplace-test-listing',
    title: 'AWS Marketplace Test Listing',
    path: '/aws-marketplace-test-listing',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'rest-equipment-packaging',
    title: 'REST Equipment Packaging',
    path: '/golden-paths/rest-equipment-packaging',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'generated-placeholders',
    title: 'Generated Legal Placeholders',
    path: '/legal/generated-placeholders',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'commercial-product-ids',
    title: 'Product IDs',
    path: '/commercial-product-ids',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'template-edition',
    title: 'Template Edition',
    path: '/template-edition',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'platform-edition',
    title: 'Platform Edition',
    path: '/platform-edition',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'future-saas',
    title: 'Future SaaS',
    path: '/future-saas',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'local-marketplace-simulation',
    title: 'Local Marketplace Simulation',
    path: '/local-marketplace-simulation',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'COMMERCIAL',
  }),
  page({
    id: 'standard',
    title: 'Data Product Standard',
    path: '/engineering/standard',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'sdk',
    title: 'Data Product SDK',
    path: '/engineering/sdk',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'contracts',
    title: 'Data Contracts',
    path: '/engineering/contracts',
    kind: 'Contract Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'quality',
    title: 'Quality',
    path: '/engineering/quality',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'compatibility',
    title: 'Compatibility',
    path: '/engineering/compatibility',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'ci-cd',
    title: 'CI/CD',
    path: '/engineering/ci-cd',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'certification',
    title: 'Certification',
    path: '/engineering/certification',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'source-of-truth',
    title: 'Certification source of truth',
    path: '/engineering/source-of-truth',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'security-gate',
    title: 'Security quality gate',
    path: '/engineering/security-gate',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'capability-matrix',
    title: 'Product capability matrix',
    path: '/capability-matrix',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'pilot-readiness',
    title: 'Pilot readiness',
    path: '/pilot-readiness',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'pilot-hardening-gate',
    title: 'Pilot hardening gate',
    path: '/pilot-hardening-gate',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'pilot-runbook',
    title: 'Pilot operations runbook',
    path: '/operations/pilot-runbook',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'mvp-1.0-baseline',
    title: 'MVP 1.0 baseline',
    path: '/mvp-1.0-baseline',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'status-model',
    title: 'Status model',
    path: '/status-model',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'mvp-journey-evidence',
    title: 'Developer journey evidence',
    path: '/developer/mvp-journey-evidence',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'pilot-exit-gate',
    title: 'Pilot exit gate',
    path: '/pilot-exit-gate',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'catalog-hygiene',
    title: 'Catalog hygiene',
    path: '/catalog',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'github-integration-test',
    title: 'GitHub integration test',
    path: '/developer/github-integration-test',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'versioning',
    title: 'Versioning',
    path: '/engineering/versioning',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'BUILD',
  }),
  page({
    id: 'golden-path-lifecycle',
    title: 'Golden Path Lifecycle',
    path: '/engineering/golden-path-lifecycle',
    kind: 'Golden Path',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Golden Path Team',
    section: 'BUILD',
  }),
  page({
    id: 'release-management',
    title: 'Release Management',
    path: '/engineering/release-management',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'release-checklist',
    title: 'Release Checklist',
    path: '/engineering/release-checklist',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'deprecation',
    title: 'Deprecation',
    path: '/engineering/deprecation',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'distribution-channels',
    title: 'Distribution Channels',
    path: '/engineering/distribution-channels',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'upgrade-guide',
    title: 'Upgrade Guide',
    path: '/engineering/upgrade-guide',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-release',
    title: 'Release a Golden Path',
    path: '/how-to/release-golden-path',
    kind: 'How-To',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Golden Path Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-mqtt',
    title: 'MQTT Temperature Data Product',
    path: '/how-to/mqtt-temperature',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Golden Path Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-rest',
    title: 'REST Equipment Data Product',
    path: '/how-to/rest-equipment',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Golden Path Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-oee',
    title: 'OEE Data Product',
    path: '/how-to/oee',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Golden Path Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-oee-pilot',
    title: 'OEE Pilot Integration Proof',
    path: '/how-to/oee-pilot',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Golden Path Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-contract',
    title: 'Change a Data Contract',
    path: '/how-to/contract-change',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-ci',
    title: 'Debug CI',
    path: '/how-to/ci-failure',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'classification',
    title: 'Internal vs customer documentation',
    path: '/developer/classification',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'OPERATE',
  }),
  page({
    id: 'ownership',
    title: 'Documentation ownership',
    path: '/developer/ownership',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'OPERATE',
  }),
  page({
    id: 'golden-path-docs-standard',
    title: 'Golden Path documentation standard',
    path: '/engineering/golden-path-documentation',
    kind: 'Golden Path',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Golden Path Team',
    section: 'BUILD',
  }),
  page({
    id: 'platform-intro',
    title: 'Platform Overview',
    path: '/developer/getting-started#platform-introduction',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'prerequisites',
    title: 'Developer prerequisites',
    path: '/developer/getting-started#developer-prerequisites',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'github-setup',
    title: 'GitHub Setup',
    path: '/github-setup',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'hosted-login',
    title: 'Hosted GitHub login',
    path: '/developer/hosted-login',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'platform-repository',
    title: 'Platform GitHub repository',
    path: '/github/platform-repository',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'portainer',
    title: 'Portainer hosting',
    path: '/deployment/portainer',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'control-plane-hosting',
    title: 'Control Plane hosting',
    path: '/operations/control-plane-hosting',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'GETTING STARTED',
  }),
  page({
    id: 'deliver-github',
    title: 'GitHub',
    path: '/github-setup',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'docker',
    title: 'Docker',
    path: '/engineering/docker',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'why-data-products',
    title: 'Why Data Products?',
    path: '/fundamentals/data-products#why-data-products',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'keep-core-standard',
    title: 'Keep Core Systems Standard',
    path: '/fundamentals/system-of-record',
    kind: 'Architecture',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'PLATFORM FUNDAMENTALS',
  }),
  page({
    id: 'editions',
    title: 'Internal / Template / Platform / SaaS editions',
    path: '/architecture/deployment-models',
    kind: 'Architecture',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'ARCHITECTURE',
  }),
  page({
    id: 'build-golden-paths',
    title: 'Golden Paths',
    path: '/fundamentals/golden-paths',
    kind: 'Golden Path',
    audience: 'PLATFORM_USER',
    owner: 'Golden Path Team',
    section: 'BUILD',
  }),
  page({
    id: 'catalog-registration',
    title: 'Catalog Registration',
    path: '/how-to/register-catalog',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'operate-techdocs',
    title: 'TechDocs',
    path: '/how-to/publish-techdocs',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'DELIVER',
  }),
  page({
    id: 'platform-compliance',
    title: 'Platform Compliance',
    path: '/engineering/standard',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'OPERATE',
  }),
  page({
    id: 'upgrade-status',
    title: 'Upgrade Status',
    path: '/engineering/versioning',
    kind: 'Platform Documentation',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'OPERATE',
  }),
  page({
    id: 'howto-run-locally',
    title: 'Local Development',
    path: '/developer/local-development',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-run-tests',
    title: 'Run tests',
    path: '/developer/local-development',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-docker',
    title: 'Build Docker image',
    path: '/engineering/docker',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-breaking',
    title: 'Handle a Breaking Change',
    path: '/how-to/breaking-change',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-register',
    title: 'Register in Catalog',
    path: '/how-to/register-catalog',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'howto-techdocs',
    title: 'Publish TechDocs',
    path: '/how-to/publish-techdocs',
    kind: 'How-To',
    audience: 'PLATFORM_USER',
    owner: 'Platform Team',
    section: 'HOW-TO',
  }),
  page({
    id: 'nexora-industrial',
    title: 'Nexora Industrial Plugin Suite',
    path: '/nexora/index',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'INDUSTRIAL',
  }),
  page({
    id: 'nexora-asset-explorer',
    title: 'Asset & Equipment Explorer',
    path: '/nexora/asset-explorer',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'INDUSTRIAL',
  }),
  page({
    id: 'nexora-contract-explorer',
    title: 'Data Product & Contract Explorer',
    path: '/nexora/contract-explorer',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'INDUSTRIAL',
  }),
  page({
    id: 'nexora-quality-connectivity',
    title: 'Data Quality & Connectivity',
    path: '/nexora/quality-connectivity',
    kind: 'Platform Documentation',
    audience: 'INTERNAL_ENGINEERING',
    owner: 'Platform Team',
    section: 'INDUSTRIAL',
  }),
];

export const FIRST_DAY_STEPS: FirstDayStep[] = [
  {
    id: 'sign-in',
    title: 'Sign In',
    why: 'The Control Plane only works with an approved Catalog identity.',
    action: 'Open Sign In and continue with GitHub. Guest is local development only.',
    expected: 'You land on Home with your display name and platform role.',
    commonError: 'Unknown GitHub users are denied. Production requires a Catalog User.',
    learnMoreId: 'architecture-identity',
    platformRoute: '/',
  },
  {
    id: 'role',
    title: 'Verify Developer role',
    why: 'Certified Golden Paths can only be executed by Developer, Data Product Owner, or Platform Admin.',
    action: 'Check Home. Role should be Developer, Data Product Owner, or Platform Admin.',
    expected: 'Create Data Product appears in Quick actions.',
    commonError: 'Viewer can browse documentation but cannot create. Ask a Platform Admin to add you to data-product-developers.',
    learnMoreId: 'architecture-identity',
    platformRoute: '/',
  },
  {
    id: 'marketplace',
    title: 'Open Marketplace',
    why: 'Certified Golden Paths are discovered here rather than invented ad hoc.',
    action: 'Open Marketplace from Home, Developer Hub, or the sidebar.',
    expected: 'MQTT Temperature, REST Equipment, and OEE appear as certified Data Product Golden Paths. OEE commercial badge may still say FUTURE.',
    commonError: 'If Marketplace is empty, catalog load failed. Retry or check backend logs.',
    learnMoreId: 'getting-started',
    platformRoute: '/marketplace',
  },
  {
    id: 'select',
    title: 'Select a CERTIFIED Golden Path',
    why: 'Start from a reviewed manufacturing template, not a blank repository.',
    action: 'Open MQTT Temperature Data Product. Use REST Equipment only if that is the assigned path.',
    expected: 'The entry shows contract, certification, Golden Path documentation, and Create Data Product.',
    commonError: 'Unauthorized means your role cannot execute Scaffolder templates.',
    learnMoreId: 'howto-mqtt',
    platformRoute: '/marketplace/mqtt-temperature-data-product',
  },
  {
    id: 'configure',
    title: 'Configure Data Product',
    why: 'Name, owner, and repository identity become Catalog metadata.',
    action: 'Fill Data Product Name, Owner, and GitHub Repository. Keep the default contract version unless you are changing a contract.',
    expected: 'Review step lists repo owner pharma-data-factory and catalog registration.',
    commonError: 'Invalid names fail template validation before GitHub is called.',
    learnMoreId: 'howto-mqtt',
    platformRoute: '/create',
  },
  {
    id: 'create-repo',
    title: 'Create GitHub repository',
    why: 'The Golden Path generates source, tests, CI, Docker, contract, and catalog-info.',
    action: 'Create. Wait for publish:github and catalog:register.',
    expected: 'Success page with repository and Data Product links.',
    commonError: 'No token available for host: github.com means the GitHub App is not installed.',
    learnMoreId: 'deliver-github',
    platformRoute: '/create',
  },
  {
    id: 'clone',
    title: 'Clone repository',
    why: 'The Data Product must run independently of the Control Plane.',
    action: 'git clone the created GitHub repository.',
    expected: 'README, Dockerfile, contracts/, docs/, and .github/workflows/ci.yml are present.',
    commonError: 'Empty repo usually means publish:github failed. Re-run Create after fixing the App install.',
    learnMoreId: 'local-development',
  },
  {
    id: 'run-locally',
    title: 'Start locally',
    why: 'Prove the Data Plane starts without Nexora.',
    action: 'Follow the product README. Copy .env.example and start with Docker Compose or Python 3.12.',
    expected: 'Health endpoint returns 200.',
    commonError: 'Missing MQTT broker or SOURCE_API_URL fails startup. Use the values from .env.example.',
    learnMoreId: 'local-development',
  },
  {
    id: 'test-api',
    title: 'Test API',
    why: 'Consumers bind to the governed product API, not the source-system schema.',
    action: 'Call /health and the product API documented in TechDocs.',
    expected: 'JSON responses match the Data Contract fields.',
    commonError: '404 on /api/v1/... usually means the service is not the generated Data Product.',
    learnMoreId: 'contracts',
  },
  {
    id: 'run-tests',
    title: 'Run unit tests',
    why: 'Contract and quality checks must pass before you push.',
    action: 'Run pytest in the repository.',
    expected: 'Unit, contract, and quality tests pass.',
    commonError: 'Schema failures mean the payload drifted from the contract. Do not skip tests.',
    learnMoreId: 'quality',
  },
  {
    id: 'push',
    title: 'Push to GitHub',
    why: 'GitHub Actions is the quality gate for every official Data Product.',
    action: 'Commit on a branch and push. Open a pull request if main is protected.',
    expected: 'GitHub Actions workflow CI starts.',
    commonError: 'Workflows permission missing on the GitHub App prevents pushing ci.yml.',
    learnMoreId: 'ci-cd',
    platformRoute: '/data-products',
  },
  {
    id: 'inspect-ci',
    title: 'Inspect CI Quality Gate',
    why: 'The portal shows the latest GitHub Actions result. This is not GxP validation.',
    action: 'Open the Data Product in the portal and the CI Quality Gate card, or GitHub Actions.',
    expected: 'PASSED after lint, tests, and Docker build.',
    commonError: 'UNKNOWN means Actions read permission or GitHub is unavailable. FAILED lists stages.',
    learnMoreId: 'howto-ci',
    platformRoute: '/data-products',
  },
  {
    id: 'catalog',
    title: 'Open Data Product in Catalog',
    why: 'catalog-info.yaml is what makes the product discoverable.',
    action: 'Open Data Products and the new product, or Catalog.',
    expected: 'Owner, domain, contract version, and certification are visible.',
    commonError: 'Missing entity: catalog:register did not run or the location was not processed.',
    learnMoreId: 'catalog-registration',
    platformRoute: '/data-products',
  },
  {
    id: 'inspect-contract',
    title: 'Inspect Data Contract',
    why: 'Consumers bind to the versioned API, not source internals.',
    action: 'Open Contract on the Data Product page.',
    expected: 'Contract name, version, and compatibility status.',
    commonError: 'Not registered means the API entity was not created. Check catalog-info.yaml providesApis.',
    learnMoreId: 'contracts',
    platformRoute: '/data-products',
  },
  {
    id: 'inspect-quality',
    title: 'Inspect Quality',
    why: 'Required checks and platform versions are the technical evidence for the product.',
    action: 'Open Quality / Platform Compliance on the product page.',
    expected: 'Required checks, standard, SDK, and template versions.',
    commonError: 'This is not GxP validation. Missing versions mean catalog annotations were omitted.',
    learnMoreId: 'quality',
    platformRoute: '/data-products',
  },
  {
    id: 'inspect-dependencies',
    title: 'Inspect Dependencies',
    why: 'Catalog relationships (Provides, Consumes, Depends On, Used By) keep topology explicit.',
    action: 'Open Dependencies on the Data Product page.',
    expected: 'Related APIs and components are listed.',
    commonError: 'Empty relations usually mean providesApis, consumesApis, or dependsOn were omitted from catalog-info.yaml.',
    learnMoreId: 'architecture-data-product',
    platformRoute: '/data-products',
  },
  {
    id: 'techdocs',
    title: 'Open TechDocs',
    why: 'Product documentation is versioned with the repository, not a second wiki.',
    action: 'Open Documentation from Discover on the product page.',
    expected: 'TechDocs for that Data Product following the Golden Path documentation standard.',
    commonError: 'Missing techdocs-ref or mkdocs.yml leaves Documentation unavailable.',
    learnMoreId: 'golden-path-docs-standard',
  },
];

export const GOLDEN_PATH_DOC_SECTIONS = [
  'Overview',
  'Architecture',
  'Prerequisites',
  'Create',
  'Configuration',
  'Local Development',
  'API',
  'Data Contract',
  'Quality Rules',
  'Compatibility',
  'Testing',
  'CI/CD',
  'Docker',
  'Deployment',
  'Operations',
  'Troubleshooting',
  'Release Notes',
] as const;

export const DOCUMENTATION_OWNERS = [
  { area: 'Platform architecture', owner: 'Platform Team' },
  { area: 'MQTT Golden Path', owner: 'Golden Path Team' },
  { area: 'REST Equipment Golden Path', owner: 'Golden Path Team' },
  { area: 'OEE Golden Path', owner: 'Golden Path Team' },
  { area: 'Unified Namespace', owner: 'Platform Team' },
  { area: 'Data Product Standard', owner: 'Platform Team' },
  { area: 'Identity & RBAC', owner: 'Platform Team' },
] as const;

export function documentationUrl(path: string): string {
  const [pathname, hash] = path.split('#');
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${PLATFORM_DOCS_BASE}${normalized}${hash ? `#${hash}` : ''}`;
}

export function documentationPageById(id: string): DocumentationPage | undefined {
  return DOCUMENTATION_PAGES.find(item => item.id === id);
}

const HUB_SECTION_IDS: Record<string, readonly string[]> = {
  'GETTING STARTED': [
    'quick-start',
    'platform-intro',
    'local-development',
    'github-setup',
    'hosted-login',
    'platform-repository',
    'portainer',
    'control-plane-hosting',
    'first-data-product',
    'pilot-readiness',
    'pilot-hardening-gate',
    'pilot-runbook',
    'mvp-1.0-baseline',
    'status-model',
    'mvp-journey-evidence',
    'pilot-exit-gate',
  ],
  ARCHITECTURE: [
    'architecture-platform',
    'system-of-record',
    'control-plane',
    'architecture-integration',
    'platform-component-intelligence',
    'platform-component-oee',
    'oee-overview',
    'oee-golden-path-design',
    'oee-domain',
    'oee-contracts',
    'oee-calculation',
    'oee-time-windows',
    'oee-quality',
    'oee-source-mapping',
    'oee-pilot-limitations',
    'oee-pilot-integration',
    'oee-pilot-vendoring',
    'oee-mvp-boundary',
    'uns-architecture',
    'uns-oee',
    'uns-cold-chain',
    'architecture-identity',
    'architecture-deployment',
  ],
  COMMERCIAL: [
    'commercial-architecture',
    'entitlements-vs-rbac',
    'aws-marketplace-integration',
    'aws-marketplace-test-listing',
    'rest-equipment-packaging',
    'generated-placeholders',
    'commercial-product-ids',
    'template-edition',
    'platform-edition',
    'future-saas',
    'local-marketplace-simulation',
  ],
  BUILD: [
    'build-golden-paths',
    'platform-components',
    'platform-component-browse',
    'platform-component-using',
    'platform-component-composition',
    'platform-component-composer',
    'platform-component-product-model',
    'platform-component-vs-golden-path',
    'platform-component-vs-plugin',
    'platform-component-creating',
    'platform-component-certification',
    'platform-component-versioning',
    'platform-component-equipment-use-log',
    'platform-component-decision',
    'platform-component-future-composer',
    'platform-component-vendoring',
    'platform-component-model',
    'platform-component-standard',
    'platform-component-wave1-certified',
    'platform-component-wave1-baseline',
    'platform-component-certification-checklist',
    'platform-component-security',
    'platform-component-upgrade-policy',
    'platform-component-wave1-conformance',
    'platform-component-oee-ready',
    'platform-component-health',
    'platform-component-observability',
    'platform-component-rest-api',
    'platform-component-rest-source',
    'platform-component-mqtt-consumer',
    'platform-component-timeseries',
    'platform-component-from-components',
    'platform-component-machine-metrics',
    'platform-component-uns',
    'uns-overview',
    'uns-namespace',
    'uns-topic-naming',
    'uns-envelope',
    'uns-contracts',
    'uns-governance',
    'standard',
    'sdk',
    'contracts',
    'quality',
    'compatibility',
    'versioning',
    'golden-path-lifecycle',
  ],
  DELIVER: [
    'deliver-github',
    'ci-cd',
    'docker',
    'catalog-registration',
    'operate-techdocs',
    'certification',
    'release-management',
    'release-checklist',
  ],
  'HOW-TO': [
    'howto-mqtt',
    'howto-rest',
    'howto-oee',
    'howto-oee-pilot',
    'uns-mqtt',
    'uns-local',
    'uns-producer',
    'uns-consumer',
    'howto-compose-uns',
    'howto-contract',
    'howto-breaking',
    'howto-ci',
    'howto-run-locally',
    'troubleshooting',
    'uns-troubleshooting',
    'howto-release',
    'deprecation',
    'distribution-channels',
    'upgrade-guide',
  ],
};

function hubPage(id: string): DocumentationPage {
  const found = documentationPageById(id);
  if (!found) {
    throw new Error(`Unknown Developer Hub page ${id}`);
  }
  return found.hubTitle ? { ...found, title: found.hubTitle } : found;
}

export const DEVELOPER_HUB_SECTIONS: DeveloperHubSection[] = Object.entries(
  HUB_SECTION_IDS,
).map(([title, ids]) => ({
  id: title.toLowerCase().replace(/[^a-z]+/g, '-'),
  title,
  pages: ids.map(hubPage),
}));

export function documentationHref(id: string): string {
  const found = documentationPageById(id);
  return found ? documentationUrl(found.path) : PLATFORM_DOCS_BASE;
}

export function goldenPathDocumentationHref(templateId?: string): string {
  if (templateId?.includes('mqtt-temperature')) {
    return documentationHref('howto-mqtt');
  }
  if (templateId?.includes('rest-equipment')) {
    return documentationHref('howto-rest');
  }
  if (templateId?.includes('machine-state-consumer')) {
    return documentationHref('howto-compose-uns');
  }
  if (templateId?.includes('oee')) {
    return documentationHref('howto-oee');
  }
  if (templateId?.includes('unified-namespace')) {
    return documentationHref('uns-overview');
  }
  return documentationHref('golden-paths');
}

export function classifyTechDocsResult(input: {
  location?: string;
  title?: string;
  documentTitle?: string;
}): DocSearchKind {
  const haystack = `${input.location ?? ''} ${input.title ?? ''} ${input.documentTitle ?? ''}`.toLowerCase();
  if (haystack.includes('/contracts/') || haystack.includes('contract documentation')) {
    return 'Contract Documentation';
  }
  if (haystack.includes('/how-to/') || haystack.includes('how-to')) {
    return 'How-To';
  }
  if (
    haystack.includes('/architecture/') ||
    haystack.includes('architecture') ||
    haystack.includes('system-of-record') ||
    haystack.includes('control-plane')
  ) {
    return 'Architecture';
  }
  if (
    haystack.includes('golden-path') ||
    haystack.includes('mqtt-temperature') ||
    haystack.includes('rest-equipment')
  ) {
    return 'Golden Path';
  }
  if (haystack.includes('data-product') && !haystack.includes('data-product-platform')) {
    return 'Data Product Documentation';
  }
  if (haystack.includes('/docs/') && haystack.includes('component/') && !haystack.includes('data-product-platform')) {
    return 'Data Product Documentation';
  }
  return 'Platform Documentation';
}

export function documentationFilePath(docPath: string): string {
  const withoutHash = docPath.split('#')[0];
  const normalized = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  return `docs${normalized}.md`;
}

export type ContextualDocContext =
  | 'marketplaceGoldenPath'
  | 'productTechDocs'
  | 'platformCompliance'
  | 'contract'
  | 'ciQualityGate'
  | 'upgradeStatus'
  | 'architectureStory'
  | 'releaseCatalog';

export function contextualDocumentationHref(
  context: ContextualDocContext,
  extra?: string,
): string {
  if (context === 'marketplaceGoldenPath') {
    return goldenPathDocumentationHref(extra);
  }
  if (context === 'productTechDocs') {
    return extra || PLATFORM_DOCS_BASE;
  }
  if (context === 'platformCompliance') {
    return documentationHref('standard');
  }
  if (context === 'contract') {
    return documentationHref('contracts');
  }
  if (context === 'ciQualityGate') {
    return documentationHref('howto-ci');
  }
  if (context === 'architectureStory') {
    return ARCHITECTURE_STORY_PATH;
  }
  if (context === 'releaseCatalog') {
    return extra ? `/releases/${extra}` : '/releases';
  }
  return documentationHref('versioning');
}

export function documentationIndexPages(limit = 6): DocumentationPage[] {
  const hubIds = new Set(
    DEVELOPER_HUB_SECTIONS.flatMap(section => section.pages.map(hub => hub.id)),
  );
  const seen = new Set<string>();
  return DOCUMENTATION_PAGES.filter(item => {
    if (hubIds.has(item.id)) {
      return false;
    }
    const key = item.path.split('#')[0];
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export const HUB_GOLDEN_PATHS: HubGoldenPathCard[] = [
  {
    id: 'mqtt-temperature-data-product',
    name: 'MQTT Temperature Data Product',
    statusLabel: 'CERTIFIED',
    marketplacePath: '/marketplace/mqtt-temperature-data-product',
    docsId: 'howto-mqtt',
  },
  {
    id: 'rest-equipment-data-product',
    name: 'REST Equipment Data Product',
    statusLabel: 'CERTIFIED',
    marketplacePath: '/marketplace/rest-equipment-data-product',
    docsId: 'howto-rest',
  },
  {
    id: 'oee-data-product',
    name: 'OEE Data Product',
    statusLabel: 'CERTIFIED',
    marketplacePath: '/marketplace/oee-data-product',
    docsId: 'howto-oee',
  },
];

export function developerHubActionsForRole(role: PlatformRole): DeveloperHubAction[] {
  const read: DeveloperHubAction[] = [
    {
      id: 'guide',
      label: 'Build Your First Data Product',
      to: documentationHref('first-data-product'),
    },
    {
      id: 'components',
      label: 'Platform Components',
      to: '/platform-components',
    },
    {
      id: 'architecture',
      label: 'Explore the Architecture',
      to: ARCHITECTURE_STORY_PATH,
    },
    { id: 'search', label: 'Search documentation', to: SEARCH_PATH },
  ];
  if (!canExecuteScaffolder(role)) {
    return read;
  }
  return [
    { id: 'create', label: 'Create Data Product', to: '/create', developerOnly: true },
    {
      id: 'compose',
      label: 'Compose Data Product',
      to: '/compose',
      developerOnly: true,
    },
    {
      id: 'mqtt',
      label: 'Open MQTT Temperature',
      to: '/marketplace/mqtt-temperature-data-product',
      developerOnly: true,
    },
    ...read,
  ];
}

export function isCustomerFacingAudience(audience: DocAudience): boolean {
  return audience === 'CUSTOMER_PLATFORM' || audience === 'SAAS_CUSTOMER';
}

export function publicCustomerAudiences(): DocAudience[] {
  return ['CUSTOMER_PLATFORM', 'SAAS_CUSTOMER'];
}

export const AUDIENCE_LABELS: Record<DocAudience, string> = {
  INTERNAL_ENGINEERING: 'Internal Engineering',
  PLATFORM_USER: 'Platform User',
  CUSTOMER_PLATFORM: 'Customer Platform',
  SAAS_CUSTOMER: 'SaaS Customer',
};

export function audienceLabel(audience: DocAudience): string {
  return AUDIENCE_LABELS[audience];
}

export function documentationPagesForAudience(
  audience: DocAudience,
): DocumentationPage[] {
  return DOCUMENTATION_PAGES.filter(entry => entry.audience === audience);
}

export interface DocumentationPersona {
  id: string;
  title: string;
  description: string;
  pageIds: string[];
}

export const DOCUMENTATION_PERSONAS: DocumentationPersona[] = [
  {
    id: 'developer',
    title: 'Developer',
    description: 'Build, deliver, and operate Data Products.',
    pageIds: ['first-data-product', 'platform-components', 'sdk', 'contracts'],
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    description: 'Understand capabilities, status, and editions.',
    pageIds: [
      'capability-matrix',
      'status-model',
      'commercial-architecture',
      'platform-edition',
    ],
  },
  {
    id: 'customer',
    title: 'Customer',
    description: 'Customer-facing documentation is planned, not yet published.',
    pageIds: ['glossary', 'classification'],
  },
];
