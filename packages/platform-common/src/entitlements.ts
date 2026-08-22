/**
 * Provider-neutral commercial entitlement model.
 *
 * Identity and RBAC stay independent. AWS Marketplace is one possible
 * entitlement source and must not become the authorization model.
 *
 * Do not store AWS secrets, registration tokens, or customer tokens in
 * entitlement records.
 */

import {
  CommercialProductId,
  LOCAL_DEFAULT_PRODUCT_IDS,
  loadCommercialProductCatalog,
  normalizeProductId,
} from './commercial-products';

export const ENTITLEMENT_STATUSES = [
  'ACTIVE',
  'PENDING',
  'EXPIRED',
  'SUSPENDED',
  'UNKNOWN',
] as const;

export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const ENTITLEMENT_SOURCES = [
  'INTERNAL',
  'AWS_MARKETPLACE',
  'MANUAL',
  'FUTURE_OTHER_MARKETPLACE',
] as const;

export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number];

export const ENTITLEMENT_PROVIDER_IDS = ['local', 'aws'] as const;

export type EntitlementProviderId = (typeof ENTITLEMENT_PROVIDER_IDS)[number];

export const COMMERCIAL_ENVIRONMENTS = [
  'local',
  'test-marketplace',
  'production',
] as const;

export type CommercialEnvironment = (typeof COMMERCIAL_ENVIRONMENTS)[number];

export const ENTITLEMENT_IDS = [
  'golden-path.mqtt-temperature',
  'golden-path.rest-equipment',
  'platform.core',
  'platform.components',
  'future.golden-path.oee',
] as const;

export type EntitlementId = (typeof ENTITLEMENT_IDS)[number];

export const MVP_ENABLED_ENTITLEMENTS: readonly CommercialProductId[] =
  LOCAL_DEFAULT_PRODUCT_IDS;

export const FUTURE_ENTITLEMENTS: readonly CommercialProductId[] = [
  'future.golden-path.oee',
];

export interface Entitlement {
  id: string;
  organizationId: string;
  productId: string;
  productType: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  validFrom?: string;
  validUntil?: string;
  dimensions?: Readonly<Record<string, string | number | boolean>>;
  externalReference?: string;
  metadata?: Readonly<Record<string, string>>;
}

export interface EntitlementContext {
  organizationId: string;
  entitlements: readonly Entitlement[];
  source: EntitlementSource;
  provider: EntitlementProviderId;
  isEntitled(productId: string): boolean;
  getEntitlement(productId: string): Entitlement | undefined;
  listAvailableCapabilities(): readonly string[];
}

export function isActiveEntitlement(
  entitlement: Entitlement | undefined,
  now = new Date(),
): boolean {
  if (!entitlement || entitlement.status !== 'ACTIVE') {
    return false;
  }
  if (entitlement.validFrom && new Date(entitlement.validFrom) > now) {
    return false;
  }
  if (entitlement.validUntil && new Date(entitlement.validUntil) <= now) {
    return false;
  }
  return true;
}

export function deriveEntitlementStatus(
  entitlement: Pick<Entitlement, 'status' | 'validFrom' | 'validUntil'>,
  now = new Date(),
): EntitlementStatus {
  if (entitlement.status === 'SUSPENDED' || entitlement.status === 'PENDING') {
    return entitlement.status;
  }
  if (entitlement.validUntil && new Date(entitlement.validUntil) <= now) {
    return 'EXPIRED';
  }
  if (entitlement.validFrom && new Date(entitlement.validFrom) > now) {
    return 'PENDING';
  }
  return entitlement.status;
}

export function createEntitlementRecord(input: {
  organizationId: string;
  productId: string;
  status?: EntitlementStatus;
  source?: EntitlementSource;
  productType?: string;
  validFrom?: string;
  validUntil?: string;
  dimensions?: Readonly<Record<string, string | number | boolean>>;
  externalReference?: string;
  metadata?: Readonly<Record<string, string>>;
}): Entitlement {
  const productId = normalizeProductId(input.productId);
  const catalogProduct = loadCommercialProductCatalog().products.find(
    product => product.productId === productId,
  );
  const agreementKey = input.externalReference?.trim();
  return {
    id: agreementKey
      ? `${input.organizationId}:${productId}:${agreementKey}`
      : `${input.organizationId}:${productId}`,
    organizationId: input.organizationId,
    productId,
    productType: input.productType ?? catalogProduct?.productType ?? 'GOLDEN_PATH',
    source: input.source ?? 'INTERNAL',
    status: input.status ?? 'ACTIVE',
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    dimensions: input.dimensions,
    externalReference: input.externalReference,
    metadata: input.metadata,
  };
}

export function createDefaultEntitlementContext(
  enabled: readonly string[] = MVP_ENABLED_ENTITLEMENTS,
  organizationId = 'internal',
): EntitlementContext {
  const entitledIds = new Set(enabled.map(normalizeProductId));
  const entitlements: Entitlement[] = ENTITLEMENT_IDS.map(productId =>
    createEntitlementRecord({
      organizationId,
      productId,
      status: entitledIds.has(productId) ? 'ACTIVE' : 'UNKNOWN',
      source: 'INTERNAL',
    }),
  );

  return createEntitlementContext({
    organizationId,
    entitlements,
    source: 'INTERNAL',
    provider: 'local',
  });
}

