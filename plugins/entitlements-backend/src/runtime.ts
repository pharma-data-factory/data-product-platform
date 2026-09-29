import { Config } from '@backstage/config';
import {
  COMMERCIAL_ENVIRONMENTS,
  DEFAULT_ORGANIZATION_ID,
  LOCAL_DEFAULT_PRODUCT_IDS,
  LocalEntitlementProvider,
  PlatformEntitlementService,
  createNoopUsageMeteringProvider,
  loadCommercialProductCatalog,
  parseLegalDistributionStatus,
  resolveOrganizationId,
  type CommercialEnvironment,
  type EntitlementProvider,
  type EntitlementProviderId,
  type EntitlementService,
  type LegalDistributionStatus,
  type UsageMeteringProvider,
} from '@internal/platform-common';
import {
  AwsMarketplaceEntitlementProvider,
  FailClosedEntitlementProvider,
  awsMarketplaceConfigured,
  createOfficialAwsClients,
  type AwsErrorCategory,
  type AwsMarketplaceClients,
  type AwsMarketplaceIntegrationStatus,
  type MarketplaceOrganizationLink,
} from './awsMarketplace';
import { MarketplaceLinkStore, toIdentityLink } from './linkStore';
import { linkHasIdentity } from './organizationMapping';
import { MarketplaceRegistrationService } from './registration';
import { SlidingWindowRateLimiter } from './rateLimit';

export interface CommercialRuntimeConfig {
  organizationId: string;
  edition: string;
  environment: CommercialEnvironment;
  entitlementProvider: EntitlementProviderId;
  failClosed: boolean;
  legalDistributionStatus: LegalDistributionStatus;
  localProductIds: readonly string[];
  awsRegion?: string;
  awsProductCode?: string;
  organizationLinks: readonly MarketplaceOrganizationLink[];
  linkStorePath?: string;
  createAuthorizationAuditPath?: string;
}

export interface EntitlementDiagnostics {
  provider: string;
  status: AwsMarketplaceIntegrationStatus;
  environment: CommercialEnvironment;
  failClosed: boolean;
  legalDistributionStatus: LegalDistributionStatus;
  registrationEndpoint: string;
  organizationLinkCount: number;
  lastResolveCustomerCategory?: AwsErrorCategory;
  region?: string;
  productCode?: string;
  lastSuccessfulLookup?: string;
  lastFailedLookup?: string;
  errorCategory: AwsErrorCategory;
  mappings: Array<{
    productId: string;
    catalogRef?: string;
    availability: string;
  }>;
}

export interface EntitlementRuntime {
  config: CommercialRuntimeConfig;
  service: PlatformEntitlementService;
  metering: UsageMeteringProvider;
  awsStatus: AwsMarketplaceIntegrationStatus;
  failClosed: boolean;
  linkStore: MarketplaceLinkStore;
  registration: MarketplaceRegistrationService;
  rateLimiter: SlidingWindowRateLimiter;
  diagnostics(): EntitlementDiagnostics;
}

