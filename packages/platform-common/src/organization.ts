/**
 * Organization model for the current single-organization Control Plane
 * and a future multi-organization SaaS boundary.
 *
 * Current deployment: organization id `internal`. Catalog namespace remains
 * `default`. This module does not implement tenant isolation, org switching,
 * or per-organization catalogs.
 */

export const DEFAULT_ORGANIZATION_ID = 'internal';
export const DEFAULT_ORGANIZATION_SLUG = 'internal';
export const DEFAULT_ORGANIZATION_NAME = 'Nexora';
export const LEGACY_ORGANIZATION_ID = 'default';

export type OrganizationIsolationMode =
  | 'single-organization'
  | 'multi-organization';

/**
 * Future SaaS shape:
 *
 * Organization
 * ├── Users
 * ├── Groups
 * ├── Data Products
 * ├── Templates
 * ├── Entitlements
 * └── Configuration
 *
 * Current deployment binds all of those collections to a single internal
 * organization. Future SaaS would isolate them per organization.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  users: readonly string[];
  groups: readonly string[];
  dataProducts: readonly string[];
  templates: readonly string[];
  entitlements: readonly string[];
  configuration: Readonly<Record<string, string>>;
}

export interface OrganizationContext {
  organization: Organization;
  isolationMode: OrganizationIsolationMode;
}

export const DEFAULT_ORGANIZATION: Organization = {
  id: DEFAULT_ORGANIZATION_ID,
  name: DEFAULT_ORGANIZATION_NAME,
  slug: DEFAULT_ORGANIZATION_SLUG,
  users: [],
  groups: [],
  dataProducts: [],
  templates: [],
  entitlements: [],
  configuration: {
    deploymentMode: 'single-organization',
    productEdition: 'internal',
  },
};

export function createDefaultOrganizationContext(
  overrides: Partial<Organization> = {},
): OrganizationContext {
  return {
    organization: {
      ...DEFAULT_ORGANIZATION,
      ...overrides,
      id: overrides.id ?? DEFAULT_ORGANIZATION_ID,
      slug: overrides.slug ?? DEFAULT_ORGANIZATION_SLUG,
      configuration: {
        ...DEFAULT_ORGANIZATION.configuration,
        ...(overrides.configuration ?? {}),
      },
    },
    isolationMode: 'single-organization',
  };
}

export function isDefaultOrganization(organization: Organization): boolean {
  return (
    organization.id === DEFAULT_ORGANIZATION_ID ||
    organization.id === LEGACY_ORGANIZATION_ID
  );
}

export function resolveOrganizationId(value?: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === LEGACY_ORGANIZATION_ID) {
    return DEFAULT_ORGANIZATION_ID;
  }
  return trimmed;
}
