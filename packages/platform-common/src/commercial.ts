import { loadGoldenPathReleaseCatalog } from './releases';

export type EditionAvailability = 'available' | 'planned' | 'future';

export type ProductEditionId = 'template' | 'platform' | 'saas';

export type OperatingEditionId = 'internal' | ProductEditionId;

export interface OperatingEdition {
  id: OperatingEditionId;
  name: string;
  statusLabel: string;
  availability: EditionAvailability;
  customerSku: boolean;
}

/** Internal operating mode. Not a customer SKU on the public site. */
export const INTERNAL_OPERATING_EDITION: OperatingEdition = {
  id: 'internal',
  name: 'Internal Developer Platform',
  statusLabel: 'AVAILABLE',
  availability: 'available',
  customerSku: false,
};

export type DeploymentKind = 'customer-hosted' | 'managed';

export interface ProductEdition {
  id: ProductEditionId;
  name: string;
  statusLabel: string;
  availability: EditionAvailability;
  description: string;
  bestFor: string;
  priceLabel: string;
  priceHint: string;
  includes: readonly string[];
  includesFrom?: string;
  futureCapabilities?: readonly string[];
  deployment: string;
  deploymentKind: DeploymentKind;
  deploymentBadge: string;
  commercialModel: string;
  cta: string;
  ctaHref?: string;
  ctaDisabled?: boolean;
}

export interface PricingModel {
  id: ProductEditionId;
  name: string;
  model: string;
  bestFor: string;
  statusLabel?: string;
}

export type GoldenPathAvailability = 'current' | 'future';

export const GOLDEN_PATH_CATEGORIES = [
  'Telemetry',
  'Equipment',
  'Performance',
  'Integration',
] as const;

export type GoldenPathCategory = (typeof GOLDEN_PATH_CATEGORIES)[number];

export interface GoldenPathShowcaseItem {
  id: string;
  name: string;
  statusLabel: string;
  availability: GoldenPathAvailability;
  category: GoldenPathCategory;
  version?: string;
}

