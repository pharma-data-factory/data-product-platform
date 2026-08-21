import { canCreateDataProduct } from './policy';
import {
  commercialProductForTemplate,
  isCommerciallyOffered,
  loadCommercialProductCatalog,
  normalizeProductId,
  type CommercialProductCatalog,
} from './commercial-products';
import {
  createDefaultEntitlementContext,
  createEntitlementAuditEvent,
  createEntitlementContext,
  deriveEntitlementStatus,
  isActiveEntitlement,
  rejectSaasRegistration,
  type Entitlement,
  type EntitlementAuditEvent,
  type EntitlementContext,
  type EntitlementProvider,
  type EntitlementSource,
  type SaasRegistrationRequest,
  type SaasRegistrationResult,
  type CommercialDistributionResult,
} from './entitlements';
import { DEFAULT_ORGANIZATION_ID } from './organization';
import {
  canCreateOfficialGoldenPath,
  currentRelease,
  isGenerallyAvailableRelease,
  type GoldenPathRelease,
} from './releases';
import type { PlatformRole } from './roles';
import type { LegalDistributionStatus } from './commercial';

export interface CreateAuthorization {
  allowed: boolean;
  rbacAllowed: boolean;
  entitled: boolean;
  releaseEligible: boolean;
  productId?: string;
  reason: 'OK' | 'RBAC' | 'ENTITLEMENT' | 'RELEASE' | 'LEGAL';
  message: string;
  handoff?: 'internal' | 'customer';
  legalDistributionStatus?: LegalDistributionStatus;
}

export interface EntitlementService {
  getEntitlements(organizationId: string): Promise<EntitlementContext>;
  hasEntitlement(organizationId: string, productId: string): Promise<boolean>;
  getEntitlement(
    organizationId: string,
    productId: string,
  ): Promise<Entitlement | undefined>;
  listAvailableCapabilities(organizationId: string): Promise<readonly string[]>;
  authorizeCreate(input: {
    organizationId: string;
    templateId: string;
    role: PlatformRole;
    actor: string;
    handoff?: 'internal' | 'customer';
  }): Promise<CreateAuthorization>;
  resolveDistribution(
    organizationId: string,
    productId: string,
    handoff?: 'internal' | 'customer',
  ): Promise<CommercialDistributionResult>;
  registerSaasCustomer(request: SaasRegistrationRequest): SaasRegistrationResult;
  auditTrail(): readonly EntitlementAuditEvent[];
}

export interface LocalEntitlementConfig {
  productIds?: readonly string[];
  records?: readonly Entitlement[];
}

export class LocalEntitlementProvider implements EntitlementProvider {
  readonly id = 'local' as const;

  constructor(private readonly config: LocalEntitlementConfig = {}) {}

  async getEntitlements(organizationId: string): Promise<readonly Entitlement[]> {
    if (this.config.records) {
      return this.config.records.filter(
        record =>
          record.organizationId === organizationId ||
          record.organizationId === 'default',
      );
    }
    return createDefaultEntitlementContext(
      this.config.productIds,
      organizationId,
    ).entitlements;
  }

  async getEntitlement(organizationId: string, productId: string) {
    const entitlements = await this.getEntitlements(organizationId);
    return entitlements.find(
      entitlement =>
        normalizeProductId(entitlement.productId) ===
        normalizeProductId(productId),
    );
  }
}

export interface PlatformEntitlementServiceOptions {
  provider: EntitlementProvider;
  source?: EntitlementSource;
  catalog?: CommercialProductCatalog;
  organizationId?: string;
  releases?: readonly GoldenPathRelease[];
  legalDistributionStatus?: LegalDistributionStatus;
}

export class PlatformEntitlementService implements EntitlementService {
  private readonly events: EntitlementAuditEvent[] = [];
  private readonly catalog: CommercialProductCatalog;
  private readonly source: EntitlementSource;

  constructor(private readonly options: PlatformEntitlementServiceOptions) {
    this.catalog = options.catalog ?? loadCommercialProductCatalog();
    this.source = options.source ?? (options.provider.id === 'aws' ? 'AWS_MARKETPLACE' : 'INTERNAL');
  }

