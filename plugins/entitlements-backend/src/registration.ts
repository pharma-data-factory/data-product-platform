import { createHash, randomBytes } from 'node:crypto';
import {
  isActiveEntitlement,
  type EntitlementAuditEventType,
} from '@internal/platform-common';
import {
  classifyAwsError,
  mapAwsEntitlement,
  redactAccount,
  sanitizeAwsErrorMessage,
  type AwsErrorCategory,
  type AwsMarketplaceClients,
} from './awsMarketplace';
import type { MarketplaceLinkStore, StoredMarketplaceLink } from './linkStore';

export type MarketplaceRegistrationStatus =
  | 'PENDING_ACCESS'
  | 'NOT_ENTITLED'
  | 'ENTITLED'
  | 'DENIED'
  | 'NOT_CONFIGURED'
  | 'INVALID_TOKEN'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE';

export interface MarketplaceRegistrationResult {
  tenantCreated: false;
  accessGranted: false;
  requiresSignIn: true;
  status: MarketplaceRegistrationStatus;
  registrationId?: string;
  organizationId?: string;
  organizationLinkStatus?: string;
  entitledProductIds: readonly string[];
  message: string;
}

export interface RegistrationRecord {
  id: string;
  awsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
  portalUser?: string;
  createdAt: string;
  status: MarketplaceRegistrationStatus;
  linkId?: string;
}

type AuditFn = (
  type: EntitlementAuditEventType,
  organizationId: string,
  actor: string,
  productId?: string,
  detail?: string,
) => void;

export class MarketplaceRegistrationService {
  private readonly byHash = new Map<string, string>();
  private readonly records = new Map<string, RegistrationRecord>();
  lastResolveCategory: AwsErrorCategory = 'NONE';
  lastResolveAt?: string;

