import { createBackend } from '@backstage/backend-defaults';
import { catalogModuleCertificationOverlay } from '@internal/plugin-data-products-backend';
import { permissionModulePlatformPolicy } from './permission/module';
import { aasPlugin } from './aas/plugin';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));

backend.add(import('@backstage/plugin-techdocs-backend'));

backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

backend.add(import('@backstage/plugin-permission-backend'));
backend.add(permissionModulePlatformPolicy);

// RBAC: Community RBAC plugin as central authorization policy administration
// Works alongside PlatformPermissionPolicy to provide role-based access control
backend.add(import('@backstage-community/plugin-rbac-backend'));

backend.add(import('@internal/plugin-data-products-backend'));
backend.add(catalogModuleCertificationOverlay);
backend.add(aasPlugin);
backend.add(import('@internal/plugin-entitlements-backend'));
backend.add(import('@internal/plugin-nexora-backend'));
backend.add(import('@internal/plugin-validation-expert-backend'));
backend.add(import('@internal/plugin-validation-manager-backend'));
backend.add(import('@internal/plugin-urs-composer-backend'));
backend.add(import('@internal/plugin-directory-backend'));
backend.add(import('@internal/plugin-model-company-backend'));
backend.add(import('@internal/plugin-authorization-registry-backend'));

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));
backend.add(import('@backstage/plugin-notifications-backend'));

backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

backend.start();
