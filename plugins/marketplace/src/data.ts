import {
  CertificationStatus,
  DataProduct,
  QualityStatus,
} from '@internal/plugin-data-products';
import {
  DistributionChannel,
  GoldenPathLifecycle,
  canCreateOfficialGoldenPath,
  commercialAvailabilityCopy,
  commercialCardStatus,
  commercialProductForMarketplaceItem,
  currentRelease,
  isCommerciallyOffered,
  isOfficialGoldenPath,
  visibleDistribution,
  type CommercialCardStatus,
} from '@internal/platform-common';
import type { PlatformRole } from '@internal/platform-common';

export const MARKETPLACE_CATEGORIES = [
  'Templates',
  'Connectors',
  'Data Products',
  'Platform Components',
  'Solutions',
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export function marketplaceOfferingKind(
  item: Pick<MarketplaceItem, 'category'>,
): 'BUILDING BLOCK' | 'DATA PRODUCT' | undefined {
  if (item.category === 'Platform Components') {
    return 'BUILDING BLOCK';
  }
  if (item.category === 'Data Products') {
    return 'DATA PRODUCT';
  }
  return undefined;
}

export interface MarketplaceCatalogApi {
  name: string;
  contractVersion?: string;
}

export interface MarketplaceCatalogTemplate {
  name: string;
  certificationStatus?: CertificationStatus;
  templateVersion?: string;
  dataProductStandardVersion?: string;
  dataProductSdkVersion?: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  category: MarketplaceCategory;
  version: string;
  description: string;
  provider: string;
  compatibility: string;
  status: 'available' | 'preview';
  certificationStatus: CertificationStatus;
  documentation: string;
  templateReference?: string;
  catalogEntityRef?: string;
  contractApiRef?: string;
  contractName?: string;
  contractVersion?: string;
  qualityStatus?: QualityStatus;
  templateVersion?: string;
  dataProductStandardVersion?: string;
  dataProductSdkVersion?: string;
  releaseStatus?: GoldenPathLifecycle;
  distribution?: readonly DistributionChannel[];
  releaseDate?: string;
  commercialStatus?: CommercialCardStatus;
  commercialCopy?: string;
}

export const marketplaceItems: MarketplaceItem[] = [
  {
    id: 'python-microservice',
    name: 'Python Microservice',
    category: 'Templates',
    version: '1.0.0',
    description:
      'General service template (FastAPI). Not an official Data Product Golden Path.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, Docker, GitHub',
    status: 'available',
    certificationStatus: 'TESTED',
    documentation: '/create/templates/default/python-microservice',
    templateReference: 'template:default/python-microservice',
  },
  {
    id: 'nodejs-microservice',
    name: 'Node.js Microservice',
    category: 'Templates',
    version: '1.0.0',
    description:
      'TypeScript Express microservice with Vitest, ESLint, Docker, and GitHub Actions.',
    provider: 'Nexora',
    compatibility: 'Node.js 20+, Docker, GitHub',
    status: 'available',
    certificationStatus: 'TESTED',
    documentation: '/create/templates/default/nodejs-microservice',
    templateReference: 'template:default/nodejs-microservice',
  },
  {
    id: 'mqtt-data-connector',
    name: 'MQTT Connector',
    category: 'Connectors',
    version: '1.0.0',
    description:
      'Demonstration MQTT connector with environment-based broker configuration.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT 3.1.1, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/mqtt-data-connector',
    templateReference: 'template:default/mqtt-data-connector',
  },
  {
    id: 'mqtt-temperature-data-product',
    name: 'MQTT Temperature Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'MQTT temperature data product with a versioned temperature-event contract.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT 3.1.1, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/mqtt-temperature-data-product',
    templateReference: 'template:default/mqtt-temperature-data-product',
  },
  {
    id: 'rest-equipment-data-product',
    name: 'REST Equipment Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'REST equipment data product with a versioned equipment-event contract.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, REST, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/rest-equipment-data-product',
    templateReference: 'template:default/rest-equipment-data-product',
  },
  {
    id: 'unified-namespace',
    name: 'Unified Namespace',
    category: 'Platform Components',
    version: '1.0.0',
    description:
      'Reusable MQTT Unified Namespace. Platform component, not a Data Product.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT 3.1.1, Docker',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/unified-namespace',
    templateReference: 'template:default/unified-namespace',
    catalogEntityRef: 'component:default/unified-namespace',
  },
  {
    id: 'aas-foundation',
    name: 'Asset Administration Shell',
    category: 'Platform Components',
    version: '1.0.0',
    description:
      'AAS Foundation prototype for asset and sensor semantics. Platform component, not a Data Product. Control Plane persistence is in-memory.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, SQLite, REST',
    status: 'preview',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/docs/default/component/data-product-platform/aas/index',
    templateReference: 'template:default/aas-asset',
    catalogEntityRef: 'component:default/aas-foundation',
  },
  {
    id: 'machine-state-consumer-data-product',
    name: 'Machine State Consumer Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'Composition / reference proof that consumes machine-state events from Unified Namespace. Not an official RELEASED Data Product Golden Path. Not OEE.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT, Docker, Unified Namespace',
    status: 'available',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/create/templates/default/machine-state-consumer-data-product',
    templateReference: 'template:default/machine-state-consumer-data-product',
    catalogEntityRef: 'component:default/sample-machine-state-consumer',
    contractApiRef:
      'api:default/sample-machine-state-consumer--machine-state-event',
  },
  {
    id: 'aas-data-product',
    name: 'AAS Asset Administration Shell Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) for asset registry, multi-source ingestion (MQTT/REST), and semantic asset management. Technical CERTIFIED; asset-event-v1.0.0 data contract.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT, REST, Docker, BaSyx SDK',
    status: 'available',
    certificationStatus: 'CERTIFIED',
    documentation: '/create/templates/default/aas-data-product',
    templateReference: 'template:default/aas-data-product',
  },
  {
    id: 'oee-data-product',
    name: 'OEE Data Product',
    category: 'Data Products',
    version: '1.0.0',
    description:
      'Overall Equipment Effectiveness for one equipment and time window. Availability × Performance × Quality from MES production context (REST) and machine events (MQTT). Published as oee-result 1.0.0. Technical CERTIFIED only; not GxP validated.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, MQTT, REST, Docker, Wave 1 components',
    status: 'available',
    certificationStatus: 'CERTIFIED',
    documentation: '/create/templates/default/oee-data-product',
    templateReference: 'template:default/oee-data-product',
  },
  {
    id: 'rest-api-connector',
    name: 'REST API Connector',
    category: 'Connectors',
    version: '0.1.0',
    description:
      'Reusable REST ingest building block: poll a governed HTTP source, validate a contract, and feed Data Products. Template not generated in this release; REST Equipment already proves the pattern.',
    provider: 'Nexora',
    compatibility: 'HTTP APIs',
    status: 'preview',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/docs/marketplace',
  },
  {
    id: 'snowflake-connector',
    name: 'Snowflake Connector',
    category: 'Connectors',
    version: '0.1.0',
    description:
      'Warehouse landing behind the Product Publish Bus: StreamEvent envelopes stage locally (file) or as Snowflake DDL+JSONL stubs via platform component warehouse-sink. No live Snowflake session and no Create template in this release.',
    provider: 'Nexora',
    compatibility: 'Python 3.12+, warehouse-sink (DEVELOPMENT), Publish Bus annotations',
    status: 'preview',
    certificationStatus: 'DEVELOPMENT',
    documentation: '/docs/default/component/data-product-platform/platform-components/index',
  },
];

function refersTo(ref: string, product: DataProduct): boolean {
  return (
    ref === product.entityRef ||
    ref === product.name ||
    ref.endsWith(`/${product.name}`)
  );
}

export function enrichMarketplaceItem(
  item: MarketplaceItem,
  products: DataProduct[] = [],
  apis: MarketplaceCatalogApi[] = [],
  templates: MarketplaceCatalogTemplate[] = [],
  entitledProductIds?: readonly string[],
): MarketplaceItem {
  const product = item.catalogEntityRef
    ? products.find(entry => refersTo(item.catalogEntityRef ?? '', entry))
    : products.find(entry => entry.templateName === item.id);
  const apiName = item.contractApiRef?.split('/').pop();
  const api = apiName
    ? apis.find(entry => entry.name === apiName)
    : undefined;
  const templateName = item.templateReference?.split('/').pop();
  const template = templateName
    ? templates.find(entry => entry.name === templateName)
    : undefined;
  const release = isOfficialGoldenPath(item.id) ? currentRelease(item.id) : undefined;
  const commercial = marketplaceCommercialState(
    item,
    entitledProductIds
      ? entitledProductIds.includes(
          commercialProductForMarketplaceItem(item.id)?.productId ?? '',
        )
      : true,
  );

  return {
    ...item,
    contractName:
      product?.contractLogicalName ||
      product?.contractTitle ||
      product?.providesContract ||
      product?.consumesContract ||
      api?.name,
    contractVersion:
      api?.contractVersion || product?.dataContractVersion || undefined,
    qualityStatus: product?.qualityStatus,
    certificationStatus:
      (release?.certification.status as CertificationStatus | undefined) ??
      template?.certificationStatus ??
      item.certificationStatus,
    version: release?.version ?? item.version,
    templateVersion:
      release?.version ?? product?.templateVersion ?? template?.templateVersion,
    dataProductStandardVersion:
      release?.certification.standard ??
      product?.dataProductStandardVersion ??
      template?.dataProductStandardVersion,
    dataProductSdkVersion:
      release?.certification.sdk ??
      product?.dataProductSdkVersion ??
      template?.dataProductSdkVersion,
    releaseStatus: release?.status,
    distribution: release ? visibleDistribution(release.distribution) : undefined,
    releaseDate: release?.release.date,
    commercialStatus: commercial.commercialStatus,
    commercialCopy: commercial.commercialCopy,
  };
}

export function enrichMarketplaceItems(
  items: MarketplaceItem[],
  products: DataProduct[] = [],
  apis: MarketplaceCatalogApi[] = [],
  templates: MarketplaceCatalogTemplate[] = [],
  entitledProductIds?: readonly string[],
): MarketplaceItem[] {
  return items.map(item =>
    enrichMarketplaceItem(item, products, apis, templates, entitledProductIds),
  );
}

export function marketplaceCreateAllowed(
  item: MarketplaceItem,
  role: PlatformRole,
  entitled = true,
): boolean {
  if (!item.templateReference) {
    return false;
  }
  if (!canCreateOfficialGoldenPath(role, item.id)) {
    return false;
  }
  if (item.commercialStatus === 'PENDING_ACCESS') {
    return false;
  }
  const product = commercialProductForMarketplaceItem(item.id);
  if (product && isCommerciallyOffered(product)) {
    return entitled;
  }
  return true;
}

export function marketplaceCommercialState(
  item: Pick<MarketplaceItem, 'id'>,
  entitled: boolean,
  accessState?: CommercialCardStatus,
): Pick<MarketplaceItem, 'commercialStatus' | 'commercialCopy'> {
  const product = commercialProductForMarketplaceItem(item.id);
  const status = commercialCardStatus(product, entitled, accessState);
  return {
    commercialStatus: status,
    commercialCopy: commercialAvailabilityCopy(status),
  };
}

export function goldenPathCreateHighlights(item: MarketplaceItem): string[] {
  if (item.id === 'mqtt-temperature-data-product') {
    return [
      'Certified Golden Path',
      'MQTT',
      'Data Contract',
      'Quality Gate',
      'CI/CD',
      'TechDocs',
    ];
  }
  if (item.id === 'rest-equipment-data-product') {
    return [
      'Certified Golden Path',
      'REST',
      'Data Contract',
      'Quality Gate',
      'CI/CD',
      'TechDocs',
    ];
  }
  if (item.id === 'aas-data-product') {
    return [
      'Certified Golden Path',
      'AAS',
      'IEC 63278 / IDTA-01001 v3.0',
      'Asset Registry',
      'MQTT/REST Ingest',
      'Data Contract',
      'Quality Gate',
      'CI/CD',
      'TechDocs',
    ];
  }
  if (item.id === 'unified-namespace') {
    return [
      'BUILDING BLOCK',
      'Platform Component',
      'MQTT',
      'Unified Namespace',
      'Topic Contracts',
      'TechDocs',
    ];
  }
  if (item.id === 'aas-foundation') {
    return [
      'BUILDING BLOCK',
      'Platform Component',
      'AAS',
      'Asset Semantics',
      'TechDocs',
    ];
  }
  if (item.id === 'oee-data-product') {
    return [
      'Certified Golden Path',
      'OEE',
      'MQTT',
      'REST',
      'Data Contract',
      'Quality Gate',
      'CI/CD',
      'TechDocs',
    ];
  }
  if (item.id === 'machine-state-consumer-data-product') {
    return [
      'Composition Proof',
      'Unified Namespace',
      'MQTT',
      'Data Contract',
      'Quality Gate',
      'TechDocs',
    ];
  }
  return [];
}

export function filterMarketplaceItems(
  items: MarketplaceItem[],
  query: string,
  category?: MarketplaceCategory | 'All',
): MarketplaceItem[] {
  return items.filter(item => {
    const matchesCategory =
      !category || category === 'All' || item.category === category;
    const haystack = [
      item.name,
      item.description,
      item.provider,
      item.compatibility,
      item.status,
      item.certificationStatus,
      item.templateReference ?? '',
      item.contractName ?? '',
      item.contractVersion ?? '',
      item.qualityStatus ?? '',
      item.templateVersion ?? '',
      item.dataProductStandardVersion ?? '',
      item.dataProductSdkVersion ?? '',
      item.releaseStatus ?? '',
      item.commercialStatus ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  });
}
