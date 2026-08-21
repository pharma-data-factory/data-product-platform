# Commercial model

Pharma Data Factory is sold as product editions, not as unmodified
Backstage. This document describes the commercial model. It does not
implement billing, checkout, or AWS Marketplace procurement.

List prices are not published. Contact us for enterprise pricing.

The public landing presents editions as a three-column comparison
(Template / Platform / SaaS) without numeric prices or a currency toggle.

## Current deployment

The running MVP is a **single-organization Control Plane**.

- Template Edition Golden Paths are available for a controlled pilot
  and are not commercially distributable while legal gates remain OPEN.
- Platform Edition is the current Control Plane architecture, planned as
  a customer-cloud licensed product.
- SaaS Edition is **future** and is not available today.

## Product editions

### Template Edition — AVAILABLE FOR PILOT

Technically available for a controlled pilot. **Not commercially
distributable** until counsel approves LICENSE / NOTICE gates.

Certified Pharma Data Factory Golden Paths for organizations that already
operate their own development platform.

Includes:

- Certified templates
- Data Contracts
- Quality Gates
- Compatibility Checks
- CI/CD
- Docker
- TechDocs

Deployment: Customer AWS / Customer GitHub

Commercial model: Per-template license or subscription

### Platform Edition — PLANNED

A complete Pharma Data Factory Control Plane deployed into the customer's
own cloud environment.

Includes:

- Marketplace
- Golden Paths
- Data Product Catalog
- Governance
- Quality
- Compatibility
- TechDocs
- Search
- RBAC
- Upgrade Management

Deployment: Customer Cloud

Commercial model: Annual Platform License

This edition is planned. Do not treat the current internal Control Plane
deployment as a generally available customer-cloud product SKU.

### SaaS Edition — FUTURE

Fully managed Pharma Data Factory operated as a service.

Future capabilities:

- Managed Control Plane
- Customer organizations
- Customer SSO
- Tenant isolation
- Managed upgrades
- Usage/entitlement management
- Operational monitoring

Deployment: Managed SaaS

Commercial model: Subscription

SaaS is not available in this release. There is no customer signup, no
tenant provisioning, and no managed billing.

## Pricing model

| Edition | Model | Best for | Status |
| --- | --- | --- | --- |
| Template | Per Template / Subscription | Teams with an existing engineering platform | MVP |
| Platform | Annual Platform License | Organizations wanting their own Pharma Data Factory | Planned |
| SaaS | Managed Subscription | Organizations wanting Data Product Factory as a Service | Future |

Do not invent or display numeric prices until a commercial price list is
approved.

Internal counsel gates for outbound licensing, Backstage notices, generated
Golden Path licenses, and public-site legal pages are tracked in the
repository root file `LEGAL-READINESS-PHASE-0.md`. That file is not
customer documentation and is not published as TechDocs.

## Entitlements

Entitlements are commercial capabilities of an organization. They are
not RBAC roles and not payment enforcement.

Current local entitlements:

- `platform.core`
- `golden-path.mqtt-temperature`
- `golden-path.rest-equipment`

`future.golden-path.oee` is the commercial id for OEE. OEE is technically
CERTIFIED / RELEASED. Commercial availability is **FUTURE** (intentional).
The reserved id is not an enabled commercial SKU. FUTURE does not mean
the Golden Path is missing.

AWS Marketplace may become an entitlement source. That is a procurement
boundary, not the in-product Marketplace. This release is designed for
future AWS Marketplace distribution; it is not listed. See
[aws-marketplace-strategy.md](aws-marketplace-strategy.md) and
[commercial-architecture.md](commercial-architecture.md).

Commercial distribution must still preserve licenses, NOTICE files,
third-party notices, and copyright. AWS Marketplace does not solve OSS
compliance.

## Marketplace boundary

AWS Marketplace is commercial procurement, subscription, billing, and
entitlement source.

Pharma Data Factory Marketplace is technical discovery and provisioning
of approved platform assets.

Do not merge these concepts.
