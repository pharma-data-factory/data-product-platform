import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { createEntitlementRuntime } from '@internal/plugin-entitlements-backend';
import { PlatformPermissionPolicy } from './policy';

export const permissionModulePlatformPolicy = createBackendModule({
  pluginId: 'permission',
  moduleId: 'platform-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ policy, config }) {
        const runtime = createEntitlementRuntime({ config });
        policy.setPolicy(
          new PlatformPermissionPolicy({
            organizationId: runtime.config.organizationId,
            hasEntitlement: (organizationId, productId) =>
              runtime.service.hasEntitlement(organizationId, productId),
            auditStore: runtime.service.createAuthorizationAuditStore(),
          }),
        );
      },
    });
  },
});