export function loadCommercialConfig(config: Config): CommercialRuntimeConfig {
  const commercial = config.getOptionalConfig('commercial');
  const organizationId = resolveOrganizationId(
    commercial?.getOptionalString('organizationId'),
  );
  const environmentRaw = commercial?.getOptionalString('environment');
  const environment: CommercialEnvironment =
    environmentRaw &&
    (COMMERCIAL_ENVIRONMENTS as readonly string[]).includes(environmentRaw)
      ? (environmentRaw as CommercialEnvironment)
      : 'local';

  let provider: EntitlementProviderId =
    commercial?.getOptionalString('entitlementProvider') === 'aws'
      ? 'aws'
      : 'local';
  if (environment === 'test-marketplace') {
    provider = 'aws';
  }

  const localMap = commercial?.getOptionalConfig('localEntitlements');
  const localProductIds =
    localMap?.getOptionalStringArray(organizationId) ??
    localMap?.getOptionalStringArray('internal') ??
    localMap?.getOptionalStringArray('default') ??
    LOCAL_DEFAULT_PRODUCT_IDS;

  const awsProductCode = commercial?.getOptionalString(
    'awsMarketplace.productCode',
  );
  const organizationLinks = (
    commercial?.getOptionalConfigArray('awsMarketplace.organizationLinks') ?? []
  )
    .map(item => ({
      organizationId: resolveOrganizationId(
        item.getOptionalString('organizationId'),
      ),
      customerAwsAccountId: item.getOptionalString('customerAwsAccountId'),
      licenseArn: item.getOptionalString('licenseArn'),
      productCode:
        item.getOptionalString('productCode') ?? awsProductCode,
    }))
    .filter(linkHasIdentity);

  return {
    organizationId,
    edition: commercial?.getOptionalString('edition') ?? 'internal',
    environment,
    entitlementProvider: provider,
    failClosed: provider === 'aws',
    legalDistributionStatus: parseLegalDistributionStatus(
      commercial?.getOptionalString('legalDistributionStatus'),
    ),
    localProductIds,
    awsRegion: commercial?.getOptionalString('awsMarketplace.region'),
    awsProductCode,
    organizationLinks,
    linkStorePath:
      commercial?.getOptionalString('awsMarketplace.linkStorePath')?.trim() ||
      undefined,
    createAuthorizationAuditPath:
      commercial?.getOptionalString('createAuthorizationAuditPath')?.trim() ||
      undefined,
  };
}

/**
 * Refuses a live AWS Marketplace integration that has nowhere to write.
 *
 * `MarketplaceLinkStore.persist()` returns without writing when no path is
 * configured, and returns successfully — so a deployment that resolves an AWS
 * customer, records the link and answers 200 loses that link on the next
 * restart, with nothing in the logs and nothing failed. The first symptom is a
 * paying customer who cannot reach the product.
 *
 * `linkStorePath` is unset in every committed `app-config`, so this is not a
 * hypothetical ordering of config keys: setting the two AWS variables was
 * enough to reach it.
 *
 * Checked against `awsMarketplaceConfigured` rather than
 * `entitlementProvider === 'aws'` on purpose — region plus product code is
 * what makes real fulfillment reachable, and registrations arrive over an
 * unauthenticated route that does not consult the provider setting.
 */
export function assertLinkStoreDurability(commercial: {
  awsRegion?: string;
  awsProductCode?: string;
  linkStorePath?: string;
}): void {
  if (!awsMarketplaceConfigured(commercial) || commercial.linkStorePath) {
    return;
  }
  throw new Error(
    'AWS Marketplace is configured (commercial.awsMarketplace.region and ' +
      '.productCode are set) but commercial.awsMarketplace.linkStorePath is ' +
      'not. Customer entitlement links would be held in process memory and ' +
      'lost on restart. Set linkStorePath to a path on durable storage.',
  );
}

