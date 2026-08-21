# SaaS readiness

This document establishes architecture boundaries so a future SaaS
edition can be added without rewriting the Control Plane. It does **not**
implement multi-tenancy, billing, customer SSO, or tenant isolation.

Current behavior must stay the same: one organization, existing Backstage
identity, configured capabilities entitled, existing RBAC.

## Contexts

Three contexts form the future tenancy boundary.

```text
PlatformRuntimeContext
├── OrganizationContext
├── IdentityContext
└── EntitlementContext
```

Implemented in `packages/platform-common` as models and default
factories. Authenticated home uses `createMvpPlatformContext()` to wrap
the existing Backstage identity. Commercial Create is enforced by the
entitlement service in addition to RBAC.

### OrganizationContext

Future model:

```text
Organization
├── Users
├── Groups
├── Data Products
├── Templates
├── Entitlements
└── Configuration
```

| Mode | Meaning |
| --- | --- |
| Current MVP | `isolationMode: single-organization`, id `internal` |
| Future SaaS | multiple isolated organizations |

Do not add org-scoped catalogs, org switchers, or tenant databases yet.

### IdentityContext

Wraps the existing Backstage identity:

- `userEntityRef`
- `ownershipEntityRefs`
- `platformRole` from catalog groups
- Guest development fallback
- unknown GitHub users are not approved and do not receive Viewer in production

IdentityContext must not replace GitHub OAuth, Guest, or the Permission
Framework. See [identity-and-rbac.md](identity-and-rbac.md).

### EntitlementContext

Provider-neutral commercial entitlements. Product IDs:

- `golden-path.mqtt-temperature`
- `golden-path.rest-equipment`
- `platform.core`
- `platform.components`
- `future.golden-path.oee`

Current default: `LocalEntitlementProvider` (INTERNAL source). AWS
Marketplace is an adapter, not the authorization model. There is no
payment check.

Authenticated APIs enforce entitlements for commercial Create. RBAC
roles are unchanged.

## What stays out of scope

- Multi-tenant data isolation
- Per-organization catalogs
- Billing / payment providers
- Real usage metering records
- Customer SSO beyond current GitHub login
- Live AWS Marketplace listing
- Changing Golden Path templates

## Invariants

1. Permission policy continues to use Backstage identity and groups only.
2. Authenticated home remains the role-aware dashboard.
3. Public landing may describe future editions; it must not sell them as
   available.
4. Generated Data Products remain independent of the Control Plane.
