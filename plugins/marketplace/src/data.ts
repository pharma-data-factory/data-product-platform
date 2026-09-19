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
  /** Requirement set key the Golden Path declares it satisfies, e.g. URS-EPM. */
  ursSatisfies?: string;
  ursRequirementCount?: number;
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
  ursSatisfies?: string;
  ursRequirementCount?: number;
}

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
  const api = apiName ? apis.find(entry => entry.name === apiName) : undefined;
  const templateName = item.templateReference?.split('/').pop();
  const template = templateName
    ? templates.find(entry => entry.name === templateName)
    : undefined;
  const release = isOfficialGoldenPath(item.id)
    ? currentRelease(item.id)
    : undefined;
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
    distribution: release
      ? visibleDistribution(release.distribution)
      : undefined,
    releaseDate: release?.release.date,
    commercialStatus: commercial.commercialStatus,
    commercialCopy: commercial.commercialCopy,
    // Taken from the Template entity only. Unlike version or certification
    // there is no release-registry fallback: the requirements a path satisfies
    // are stated by the path itself or not at all.
    ursSatisfies: template?.ursSatisfies,
    ursRequirementCount: template?.ursRequirementCount,
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