  constructor(
    private readonly options: {
      organizationId: string;
      productCode?: string;
      clients?: AwsMarketplaceClients;
      store: MarketplaceLinkStore;
      audit: AuditFn;
    },
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  get(id: string): RegistrationRecord | undefined {
    return this.records.get(id);
  }

  bindPortalUser(id: string, userEntityRef: string): RegistrationRecord | undefined {
    const record = this.records.get(id);
    if (!record) {
      return undefined;
    }
    record.portalUser = userEntityRef;
    return record;
  }

  async register(input: {
    token: string;
    actor?: string;
  }): Promise<MarketplaceRegistrationResult> {
    const actor = input.actor ?? 'anonymous';
    const denied = (
      status: MarketplaceRegistrationStatus,
      message: string,
      extra?: Partial<MarketplaceRegistrationResult>,
    ): MarketplaceRegistrationResult => ({
      tenantCreated: false,
      accessGranted: false,
      requiresSignIn: true,
      status,
      entitledProductIds: extra?.entitledProductIds ?? [],
      message,
      registrationId: extra?.registrationId,
      organizationId: extra?.organizationId,
      organizationLinkStatus: extra?.organizationLinkStatus,
    });

    this.options.audit(
      'marketplace.registration.received',
      this.options.organizationId,
      actor,
      undefined,
      'token=[redacted-marketplace-token]',
    );

    if (!this.options.clients || !this.options.productCode) {
      this.lastResolveCategory = 'NOT_CONFIGURED';
      return denied(
        'NOT_CONFIGURED',
        'AWS Marketplace registration is not configured. Local mode does not resolve customers.',
      );
    }

    const tokenHash = this.hashToken(input.token);
    const replayId = this.byHash.get(tokenHash);
    if (replayId) {
      const existing = this.records.get(replayId);
      if (existing) {
        return this.toResult(existing, 'Repeated registration token (hashed). ResolveCustomer was not called again.');
      }
    }

    let resolved: {
      customerAwsAccountId?: string;
      productCode?: string;
      licenseArn?: string;
    };
    try {
      resolved = await this.options.clients.resolveCustomer(input.token);
      this.lastResolveCategory = 'NONE';
      this.lastResolveAt = new Date().toISOString();
    } catch (error) {
      this.lastResolveCategory = classifyAwsError(error, 'resolveCustomer');
      this.lastResolveAt = new Date().toISOString();
      const category = this.lastResolveCategory;
      this.options.audit(
        'marketplace.entitlement.denied',
        this.options.organizationId,
        actor,
        undefined,
        category,
      );
      if (category === 'INVALID_TOKEN') {
        return denied('INVALID_TOKEN', 'Marketplace registration token is invalid.');
      }
      return denied(
        'UNAVAILABLE',
        sanitizeAwsErrorMessage(
          error instanceof Error ? error.message : 'ResolveCustomer failure',
        ),
      );
    }

    this.options.audit(
      'marketplace.customer.resolved',
      this.options.organizationId,
      actor,
      undefined,
      `account=${redactAccount(resolved.customerAwsAccountId ?? '')}`,
    );

    const productCode = resolved.productCode ?? this.options.productCode;
    const matches = this.options.store.findMatching({
      awsAccountId: resolved.customerAwsAccountId,
      licenseArn: resolved.licenseArn,
      productCode,
    });
    const approved = matches.filter(link => link.status === 'APPROVED');
    const conflicting = matches.filter(link => link.status === 'CONFLICT');
    const disabled = matches.filter(link => link.status === 'DISABLED');

    let link: StoredMarketplaceLink;
    if (conflicting.length > 0) {
      this.options.audit(
        'marketplace.organization.conflict',
        this.options.organizationId,
        actor,
      );
      const record = this.saveRecord({
        awsAccountId: resolved.customerAwsAccountId,
        licenseArn: resolved.licenseArn,
        productCode,
        status: 'DENIED',
        linkId: conflicting[0].id,
      });
      this.byHash.set(tokenHash, record.id);
      return denied('DENIED', 'Marketplace identity maps to a conflicting organization link.', {
        registrationId: record.id,
        organizationLinkStatus: 'CONFLICT',
      });
    }

    if (disabled.length > 0 && approved.length === 0) {
      const record = this.saveRecord({
        awsAccountId: resolved.customerAwsAccountId,
        licenseArn: resolved.licenseArn,
        productCode,
        status: 'NOT_ENTITLED',
        linkId: disabled[0].id,
      });
      this.byHash.set(tokenHash, record.id);
      this.options.audit(
        'marketplace.entitlement.denied',
        this.options.organizationId,
        actor,
        undefined,
        'DISABLED',
      );
      return denied(
        'NOT_ENTITLED',
        'Marketplace organization link is disabled.',
        {
          registrationId: record.id,
          organizationLinkStatus: 'DISABLED',
        },
      );
    }

    if (approved.length === 0) {
      link = this.options.store.recordPending({
        awsAccountId: resolved.customerAwsAccountId,
        licenseArn: resolved.licenseArn,
        productCode,
      });
      this.options.audit(
        'marketplace.organization.pending',
        this.options.organizationId,
        actor,
        undefined,
        link.id,
      );
      const record = this.saveRecord({
        awsAccountId: resolved.customerAwsAccountId,
        licenseArn: resolved.licenseArn,
        productCode,
        status: 'PENDING_ACCESS',
        linkId: link.id,
      });
      this.byHash.set(tokenHash, record.id);
      return denied(
        'PENDING_ACCESS',
        'Marketplace identity is verified. Platform Admin must approve the organization link. Sign in does not grant access by itself.',
        {
          registrationId: record.id,
          organizationLinkStatus: 'PENDING',
        },
      );
    }

    link = approved[0];
    this.options.audit(
      'marketplace.organization.linked',
      link.organizationId ?? this.options.organizationId,
      actor,
      undefined,
      link.id,
    );

    let values;
    try {
      values = await this.options.clients.getEntitlements({
        productCode,
        customerAwsAccountId: resolved.customerAwsAccountId,
        licenseArn: resolved.licenseArn,
      });
    } catch (error) {
      this.options.audit(
        'marketplace.entitlement.denied',
        link.organizationId ?? this.options.organizationId,
        actor,
        undefined,
        classifyAwsError(error, 'getEntitlements'),
      );
      const record = this.saveRecord({
        awsAccountId: resolved.customerAwsAccountId,
        licenseArn: resolved.licenseArn,
        productCode,
        status: 'UNAVAILABLE',
        linkId: link.id,
      });
      this.byHash.set(tokenHash, record.id);
      return denied('UNAVAILABLE', 'Entitlement lookup failed.', {
        registrationId: record.id,
        organizationId: link.organizationId,
        organizationLinkStatus: 'APPROVED',
      });
    }

    const entitlements = values.map(value =>
      mapAwsEntitlement(
        link.organizationId ?? this.options.organizationId,
        productCode,
        value,
      ),
    );
    const active = entitlements.filter(item => isActiveEntitlement(item));
    const entitledProductIds = active.map(item => item.productId);
    const entitled = entitledProductIds.includes('golden-path.rest-equipment')
      || active.length > 0;
    const status: MarketplaceRegistrationStatus = entitled
      ? 'ENTITLED'
      : 'NOT_ENTITLED';
    this.options.audit(
      entitled
        ? 'marketplace.entitlement.active'
        : 'marketplace.entitlement.denied',
      link.organizationId ?? this.options.organizationId,
      actor,
      'golden-path.rest-equipment',
    );
    const record = this.saveRecord({
      awsAccountId: resolved.customerAwsAccountId,
      licenseArn: resolved.licenseArn,
      productCode,
      status,
      linkId: link.id,
    });
    this.byHash.set(tokenHash, record.id);
    return {
      tenantCreated: false,
      accessGranted: false,
      requiresSignIn: true,
      status,
      registrationId: record.id,
      organizationId: link.organizationId,
      organizationLinkStatus: link.status,
      entitledProductIds,
      message: entitled
        ? 'Marketplace entitlement is ACTIVE. Sign in with an approved Catalog user to use the Control Plane. Registration does not create a tenant or grant portal access.'
        : 'Marketplace identity is linked but no ACTIVE entitlement was found.',
    };
  }

  private saveRecord(
    input: Omit<RegistrationRecord, 'id' | 'createdAt'>,
  ): RegistrationRecord {
    const record: RegistrationRecord = {
      ...input,
      id: `reg-${randomBytes(8).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.records.set(record.id, record);
    return record;
  }

  private toResult(
    record: RegistrationRecord,
    message: string,
  ): MarketplaceRegistrationResult {
    return {
      tenantCreated: false,
      accessGranted: false,
      requiresSignIn: true,
      status: record.status,
      registrationId: record.id,
      entitledProductIds: [],
      message,
    };
  }
}

export function registrationHtml(result: MarketplaceRegistrationResult): string {
  const body = result.message.replaceAll('<', '');
  const next = '/';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Nexora</title></head>
<body>
  <h1>Marketplace registration</h1>
  <p>${body}</p>
  <p>Status: ${result.status}</p>
  <p>Sign in is required. This step does not create a tenant or grant application access.</p>
  <p><a href="${next}">Continue to Nexora</a></p>
</body>
</html>`;
}
