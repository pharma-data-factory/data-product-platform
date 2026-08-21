/**
 * AWS Marketplace adapter.
 *
 * Verified against current AWS Marketplace documentation (2026):
 *
 * SaaS contract products:
 * - ResolveCustomer (AWS Marketplace Metering Service) exchanges
 *   x-amzn-marketplace-token for CustomerAWSAccountId, LicenseArn, ProductCode.
 *   For new integrations CustomerIdentifier is not populated; it is deprecated.
 * - GetEntitlements (AWS Marketplace Entitlement Service) resolves contract
 *   dimensions. Filter keys: CUSTOMER_AWS_ACCOUNT_ID, LICENSE_ARN, DIMENSION.
 *   Concurrent agreements (required for new SaaS products from 2026-06-01)
 *   are represented as separate entitlements keyed by LicenseArn.
 * - Subscription change events: Amazon EventBridge (SNS remaining for
 *   existing listings). This adapter does not subscribe yet.
 *
 * SaaS usage products:
 * - BatchMeterUsage reports usage. Metering is a separate boundary; this
 *   adapter never sends metering records.
 *
 * Container / self-hosted products:
 * - RegisterUsage / MeterUsage run in the customer AWS account at container
 *   start. They are not Control Plane entitlement APIs.
 * - Contract-priced containers may use AWS License Manager.
 * - AWS Marketplace does not deliver a ZIP of Golden Path templates.
 *
 * Seller Catalog API and Agreements API manage listings and private offers.
 * They are not used in this foundation and must not be called automatically.
 *
 * Fail-closed: AWS mode never falls back to INTERNAL / local entitlements.
 */

import {
  GetEntitlementsCommand,
  MarketplaceEntitlementServiceClient,
} from '@aws-sdk/client-marketplace-entitlement-service';
import {
  MarketplaceMeteringClient,
  ResolveCustomerCommand,
} from '@aws-sdk/client-marketplace-metering';
import {
  createEntitlementRecord,
  findCommercialProduct,
  loadCommercialProductCatalog,
  type Entitlement,
  type EntitlementProvider,
  type EntitlementStatus,
} from '@internal/platform-common';
import {
  linkHasIdentity,
  resolveMarketplaceOrganization,
  type MarketplaceOrganizationLink,
} from './organizationMapping';

export type AwsMarketplaceIntegrationStatus =
  | 'CONNECTED'
  | 'NOT_CONFIGURED'
  | 'ERROR';

export type AwsErrorCategory =
  | 'NONE'
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'CREDENTIALS'
  | 'GET_ENTITLEMENTS'
  | 'RESOLVE_CUSTOMER'
  | 'INVALID_TOKEN'
  | 'UNKNOWN_PRODUCT'
  | 'UNKNOWN_ORGANIZATION'
  | 'EXPIRED'
  | 'UNAVAILABLE'
  | 'MIXED_CONFIGURATION';

export interface AwsGetEntitlementsInput {
  productCode: string;
  customerAwsAccountId?: string;
  licenseArn?: string;
}

export interface AwsEntitlementValue {
  dimension?: string;
  expirationDate?: Date;
  customerAwsAccountId?: string;
  licenseArn?: string;
  integerValue?: number;
  booleanValue?: boolean;
  stringValue?: string;
}

export interface AwsMarketplaceClients {
  getEntitlements(input: AwsGetEntitlementsInput): Promise<AwsEntitlementValue[]>;
  resolveCustomer(registrationToken: string): Promise<{
    customerAwsAccountId?: string;
    productCode?: string;
    licenseArn?: string;
  }>;
}

export function awsMarketplaceConfigured(config: {
  awsRegion?: string;
  awsProductCode?: string;
}): boolean {
  return Boolean(config.awsRegion?.trim() && config.awsProductCode?.trim());
}