  async getEntitlements(organizationId: string): Promise<EntitlementContext> {
    const entitlements = await this.options.provider.getEntitlements(
      organizationId,
    );
    const context = createEntitlementContext({
      organizationId,
      entitlements,
      source: this.source,
      provider: this.options.provider.id,
    });
    this.record('ENTITLEMENT_LOOKUP', organizationId, 'system', undefined, `${entitlements.length} entitlements`);
    this.record('ENTITLEMENT_RESOLVED', organizationId, 'system', undefined, `${entitlements.length} entitlements`);
    return context;
  }

  async hasEntitlement(organizationId: string, productId: string): Promise<boolean> {
    const entitlement = await this.getEntitlement(organizationId, productId);
    return isActiveEntitlement(entitlement);
  }

  async getEntitlement(organizationId: string, productId: string) {
    const found = await this.options.provider.getEntitlement(
      organizationId,
      productId,
    );
    return found;
  }

  async listAvailableCapabilities(organizationId: string) {
    const context = await this.getEntitlements(organizationId);
    return context.listAvailableCapabilities();
  }

  async authorizeCreate(input: {
    organizationId: string;
    templateId: string;
    role: PlatformRole;
    actor: string;
    handoff?: 'internal' | 'customer';
  }): Promise<CreateAuthorization> {
    const rbacAllowed = canCreateDataProduct(input.role);
    const product = commercialProductForTemplate(input.templateId, this.catalog);
    const productId = product?.productId;
    const requiresEntitlement = Boolean(product && isCommerciallyOffered(product));
    const releaseEligible = commercialCreateReleaseEligible(
      input.templateId,
      input.role,
      requiresEntitlement,
      this.options.releases,
    );
    let entitled = true;
    if (productId && requiresEntitlement) {
      entitled = await this.hasEntitlement(input.organizationId, productId);
    }

    const result: CreateAuthorization = {
      rbacAllowed,
      entitled,
      releaseEligible,
      productId,
      allowed: false,
      reason: 'OK',
      message: '',
      handoff: input.handoff ?? 'internal',
      legalDistributionStatus:
        this.options.legalDistributionStatus ?? 'BLOCKED',
    };

    if (!rbacAllowed) {
      result.reason = 'RBAC';
      result.message =
        'Your role can browse this Golden Path but cannot create Data Products.';
      this.record('ACCESS_DENIED', input.organizationId, input.actor, productId, 'RBAC');
      this.record(
        'marketplace.create.denied',
        input.organizationId,
        input.actor,
        productId,
        'RBAC',
      );
      return result;
    }
    if (!releaseEligible) {
      result.reason = 'RELEASE';
      result.message =
        'Create uses an approved RELEASED Golden Path version. Retired and unreleased versions are not offered to commercial customers.';
      this.record('ACCESS_DENIED', input.organizationId, input.actor, productId, 'RELEASE');
      this.record(
        'marketplace.create.denied',
        input.organizationId,
        input.actor,
        productId,
        'RELEASE',
      );
      return result;
    }
    if (requiresEntitlement && !entitled) {
      result.reason = 'ENTITLEMENT';
      result.message = 'This commercial capability is unavailable for your organization.';
      const entitlement = productId
        ? await this.getEntitlement(input.organizationId, productId)
        : undefined;
      if (entitlement && deriveEntitlementStatus(entitlement) === 'EXPIRED') {
        this.record(
          'ENTITLEMENT_EXPIRED',
          input.organizationId,
          input.actor,
          productId,
          'EXPIRED',
        );
      }
      this.record('ACCESS_DENIED', input.organizationId, input.actor, productId, 'ENTITLEMENT');
      this.record(
        'marketplace.create.denied',
        input.organizationId,
        input.actor,
        productId,
        'ENTITLEMENT',
      );
      return result;
    }
    if (
      (input.handoff ?? 'internal') === 'customer' &&
      (this.options.legalDistributionStatus ?? 'BLOCKED') !== 'APPROVED'
    ) {
      result.reason = 'LEGAL';
      result.message =
        'LEGAL DISTRIBUTION STATUS: BLOCKED. Internal generation remains available. Customer artifact handoff is not approved.';
      this.record('ACCESS_DENIED', input.organizationId, input.actor, productId, 'LEGAL');
      this.record(
        'marketplace.create.denied',
        input.organizationId,
        input.actor,
        productId,
        'LEGAL',
      );
      return result;
    }

    result.allowed = true;
    result.message = 'Create is allowed.';
    this.record('ACCESS_GRANTED', input.organizationId, input.actor, productId, input.templateId);
    this.record(
      'marketplace.create.allowed',
      input.organizationId,
      input.actor,
      productId,
      input.templateId,
    );
    return result;
  }

