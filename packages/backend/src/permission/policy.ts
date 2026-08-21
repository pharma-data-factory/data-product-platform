import {
  AuthorizeResult,
  PolicyDecision,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import {
  commercialProductForTemplate,
  currentRelease,
  decidePermission,
  hasApprovedPlatformAccess,
  isCommerciallyOffered,
  isGenerallyAvailableRelease,
  isScaffolderTemplatePermission,
  resolvePlatformRole,
  templateIdFromResourceRef,
} from '@internal/platform-common';

/**
 * Authorization has two independent layers:
 *
 * 1. RBAC — Backstage identity and catalog groups via decidePermission.
 * 2. Entitlement — commercial capability for the organization.
 *
 * Entitlements are not roles. Missing entitlement is not an RBAC deny
 * reason except as an additional AND on commercial template create.
 */
export interface CommercialEntitlementGate {
  organizationId: string;
  hasEntitlement(organizationId: string, productId: string): Promise<boolean>;
}

export class PlatformPermissionPolicy implements PermissionPolicy {
  constructor(private readonly commercial?: CommercialEntitlementGate) {}

  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    const ownership = user?.info.ownershipEntityRefs ?? [];
    const role =
      user && hasApprovedPlatformAccess(ownership)
        ? resolvePlatformRole(ownership)
        : undefined;
    const resourceRef =
      'resourceRef' in request
        ? (request as PolicyQuery & { resourceRef?: string }).resourceRef
        : undefined;
    const decision = decidePermission(request.permission, role, resourceRef);
    if (decision !== 'allow') {
      return { result: AuthorizeResult.DENY };
    }

    if (
      this.commercial &&
      isScaffolderTemplatePermission(request.permission.name)
    ) {
      const templateId = templateIdFromResourceRef(resourceRef);
      const product = templateId
        ? commercialProductForTemplate(templateId)
        : undefined;
      if (product && isCommerciallyOffered(product)) {
        const entitled = await this.commercial.hasEntitlement(
          this.commercial.organizationId,
          product.productId,
        );
        if (!entitled) {
          return { result: AuthorizeResult.DENY };
        }
        const releaseId = product.templateId ?? templateId;
        if (
          !releaseId ||
          !isGenerallyAvailableRelease(currentRelease(releaseId))
        ) {
          return { result: AuthorizeResult.DENY };
        }
      }
    }

    return { result: AuthorizeResult.ALLOW };
  }
}