export function filterGoldenPaths(
  paths: readonly GoldenPathShowcaseItem[],
  query: string,
  category: GoldenPathCategory | 'All',
  extraText: Record<string, string> = {},
): GoldenPathShowcaseItem[] {
  const needle = query.trim().toLowerCase();
  return paths.filter(path => {
    if (category !== 'All' && path.category !== category) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const haystack = [
      path.id,
      path.name,
      path.category,
      path.statusLabel,
      extraText[path.id] ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export const LEGAL_DISTRIBUTION_STATUS = {
  engineeringPackage: 'READY FOR LEGAL REVIEW',
  counselGates: 'OPEN',
  commerciallyDistributable: false,
} as const;

export type LegalDistributionStatus = 'BLOCKED' | 'APPROVED';

export function parseLegalDistributionStatus(
  value?: string,
): LegalDistributionStatus {
  return value === 'APPROVED' ? 'APPROVED' : 'BLOCKED';
}

export const DEPLOYMENT_OPTIONS = [
  { id: 'customer-hosted', label: 'Customer-hosted' },
  { id: 'managed', label: 'Managed' },
] as const;

export const PRODUCT_EDITIONS: readonly ProductEdition[] = [
  {
    id: 'template',
    name: 'Template',
    statusLabel: 'AVAILABLE FOR PILOT',
    availability: 'available',
    description:
      'Certified Nexora Golden Paths for a controlled pilot. Not commercially distributable until counsel approves LICENSE/NOTICE gates.',
    bestFor: 'Ideal for teams with an existing engineering platform',
    priceLabel: 'Per template',
    priceHint: 'License or subscription',
    includes: [
      'Certified templates',
      'Data Contracts',
      'Quality Gates',
      'Compatibility Checks',
      'CI/CD',
      'Docker',
      'TechDocs',
    ],
    deployment: 'Customer AWS / Customer GitHub',
    deploymentKind: 'customer-hosted',
    deploymentBadge: 'Customer-hosted',
    commercialModel: 'Per Template / Subscription',
    cta: 'Explore Templates',
    ctaHref: '#golden-paths',
  },
  {
    id: 'platform',
    name: 'Platform',
    statusLabel: 'PLANNED',
    availability: 'planned',
    description:
      "A complete Nexora Control Plane deployed into the customer's own cloud environment.",
    bestFor: 'Ideal for organizations wanting their own Control Plane',
    priceLabel: "Let's talk",
    priceHint: 'Annual platform license',
    includesFrom: 'Template',
    includes: [
      'Marketplace',
      'Data Product Catalog',
      'Governance',
      'Search',
      'RBAC',
      'Upgrade Management',
      'Customer-cloud Control Plane',
    ],
    deployment: 'Customer Cloud',
    deploymentKind: 'customer-hosted',
    deploymentBadge: 'Customer cloud',
    commercialModel: 'Annual Platform License',
    cta: 'Get in Touch',
    ctaHref: '#contact',
  },
  {
    id: 'saas',
    name: 'SaaS',
    statusLabel: 'FUTURE',
    availability: 'future',
    description:
      'Fully managed Nexora operated as a service.',
    bestFor: 'Ideal for organizations wanting Data Product Factory as a Service',
    priceLabel: 'Coming later',
    priceHint: 'Managed subscription',
    includesFrom: 'Platform',
    includes: [],
    futureCapabilities: [
      'Managed Control Plane',
      'Customer organizations',
      'Customer SSO',
      'Tenant isolation',
      'Managed upgrades',
      'Usage/entitlement management',
      'Operational monitoring',
    ],
    deployment: 'Managed SaaS',
    deploymentKind: 'managed',
    deploymentBadge: 'Managed',
    commercialModel: 'Managed Subscription',
    cta: 'Coming Later',
    ctaDisabled: true,
  },
];

export const PRICING_MODELS: readonly PricingModel[] = PRODUCT_EDITIONS.map(
  edition => ({
    id: edition.id,
    name: edition.name,
    model: edition.commercialModel,
    bestFor: edition.bestFor,
    statusLabel: edition.availability === 'future' ? 'Future' : undefined,
  }),
);

/**
 * Which Golden Paths are CERTIFIED is authoritative in the release catalog
 * (`golden-path-releases.yaml`). The showcase adds marketing display fields
 * (short id, marketing name/version, category) that do not live in the
 * release model.
 */
const SHOWCASE_METADATA: Record<
  string,
  { id: string; name: string; version: string; category: GoldenPathCategory }
> = {
  'mqtt-temperature-data-product': {
    id: 'mqtt-temperature',
    name: 'MQTT Temperature Data Product',
    version: '1.0',
    category: 'Telemetry',
  },
  'rest-equipment-data-product': {
    id: 'rest-equipment',
    name: 'REST Equipment Data Product',
    version: '1.0',
    category: 'Equipment',
  },
  'oee-data-product': {
    id: 'oee',
    name: 'OEE Data Product',
    version: '1.0',
    category: 'Performance',
  },
  'aas-data-product': {
    id: 'aas-data-product',
    name: 'AAS Asset Administration Shell',
    version: '1.0',
    category: 'Equipment',
  },
};

export const ROADMAP_GOLDEN_PATHS: readonly GoldenPathShowcaseItem[] = [
  {
    id: 'snowflake',
    name: 'Snowflake',
    statusLabel: 'PLANNED / FUTURE',
    availability: 'future',
    category: 'Integration',
  },
  {
    id: 'sap',
    name: 'SAP',
    statusLabel: 'PLANNED / FUTURE',
    availability: 'future',
    category: 'Integration',
  },
  {
    id: 'cold-chain',
    name: 'Cold Chain',
    statusLabel: 'PLANNED / FUTURE',
    availability: 'future',
    category: 'Telemetry',
  },
];

export function showcaseGoldenPaths(): GoldenPathShowcaseItem[] {
  const certified = loadGoldenPathReleaseCatalog().releases
    .filter(release => release.certification.status === 'CERTIFIED')
    .flatMap(release => {
      const meta = SHOWCASE_METADATA[release.template];
      return meta
        ? [
            {
              ...meta,
              statusLabel: 'CERTIFIED',
              availability: 'current' as const,
            },
          ]
        : [];
    });
  return [...certified, ...ROADMAP_GOLDEN_PATHS];
}

export const PLATFORM_CAPABILITIES = [
  {
    id: 'connect',
    title: 'CONNECT',
    text: 'Connect operational and enterprise data sources.',
  },
  {
    id: 'create',
    title: 'CREATE',
    text: 'Create standardized Data Products using certified Golden Paths.',
  },
  {
    id: 'trust',
    title: 'TRUST',
    text: 'Versioned contracts, quality gates and compatibility checks.',
  },
  {
    id: 'govern',
    title: 'GOVERN',
    text: 'Ownership, RBAC, technical certification and lifecycle governance.',
  },
  {
    id: 'discover',
    title: 'DISCOVER',
    text: 'Catalog, Search, TechDocs and Marketplace.',
  },
  {
    id: 'operate',
    title: 'OPERATE',
    text: 'CI/CD, versioning, compliance status and upgrade management.',
  },
] as const;

export const HOW_IT_WORKS_STEPS = [
  'Discover',
  'Create',
  'Test',
  'Govern',
  'Publish',
  'Consume',
] as const;

export const ENTERPRISE_PRICING_CTA = 'Contact us for enterprise pricing.';

export interface LearnTopic {
  id: string;
  title: string;
  summary: string;
}

export const LEARN_TOPICS: readonly LearnTopic[] = [
  {
    id: 'data-product',
    title: 'What is a Data Product?',
    summary:
      'A managed data offering with a named owner. Other teams can find it, trust it, and use it — without changing ERP, MES, or LIMS.',
  },
  {
    id: 'data-contract',
    title: 'What is a Data Contract?',
    summary:
      'The agreement on meaning, quality, and permitted use. Consumers rely on the contract, not on informal extracts.',
  },
  {
    id: 'ownership',
    title: 'Ownership',
    summary:
      'One team is accountable for the product. Quality, changes, and support stay with that owner.',
  },
  {
    id: 'assembly',
    title: 'How products are assembled',
    summary:
      'Reusable capabilities are combined into certified Golden Paths. Temperature and Equipment share the same governed core; only the source changes.',
  },
  {
    id: 'catalog-marketplace',
    title: 'Catalog vs Marketplace',
    summary:
      'The catalog shows what already exists. The marketplace is where teams start a certified Golden Path.',
  },
];

export const LEARN_ASSEMBLY_STEPS = [
  'Connect sources',
  'Apply contract and quality',
  'Publish a Data Product',
] as const;

export const LEARN_ASSEMBLY_EXAMPLES = [
  'Temperature',
  'Equipment',
] as const;

export function learnTopicHref(id: string): string {
  return `#learn-${id}`;
}
