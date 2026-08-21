import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type {
  CommercialProduct,
  CreateAuthorization,
  Entitlement,
} from '@internal/platform-common';

export interface EntitlementSnapshot {
  organizationId: string;
  edition: string;
  provider: string;
  source: string;
  entitlements: Entitlement[];
  capabilities: string[];
}

export interface EntitledProduct extends CommercialProduct {
  entitled: boolean;
  accessState?: 'ENTITLED' | 'NOT_ENTITLED' | 'PENDING_ACCESS';
  entitlement?: Entitlement;
}

export interface MyProductsSnapshot {
  organizationId: string;
  edition: string;
  legalDistributionStatus?: string;
  products: EntitledProduct[];
}

export interface MarketplaceIntegrationStatus {
  provider: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  environment?: string;
  failClosed?: boolean;
  legalDistributionStatus?: string;
  registrationEndpoint?: string;
  organizationLinkCount?: number;
  lastResolveCustomerCategory?: string;
  region?: string;
  productCode?: string;
  lastEntitlementLookup?: string;
  lastSuccessfulLookup?: string;
  lastFailedLookup?: string;
  errorCategory?: string;
  mappings: Array<{
    productId: string;
    catalogRef?: string;
    availability: string;
  }>;
}

export interface MarketplaceLinkView {
  id: string;
  organizationId?: string;
  awsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

export interface EntitlementApi {
  getEntitlements(): Promise<EntitlementSnapshot>;
  getProducts(): Promise<MyProductsSnapshot>;
  authorizeCreate(templateId: string): Promise<CreateAuthorization>;
  getAdminEntitlements(): Promise<EntitlementSnapshot & { audit?: unknown[] }>;
  getIntegration(): Promise<MarketplaceIntegrationStatus>;
  getMarketplaceLinks(): Promise<{ organizationId: string; links: MarketplaceLinkView[] }>;
  approveMarketplaceLink(
    id: string,
    organizationId?: string,
  ): Promise<{ link: MarketplaceLinkView }>;
  disableMarketplaceLink(id: string): Promise<{ link: MarketplaceLinkView }>;
}

export const entitlementApiRef = createApiRef<EntitlementApi>({
  id: 'plugin.entitlements',
});

export class EntitlementClient implements EntitlementApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    },
  ) {}

  private async baseUrl() {
    return this.options.discoveryApi.getBaseUrl('entitlements');
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}${path}`,
    );
    if (!response.ok) {
      throw new Error(`Entitlements request failed (${response.status})`);
    }
    return response.json();
  }

  getEntitlements() {
    return this.getJson<EntitlementSnapshot>('/entitlements');
  }

  getProducts() {
    return this.getJson<MyProductsSnapshot>('/products');
  }

  async authorizeCreate(templateId: string): Promise<CreateAuthorization> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/authorize-create`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      },
    );
    const body = (await response.json()) as CreateAuthorization;
    if (!response.ok && !body.reason) {
      throw new Error('Entitlement authorization failed');
    }
    return body;
  }

  getAdminEntitlements() {
    return this.getJson<EntitlementSnapshot & { audit?: unknown[] }>(
      '/admin/entitlements',
    );
  }

  getIntegration() {
    return this.getJson<MarketplaceIntegrationStatus>('/integration');
  }

  getMarketplaceLinks() {
    return this.getJson<{ organizationId: string; links: MarketplaceLinkView[] }>(
      '/admin/marketplace-links',
    );
  }

  async approveMarketplaceLink(id: string, organizationId?: string) {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/admin/marketplace-links/${id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      },
    );
    if (!response.ok) {
      throw new Error(`Approve link failed (${response.status})`);
    }
    return response.json() as Promise<{ link: MarketplaceLinkView }>;
  }

  async disableMarketplaceLink(id: string) {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/admin/marketplace-links/${id}/disable`,
      { method: 'POST' },
    );
    if (!response.ok) {
      throw new Error(`Disable link failed (${response.status})`);
    }
    return response.json() as Promise<{ link: MarketplaceLinkView }>;
  }
}
