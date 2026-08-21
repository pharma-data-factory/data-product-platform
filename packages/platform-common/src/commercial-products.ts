// Basename must not match this module. Node/esbuild can resolve
// `./commercial-products` to a sibling `.json` file, which makes
// loadCommercialProductCatalog undefined and crashes auth at startup.
import catalog from './commercial-products.catalog.json';

export const COMMERCIAL_PRODUCT_IDS = [
  'golden-path.mqtt-temperature',
  'golden-path.rest-equipment',
  'platform.core',
  'platform.components',
  'future.golden-path.oee',
] as const;

export type CommercialProductId = (typeof COMMERCIAL_PRODUCT_IDS)[number];

export const COMMERCIAL_PRODUCT_TYPES = [
  'GOLDEN_PATH',
  'PLATFORM',
  'PLATFORM_COMPONENT',
] as const;

export type CommercialProductType = (typeof COMMERCIAL_PRODUCT_TYPES)[number];

export const COMMERCIAL_EDITIONS = [
  'INTERNAL',
  'TEMPLATE',
  'PLATFORM',
  'SAAS',
] as const;

export type CommercialEditionId = (typeof COMMERCIAL_EDITIONS)[number];

export const COMMERCIAL_DISTRIBUTION_CHANNELS = [
  'INTERNAL',
  'AWS_MARKETPLACE',
] as const;

export type CommercialDistributionChannel =
  (typeof COMMERCIAL_DISTRIBUTION_CHANNELS)[number];

export const COMMERCIAL_AVAILABILITY = [
  'AVAILABLE',
  'PLANNED',
  'FUTURE',
] as const;

export type CommercialAvailability = (typeof COMMERCIAL_AVAILABILITY)[number];

export const COMMERCIAL_CARD_STATUSES = [
  'AVAILABLE',
  'ENTITLED',
  'NOT_ENTITLED',
  'PENDING_ACCESS',
  'PLANNED',
  'FUTURE',
] as const;

export type CommercialCardStatus = (typeof COMMERCIAL_CARD_STATUSES)[number];

/**
 * Legacy identifiers from the MVP entitlement model. Resolve to stable
 * commercial product IDs. Do not use these as new entitlement keys.
 */
export const LEGACY_ENTITLEMENT_ALIASES: Readonly<Record<string, CommercialProductId>> =
  {
    'mqtt-temperature-template': 'golden-path.mqtt-temperature',
    'rest-equipment-template': 'golden-path.rest-equipment',
    'platform-core': 'platform.core',
  };

export interface CommercialProduct {
  key: string;
  productId: CommercialProductId;
  displayName: string;
  productType: CommercialProductType;
  catalogRef?: string;
  marketplaceId?: string;
  templateId?: string;
  editions: readonly CommercialEditionId[];
  distribution: readonly CommercialDistributionChannel[];
  availability: CommercialAvailability;
}

export interface CommercialProductCatalog {
  products: readonly CommercialProduct[];
}

export const LOCAL_DEFAULT_PRODUCT_IDS: readonly CommercialProductId[] = [
  'golden-path.mqtt-temperature',
  'golden-path.rest-equipment',
  'platform.core',
];

export function loadCommercialProductCatalog(
  document: CommercialProductCatalog = catalog as CommercialProductCatalog,
): CommercialProductCatalog {
  return {
    products: document.products.map(product => ({ ...product })),
  };
}

export function normalizeProductId(id: string): string {
  const trimmed = id.trim();
  return LEGACY_ENTITLEMENT_ALIASES[trimmed] ?? trimmed;
}

export function isCommercialProductId(id: string): id is CommercialProductId {
  return (COMMERCIAL_PRODUCT_IDS as readonly string[]).includes(
    normalizeProductId(id),
  );
}

export function findCommercialProduct(
  productId: string,
  catalogDocument = loadCommercialProductCatalog(),
): CommercialProduct | undefined {
  const normalized = normalizeProductId(productId);
  return catalogDocument.products.find(
    product => product.productId === normalized,
  );
}

export function commercialProductForTemplate(
  templateId: string,
  catalogDocument = loadCommercialProductCatalog(),
): CommercialProduct | undefined {
  return catalogDocument.products.find(
    product =>
      product.templateId === templateId || product.marketplaceId === templateId,
  );
}

export function commercialProductForMarketplaceItem(
  marketplaceId: string,
  catalogDocument = loadCommercialProductCatalog(),
): CommercialProduct | undefined {
  return catalogDocument.products.find(
    product => product.marketplaceId === marketplaceId,
  );
}

export function commercialCardStatus(
  product: CommercialProduct | undefined,
  entitled: boolean,
  accessState?: CommercialCardStatus,
): CommercialCardStatus | undefined {
  if (!product) {
    return undefined;
  }
  if (product.availability === 'FUTURE') {
    return 'FUTURE';
  }
  if (product.availability === 'PLANNED') {
    return 'PLANNED';
  }
  if (accessState === 'PENDING_ACCESS') {
    return 'PENDING_ACCESS';
  }
  return entitled ? 'ENTITLED' : 'NOT_ENTITLED';
}

export function commercialAvailabilityCopy(
  status: CommercialCardStatus | undefined,
): string | undefined {
  if (!status) {
    return undefined;
  }
  switch (status) {
    case 'ENTITLED':
    case 'AVAILABLE':
      return 'Available through your organization';
    case 'PENDING_ACCESS':
      return 'Marketplace registration is pending organization linking';
    case 'NOT_ENTITLED':
      return 'Available through your organization';
    case 'PLANNED':
    case 'FUTURE':
      return 'Commercial availability planned';
    default:
      return undefined;
  }
}

export function isCommerciallyOffered(product?: CommercialProduct): boolean {
  return product?.availability === 'AVAILABLE';
}