  async resolveDistribution(
    organizationId: string,
    productId: string,
    handoff: 'internal' | 'customer' = 'internal',
  ): Promise<CommercialDistributionResult> {
    if (
      handoff === 'customer' &&
      (this.options.legalDistributionStatus ?? 'BLOCKED') !== 'APPROVED'
    ) {
      return {
        allowed: false,
        productId,
        reason: 'LEGAL DISTRIBUTION STATUS: BLOCKED',
      };
    }
    const product = this.catalog.products.find(item => item.productId === productId);
    if (!product) {
      return {
        allowed: false,
        productId,
        reason: 'Unknown commercial product',
      };
    }
    const entitled = await this.hasEntitlement(organizationId, productId);
    if (!entitled) {
      return {
        allowed: false,
        productId,
        reason: 'Organization is not entitled to this product',
      };
    }
    if (!product.templateId) {
      return {
        allowed: false,
        productId,
        reason:
          'Platform Edition packaging is planned. No customer deployment artifact is distributed yet.',
      };
    }
    const release = currentRelease(product.templateId);
    if (!isGenerallyAvailableRelease(release)) {
      return {
        allowed: false,
        productId,
        releaseTemplate: product.templateId,
        releaseStatus: release?.status,
        reason: 'Commercial customers receive RELEASED artifacts only',
      };
    }
    this.record(
      'COMMERCIAL_PRODUCT_MAPPED',
      organizationId,
      'system',
      productId,
      `${product.templateId}@${release?.version}`,
    );
    return {
      allowed: true,
      productId,
      releaseTemplate: product.templateId,
      releaseVersion: release?.version,
      releaseStatus: release?.status,
      reason:
        'Entitlement maps to the current RELEASED Golden Path. Destination is customer GitHub, customer AWS, or the customer pipeline — not an AWS Marketplace ZIP.',
    };
  }

  registerSaasCustomer(request: SaasRegistrationRequest): SaasRegistrationResult {
    void request.registrationToken;
    this.record(
      'MARKETPLACE_REGISTRATION_ATTEMPT',
      this.options.organizationId ?? DEFAULT_ORGANIZATION_ID,
      'anonymous',
      undefined,
      'SaaS provisioning is not enabled',
    );
    return rejectSaasRegistration();
  }

  auditTrail(): readonly EntitlementAuditEvent[] {
    return [...this.events];
  }

  recordEvent(
    type: EntitlementAuditEvent['type'],
    organizationId: string,
    actor: string,
    productId?: string,
    detail?: string,
  ) {
    this.record(type, organizationId, actor, productId, detail);
  }

  private record(
    type: EntitlementAuditEvent['type'],
    organizationId: string,
    actor: string,
    productId?: string,
    detail?: string,
  ) {
    this.events.push(
      createEntitlementAuditEvent({
        type,
        actor,
        organizationId,
        productId,
        detail,
      }),
    );
    if (this.events.length > 200) {
      this.events.shift();
    }
  }
}

export function commercialReleaseEligible(templateId: string): boolean {
  return isGenerallyAvailableRelease(currentRelease(templateId));
}

function commercialCreateReleaseEligible(
  templateId: string,
  role: PlatformRole,
  requiresEntitlement: boolean,
  releases?: readonly GoldenPathRelease[],
): boolean {
  if (requiresEntitlement) {
    const release = releases
      ? currentRelease(templateId, releases)
      : currentRelease(templateId);
    return isGenerallyAvailableRelease(release);
  }
  if (releases) {
    return canCreateOfficialGoldenPath(role, templateId, releases);
  }
  return canCreateOfficialGoldenPath(role, templateId);
}

export function defaultEntitlementService(
  productIds?: readonly string[],
  organizationId = DEFAULT_ORGANIZATION_ID,
): PlatformEntitlementService {
  return new PlatformEntitlementService({
    provider: new LocalEntitlementProvider({ productIds }),
    organizationId,
  });
}