export function createOfficialAwsClients(region: string): AwsMarketplaceClients {
  const entitlement = new MarketplaceEntitlementServiceClient({ region });
  const metering = new MarketplaceMeteringClient({ region });

  return {
    async getEntitlements(input) {
      const filter: Record<string, string[]> = {};
      if (input.customerAwsAccountId) {
        filter.CUSTOMER_AWS_ACCOUNT_ID = [input.customerAwsAccountId];
      }
      if (input.licenseArn) {
        filter.LICENSE_ARN = [input.licenseArn];
      }
      const response = await entitlement.send(
        new GetEntitlementsCommand({
          ProductCode: input.productCode,
          Filter:
            Object.keys(filter).length > 0
              ? (filter as Record<
                  | 'CUSTOMER_IDENTIFIER'
                  | 'DIMENSION'
                  | 'CUSTOMER_AWS_ACCOUNT_ID'
                  | 'LICENSE_ARN',
                  string[]
                >)
              : undefined,
        }),
      );
      return (response.Entitlements ?? []).map(item => ({
        dimension: item.Dimension,
        expirationDate: item.ExpirationDate,
        customerAwsAccountId: item.CustomerAWSAccountId,
        licenseArn: item.LicenseArn,
        integerValue: item.Value?.IntegerValue,
        booleanValue: item.Value?.BooleanValue,
        stringValue: item.Value?.StringValue,
      }));
    },
    async resolveCustomer(registrationToken) {
      const response = await metering.send(
        new ResolveCustomerCommand({ RegistrationToken: registrationToken }),
      );
      return {
        customerAwsAccountId: response.CustomerAWSAccountId,
        productCode: response.ProductCode,
        licenseArn: response.LicenseArn,
      };
    },
  };
}

export class FailClosedEntitlementProvider implements EntitlementProvider {
  readonly id = 'aws' as const;

  constructor(private readonly reason: AwsErrorCategory) {}

  async getEntitlements(): Promise<readonly Entitlement[]> {
    return [];
  }

  async getEntitlement() {
    return undefined;
  }

  errorCategory(): AwsErrorCategory {
    return this.reason;
  }
}

export class AwsMarketplaceEntitlementProvider implements EntitlementProvider {
  readonly id = 'aws' as const;
  lastError?: string;
  lastSuccessfulLookup?: string;
  lastFailedLookup?: string;
  errorCategory: AwsErrorCategory = 'NONE';

  constructor(
    private readonly options: {
      organizationId: string;
      region: string;
      productCode: string;
      clients?: AwsMarketplaceClients;
      customerAwsAccountId?: string;
      licenseArn?: string;
      organizationLinks?: readonly MarketplaceOrganizationLink[];
      linkSource?: () => readonly MarketplaceOrganizationLink[];
    },
  ) {}

  private clients(): AwsMarketplaceClients {
    return (
      this.options.clients ?? createOfficialAwsClients(this.options.region)
    );
  }

  private linksFor(organizationId: string): MarketplaceOrganizationLink[] {
    const live = this.options.linkSource?.() ?? [];
    const configured = this.options.organizationLinks ?? [];
    const combined = [...live, ...configured].filter(
      link =>
        (!link.organizationId || link.organizationId === organizationId) &&
        linkHasIdentity(link),
    );
    if (combined.length > 0) {
      return combined;
    }
    if (
      organizationId === this.options.organizationId &&
      (this.options.customerAwsAccountId || this.options.licenseArn)
    ) {
      return [
        {
          organizationId,
          customerAwsAccountId: this.options.customerAwsAccountId,
          licenseArn: this.options.licenseArn,
          productCode: this.options.productCode,
        },
      ];
    }
    return [];
  }

  async getEntitlements(organizationId: string): Promise<readonly Entitlement[]> {
    const links = this.linksFor(organizationId);
    if (links.length === 0) {
      this.errorCategory = 'UNKNOWN_ORGANIZATION';
      this.lastFailedLookup = new Date().toISOString();
      this.lastError = 'Unknown organization: no verified Marketplace mapping';
      return [];
    }

    try {
      const collected: Entitlement[] = [];
      for (const link of links) {
        const values = await this.clients().getEntitlements({
          productCode: this.options.productCode,
          customerAwsAccountId: link.customerAwsAccountId,
          licenseArn: link.licenseArn,
        });
        collected.push(
          ...values.map(value =>
            mapAwsEntitlement(organizationId, this.options.productCode, value),
          ),
        );
      }
      this.lastSuccessfulLookup = new Date().toISOString();
      this.lastError = undefined;
      this.errorCategory = 'NONE';
      return collected;
    } catch (error) {
      this.errorCategory = classifyAwsError(error, 'getEntitlements');
      this.lastFailedLookup = new Date().toISOString();
      this.lastError = sanitizeAwsErrorMessage(
        error instanceof Error ? error.message : 'AWS API failure',
      );
      return [];
    }
  }

