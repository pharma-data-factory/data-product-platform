/**
 * Safe Marketplace customer → organization linking.
 *
 * Never trust a client-supplied organization id as the authority.
 * Verified identity is AWS account and/or License ARN from ResolveCustomer
 * / GetEntitlements, mapped through a server-side table.
 *
 * Do not provision tenants here.
 */

export interface MarketplaceOrganizationLink {
  organizationId: string;
  customerAwsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
}

export type OrganizationLinkStatus =
  | 'LINKED'
  | 'UNKNOWN_ORGANIZATION'
  | 'CONFLICT'
  | 'UNTRUSTED_CLAIM'
  | 'EXPIRED_AGREEMENT'
  | 'MULTIPLE_AGREEMENTS';

export interface OrganizationLinkResult {
  status: OrganizationLinkStatus;
  organizationId?: string;
  reason: string;
}

export function linkHasIdentity(
  link: MarketplaceOrganizationLink,
): boolean {
  return Boolean(link.customerAwsAccountId?.trim() || link.licenseArn?.trim());
}

export function resolveMarketplaceOrganization(input: {
  links: readonly MarketplaceOrganizationLink[];
  customerAwsAccountId?: string;
  licenseArn?: string;
  productCode?: string;
  claimedOrganizationId?: string;
  agreementExpired?: boolean;
}): OrganizationLinkResult {
  const account = input.customerAwsAccountId?.trim();
  const licenseArn = input.licenseArn?.trim();
  if (!account && !licenseArn) {
    return {
      status: 'UNKNOWN_ORGANIZATION',
      reason: 'Marketplace identity is missing (no AWS account or License ARN)',
    };
  }

  const matches = input.links.filter(link => {
    if (!linkHasIdentity(link)) {
      return false;
    }
    const productMatch =
      !input.productCode ||
      !link.productCode ||
      link.productCode === input.productCode;
    if (!productMatch) {
      return false;
    }
    const accountMatch = Boolean(account && link.customerAwsAccountId === account);
    const licenseMatch = Boolean(
      licenseArn && link.licenseArn === licenseArn,
    );
    return accountMatch || licenseMatch;
  });

  const organizationIds = [
    ...new Set(matches.map(link => link.organizationId)),
  ];

  if (organizationIds.length === 0) {
    return {
      status: 'UNKNOWN_ORGANIZATION',
      reason:
        'No verified mapping from Marketplace identity to a Pharma Data Factory organization',
    };
  }

  if (organizationIds.length > 1) {
    return {
      status: 'CONFLICT',
      reason:
        'Marketplace identity maps to more than one organization. Manual review required.',
    };
  }

  const organizationId = organizationIds[0];
  if (
    input.claimedOrganizationId &&
    input.claimedOrganizationId !== organizationId
  ) {
    return {
      status: 'UNTRUSTED_CLAIM',
      organizationId,
      reason:
        'Client-supplied organization id does not match the verified Marketplace mapping',
    };
  }

  if (input.agreementExpired) {
    return {
      status: 'EXPIRED_AGREEMENT',
      organizationId,
      reason: 'Verified organization mapping exists but the agreement is expired',
    };
  }

  if (matches.length > 1) {
    return {
      status: 'MULTIPLE_AGREEMENTS',
      organizationId,
      reason:
        'Multiple distinguishable agreements map to the same organization (License ARN)',
    };
  }

  return {
    status: 'LINKED',
    organizationId,
    reason: 'Verified Marketplace identity',
  };
}