export function createEntitlementRuntime(options: {
  config: Config;
  awsClients?: AwsMarketplaceClients;
  linkStore?: MarketplaceLinkStore;
  rateLimiter?: SlidingWindowRateLimiter;
}): EntitlementRuntime {
  const commercial = loadCommercialConfig(options.config);
  const localProvider = new LocalEntitlementProvider({
    productIds: commercial.localProductIds,
  });
  const awsConfigured = awsMarketplaceConfigured(commercial);
  const mixed =
    commercial.environment === 'local' &&
    commercial.entitlementProvider === 'aws';
  // Only when the runtime owns the store. An injected one is the caller's
  // choice — the tests rely on that, and so would an in-memory harness.
  if (!options.linkStore) {
    assertLinkStoreDurability(commercial);
  }
  const linkStore =
    options.linkStore ??
    new MarketplaceLinkStore(
      commercial.organizationId,
      commercial.organizationLinks,
      commercial.linkStorePath,
    );

  let provider: EntitlementProvider = localProvider;
  let awsStatus: AwsMarketplaceIntegrationStatus = 'NOT_CONFIGURED';
  let awsProvider: AwsMarketplaceEntitlementProvider | undefined;
  let failClosedProvider: FailClosedEntitlementProvider | undefined;
  let staticError: AwsErrorCategory = 'NOT_CONFIGURED';

  const liveClients =
    options.awsClients ??
    (awsConfigured && commercial.awsRegion
      ? createOfficialAwsClients(commercial.awsRegion)
      : undefined);

  if (commercial.entitlementProvider === 'aws') {
    if (mixed) {
      awsStatus = 'ERROR';
      staticError = 'MIXED_CONFIGURATION';
      failClosedProvider = new FailClosedEntitlementProvider(
        'MIXED_CONFIGURATION',
      );
      provider = failClosedProvider;
    } else if (!awsConfigured) {
      awsStatus = 'NOT_CONFIGURED';
      staticError = 'NOT_CONFIGURED';
      failClosedProvider = new FailClosedEntitlementProvider('NOT_CONFIGURED');
      provider = failClosedProvider;
    } else {
      awsProvider = new AwsMarketplaceEntitlementProvider({
        organizationId: commercial.organizationId,
        region: commercial.awsRegion!,
        productCode: commercial.awsProductCode!,
        clients: liveClients,
        organizationLinks: commercial.organizationLinks,
        linkSource: () =>
          linkStore
            .approvedForOrganization(commercial.organizationId)
            .map(toIdentityLink),
      });
      provider = awsProvider;
      awsStatus = 'CONNECTED';
      staticError = 'NONE';
    }
  }

  const service = new PlatformEntitlementService({
    provider,
    organizationId: commercial.organizationId,
    source: provider.id === 'aws' ? 'AWS_MARKETPLACE' : 'INTERNAL',
    legalDistributionStatus: commercial.legalDistributionStatus,
    createAuthorizationAuditPath: commercial.createAuthorizationAuditPath,
  });

  const registration = new MarketplaceRegistrationService({
    organizationId: commercial.organizationId,
    productCode: commercial.awsProductCode,
    clients: liveClients,
    store: linkStore,
    audit: (type, organizationId, actor, productId, detail) =>
      service.recordEvent(type, organizationId, actor, productId, detail),
  });

  return {
    config: commercial,
    service,
    metering: createNoopUsageMeteringProvider(),
    awsStatus,
    failClosed: commercial.failClosed,
    linkStore,
    registration,
    rateLimiter:
      options.rateLimiter ?? new SlidingWindowRateLimiter(20, 60_000),
    diagnostics() {
      return {
        provider:
          commercial.entitlementProvider === 'aws'
            ? 'AWS MARKETPLACE'
            : 'LOCAL',
        status: (() => {
          if (!awsProvider) {
            return awsStatus;
          }
          if (
            awsProvider.lastFailedLookup &&
            (!awsProvider.lastSuccessfulLookup ||
              awsProvider.lastFailedLookup >= awsProvider.lastSuccessfulLookup)
          ) {
            return 'ERROR';
          }
          return awsStatus;
        })(),
        environment: commercial.environment,
        failClosed: commercial.failClosed,
        legalDistributionStatus: commercial.legalDistributionStatus,
        registrationEndpoint: 'POST /api/entitlements/marketplace/register',
        organizationLinkCount: linkStore.list().length,
        lastResolveCustomerCategory: registration.lastResolveCategory,
        region: commercial.awsRegion || undefined,
        productCode: commercial.awsProductCode || undefined,
        lastSuccessfulLookup: awsProvider?.lastSuccessfulLookup,
        lastFailedLookup: awsProvider?.lastFailedLookup,
        errorCategory:
          awsProvider?.errorCategory ??
          failClosedProvider?.errorCategory() ??
          staticError,
        mappings: loadCommercialProductCatalog().products.map(product => ({
          productId: product.productId,
          catalogRef: product.catalogRef,
          availability: product.availability,
        })),
      };
    },
  };
}

export { DEFAULT_ORGANIZATION_ID };
export type { EntitlementService };
