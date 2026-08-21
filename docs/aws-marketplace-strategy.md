# AWS Marketplace strategy

AWS Marketplace and the Pharma Data Factory Marketplace are different
products. Do not merge them in UI, architecture, or commercial copy.

This platform is **designed for future AWS Marketplace distribution**.
There is no live listing and no checkout in this release.

## Two marketplaces

```text
AWS Marketplace
=
commercial procurement, subscription, billing and entitlement source

Pharma Data Factory Marketplace
=
technical discovery and provisioning of approved platform assets
```

| | AWS Marketplace | Pharma Data Factory Marketplace |
| --- | --- | --- |
| Purpose | Buy a license or subscription | Discover and create approved templates / data products |
| Buyer | Procurement / platform owner | Developer / data product owner |
| Result | Entitlement | Catalog entity + generated repository |
| Status | Adapter ready; not listed | Available in the Control Plane (no payments) |

## Intended flow

Template Edition:

```text
AWS Marketplace
  → customer entitlement
  → Pharma Data Factory Distribution Service
  → current RELEASED Golden Path
  → Customer GitHub / Customer AWS / customer pipeline
```

AWS Marketplace does not deliver a template ZIP.

Platform Edition remains a planned customer-cloud license
(`platform.core`). SaaS Edition would later consume AWS Marketplace as
an entitlement source into the Entitlement Service. Registration is an
interface only; tenants are not provisioned.

## Current rules

- Use `LocalEntitlementProvider` only when `commercial.environment` is `local`.
- AWS / test-marketplace mode is fail-closed. API failure does not grant
  INTERNAL entitlements.
- Unconfigured AWS in AWS mode reports NOT CONFIGURED and denies commercial Create.
- Do not implement billing, metering records, or checkout.
- Do not show AWS Marketplace as an in-product storefront.
- Keep the in-product Marketplace catalog-driven and payment-free.

See [aws-marketplace-integration.md](aws-marketplace-integration.md),
[aws-marketplace-test-listing.md](aws-marketplace-test-listing.md), and
[commercial-architecture.md](commercial-architecture.md).