export function createEntitlementContext(input: {
  organizationId: string;
  entitlements: readonly Entitlement[];
  source: EntitlementSource;
  provider: EntitlementProviderId;
}): EntitlementContext {
  const matchesFor = (productId: string) => {
    const id = normalizeProductId(productId);
    return input.entitlements.filter(
      entitlement => normalizeProductId(entitlement.productId) === id,
    );
  };

  return {
    organizationId: input.organizationId,
    entitlements: input.entitlements,
    source: input.source,
    provider: input.provider,
    isEntitled(productId: string) {
      return matchesFor(productId).some(entitlement =>
        isActiveEntitlement(entitlement),
      );
    },
    getEntitlement(productId: string) {
      const matches = matchesFor(productId);
      return (
        matches.find(entitlement => isActiveEntitlement(entitlement)) ??
        matches[0]
      );
    },
    listAvailableCapabilities() {
      return input.entitlements
        .filter(entitlement => isActiveEntitlement(entitlement))
        .map(entitlement => entitlement.productId);
    },
  };
}

export function isMvpCapabilityEntitled(
  context: EntitlementContext,
  id: string,
): boolean {
  return context.isEntitled(id);
}

export interface EntitlementProvider {
  readonly id: EntitlementProviderId;
  getEntitlements(organizationId: string): Promise<readonly Entitlement[]>;
  getEntitlement(
    organizationId: string,
    productId: string,
  ): Promise<Entitlement | undefined>;
}

export interface UsageMeteringRecord {
  organizationId: string;
  dimension: string;
  quantity: number;
  occurredAt: string;
}

export interface UsageMeteringProvider {
  readonly id: string;
  reportUsage(record: UsageMeteringRecord): Promise<{ accepted: false; reason: string }>;
}

export const USAGE_METERING_DIMENSIONS = [
  'developers',
  'data-products',
  'golden-paths',
  'platform-instances',
  'usage-units',
] as const;

export type UsageMeteringDimension = (typeof USAGE_METERING_DIMENSIONS)[number];

export function createNoopUsageMeteringProvider(): UsageMeteringProvider {
  return {
    id: 'noop',
    async reportUsage() {
      return {
        accepted: false,
        reason: 'Usage metering is a future boundary. No records are sent.',
      };
    },
  };
}

export interface MarketplaceCustomerLink {
  organizationId: string;
  customerAwsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
}

export interface SaasRegistrationRequest {
  registrationToken: string;
}

export interface SaasRegistrationResult {
  enabled: false;
  status: 'NOT_IMPLEMENTED';
  message: string;
}

export function rejectSaasRegistration(): SaasRegistrationResult {
  return {
    enabled: false,
    status: 'NOT_IMPLEMENTED',
    message:
      'SaaS tenant creation is not enabled. Registration is an architectural boundary only.',
  };
}

export const DISTRIBUTION_DESTINATIONS = [
  'CUSTOMER_GITHUB',
  'CUSTOMER_AWS',
  'CUSTOMER_PIPELINE',
] as const;

export type DistributionDestination = (typeof DISTRIBUTION_DESTINATIONS)[number];

export interface CommercialDistributionRequest {
  organizationId: string;
  productId: string;
  destination: DistributionDestination;
}

export interface CommercialDistributionResult {
  allowed: boolean;
  productId: string;
  releaseTemplate?: string;
  releaseVersion?: string;
  releaseStatus?: string;
  reason: string;
}

export const ENTITLEMENT_AUDIT_EVENTS = [
  'ENTITLEMENT_RESOLVED',
  'ENTITLEMENT_CHANGED',
  'ENTITLEMENT_LOOKUP',
  'ENTITLEMENT_EXPIRED',
  'ACCESS_GRANTED',
  'ACCESS_DENIED',
  'MARKETPLACE_REGISTRATION_ATTEMPT',
  'MARKETPLACE_CUSTOMER_RESOLVED',
  'MARKETPLACE_CUSTOMER_LINKED',
  'COMMERCIAL_PRODUCT_MAPPED',
  'marketplace.registration.received',
  'marketplace.customer.resolved',
  'marketplace.organization.pending',
  'marketplace.organization.linked',
  'marketplace.organization.conflict',
  'marketplace.entitlement.active',
  'marketplace.entitlement.denied',
  'marketplace.create.allowed',
  'marketplace.create.denied',
] as const;

export type EntitlementAuditEventType = (typeof ENTITLEMENT_AUDIT_EVENTS)[number];

export interface EntitlementAuditAuthorizationContext {
  reason?: string;
  templateId?: string;
  role?: string;
  handoff?: string;
  permission?: string;
  rbacAllowed?: boolean;
  entitled?: boolean;
  releaseEligible?: boolean;
  legalDistributionStatus?: string;
}

export interface EntitlementAuditEvent {
  type: EntitlementAuditEventType;
  at: string;
  actor: string;
  organizationId: string;
  productId?: string;
  detail?: string;
  action?: string;
  decision?: 'GRANT' | 'DENY';
  authorizationContext?: EntitlementAuditAuthorizationContext;
}

export function createEntitlementAuditEvent(
  input: Omit<EntitlementAuditEvent, 'at'> & { at?: string },
): EntitlementAuditEvent {
  return {
    ...input,
    at: input.at ?? new Date().toISOString(),
  };
}