  async getEntitlement(organizationId: string, productId: string) {
    const entitlements = await this.getEntitlements(organizationId);
    return (
      entitlements.find(item => item.productId === productId && item.status === 'ACTIVE') ??
      entitlements.find(item => item.productId === productId)
    );
  }

  async resolveRegistrationToken(registrationToken: string) {
    try {
      return await this.clients().resolveCustomer(registrationToken);
    } catch (error) {
      this.errorCategory = classifyAwsError(error, 'resolveCustomer');
      this.lastFailedLookup = new Date().toISOString();
      this.lastError = sanitizeAwsErrorMessage(
        error instanceof Error ? error.message : 'ResolveCustomer failure',
      );
      throw error;
    }
  }
}

export function mapAwsEntitlement(
  organizationId: string,
  productCode: string,
  value: AwsEntitlementValue,
): Entitlement {
  const product =
    findCommercialProduct(value.dimension ?? '') ??
    loadCommercialProductCatalog().products.find(
      item => item.productId === value.dimension,
    );
  const productId = product?.productId ?? value.dimension ?? productCode;
  const status = deriveAwsEntitlementStatus(productId, value);
  return createEntitlementRecord({
    organizationId,
    productId,
    productType: product?.productType,
    source: 'AWS_MARKETPLACE',
    status,
    validUntil: value.expirationDate?.toISOString(),
    externalReference: value.licenseArn,
    dimensions: {
      ...(value.integerValue !== undefined
        ? { quantity: value.integerValue }
        : {}),
      ...(value.booleanValue !== undefined
        ? { entitled: value.booleanValue }
        : {}),
    },
    metadata: {
      productCode,
      ...(value.customerAwsAccountId
        ? { customerAwsAccountId: redactAccount(value.customerAwsAccountId) }
        : {}),
    },
  });
}

export function deriveAwsEntitlementStatus(
  productId: string,
  value: AwsEntitlementValue,
  now = new Date(),
): EntitlementStatus {
  const known = Boolean(
    findCommercialProduct(productId) ??
      loadCommercialProductCatalog().products.find(
        item => item.productId === productId,
      ),
  );
  if (!known) {
    return 'UNKNOWN';
  }
  if (value.expirationDate && value.expirationDate.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }
  if (value.booleanValue === false) {
    return 'SUSPENDED';
  }
  if (value.integerValue === 0 && value.booleanValue !== true) {
    return 'SUSPENDED';
  }
  if (value.stringValue && /pending/i.test(value.stringValue)) {
    return 'PENDING';
  }
  return 'ACTIVE';
}

export function classifyAwsError(
  error: unknown,
  operation: 'getEntitlements' | 'resolveCustomer' = 'getEntitlements',
): AwsErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';
  if (/InvalidRegistrationToken|InvalidToken/i.test(message + name)) {
    return 'INVALID_TOKEN';
  }
  if (
    /timeout|ETIMEDOUT|TimeoutError|RequestTimeout/i.test(message + name)
  ) {
    return 'TIMEOUT';
  }
  if (
    /credential|AccessDenied|UnrecognizedClient|ExpiredToken|Could not load credentials|CredentialsProviderError/i.test(
      message + name,
    )
  ) {
    return 'CREDENTIALS';
  }
  if (
    /unavailable|ECONNREFUSED|ENOTFOUND|NetworkingError|UnknownEndpoint/i.test(
      message + name,
    )
  ) {
    return 'UNAVAILABLE';
  }
  return operation === 'resolveCustomer' ? 'RESOLVE_CUSTOMER' : 'GET_ENTITLEMENTS';
}

export function sanitizeAwsErrorMessage(message: string): string {
  return message
    .replace(/x-amzn-marketplace-token[=:\s]+\S+/gi, 'token=[redacted-marketplace-token]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[redacted-access-key]')
    .replace(/(secret|token|password)[=:]\s*\S+/gi, '$1=[redacted]');
}

export function redactAccount(accountId: string): string {
  if (accountId.length < 4) {
    return '****';
  }
  return `****${accountId.slice(-4)}`;
}

export function redactRegistrationToken(token: string): string {
  if (!token) {
    return '';
  }
  return '[redacted-marketplace-token]';
}

export { resolveMarketplaceOrganization };
export type { MarketplaceOrganizationLink };
