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
  createEntitlementAuditEvent,
  currentRelease,
  decidePermission,
  hasApprovedPlatformAccess,
  isCommerciallyOffered,
  isGenerallyAvailableRelease,
  isScaffolderTemplatePermission,
  resolvePlatformRole,
  templateIdFromResourceRef,
  type CreateAuthorizationAuditStore,
  type PlatformRole,
} from '@internal/platform-common';

/**
 * Authorization has two independent layers:
 *
 * 1. RBAC — Backstage identity and catalog groups via decidePermission.
 * 2. Entitlement — commercial capability for the organization.
 *
 * Entitlements are not roles. Missing entitlement is not an RBAC deny
 * reason except as an additional AND on commercial template create.
 *
 * Scaffolder task/action create and data-product.create are the
 * validation-relevant Create authorization decisions. Those outcomes are
 * appended to the same durable store used by authorizeCreate.
 */
export interface CommercialEntitlementGate {
  organizationId: string;
  hasEntitlement(organizationId: string, productId: string): Promise<boolean>;
  auditStore?: CreateAuthorizationAuditStore;
}

const CREATE_AUTHORIZATION_PERMISSIONS = new Set([
  'scaffolder.task.create',
  'scaffolder.action.execute',
  'data-product.create',
]);

export function isValidationRelevantCreatePermission(name: string): boolean {
  return CREATE_AUTHORIZATION_PERMISSIONS.has(name);
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
    const templateId = templateIdFromResourceRef(resourceRef);
    const product = templateId
      ? commercialProductForTemplate(templateId)
      : undefined;

    const rbacAllowed = decidePermission(request.permission, role, resourceRef) === 'allow';
    let allowed = rbacAllowed;
    let reason: 'OK' | 'RBAC' | 'ENTITLEMENT' | 'RELEASE' = rbacAllowed
      ? 'OK'
      : 'RBAC';
    let entitled: boolean | undefined;
    let releaseEligible: boolean | undefined;

    if (
      allowed &&
      this.commercial &&
      isScaffolderTemplatePermission(request.permission.name)
    ) {
      if (product && isCommerciallyOffered(product)) {
        entitled = await this.commercial.hasEntitlement(
          this.commercial.organizationId,
          product.productId,
        );
        if (!entitled) {
          allowed = false;
          reason = 'ENTITLEMENT';
        } else {
          const releaseId = product.templateId ?? templateId;
          releaseEligible = Boolean(
            releaseId && isGenerallyAvailableRelease(currentRelease(releaseId)),
          );
          if (!releaseEligible) {
            allowed = false;
            reason = 'RELEASE';
          }
        }
      }
    }

    const result: PolicyDecision = {
      result: allowed ? AuthorizeResult.ALLOW : AuthorizeResult.DENY,
    };
    this.recordCreateAuthorization({
      permissionName: request.permission.name,
      allowed,
      reason,
      actor: user?.info.userEntityRef ?? 'unauthenticated',
      role,
      templateId,
      productId: product?.productId,
      rbacAllowed,
      entitled,
      releaseEligible,
    });
    return result;
  }

  private recordCreateAuthorization(input: {
    permissionName: string;
    allowed: boolean;
    reason: string;
    actor: string;
    role?: PlatformRole;
    templateId?: string;
    productId?: string;
    rbacAllowed: boolean;
    entitled?: boolean;
    releaseEligible?: boolean;
  }) {
    if (
      !this.commercial?.auditStore ||
      !isValidationRelevantCreatePermission(input.permissionName)
    ) {
      return;
    }
    this.commercial.auditStore.append(
      createEntitlementAuditEvent({
        type: input.allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        actor: input.actor,
        organizationId: this.commercial.organizationId,
        productId: input.productId,
        detail: input.reason,
        action: input.permissionName,
        decision: input.allowed ? 'GRANT' : 'DENY',
        authorizationContext: {
          reason: input.reason,
          templateId: input.templateId,
          role: input.role,
          permission: input.permissionName,
          rbacAllowed: input.rbacAllowed,
          entitled: input.entitled,
          releaseEligible: input.releaseEligible,
        },
      }),
    );
  }
}
