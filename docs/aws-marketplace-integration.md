# AWS Marketplace integration

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Designed for future AWS Marketplace distribution. Not a live listing.

APIs below were verified against current AWS Marketplace documentation
(2026). The same API does **not** apply to every listing type.

## SaaS contract / subscription

Applicable later for SaaS Edition only:

- `ResolveCustomer` (Metering Service) — exchange
  `x-amzn-marketplace-token` for `CustomerAWSAccountId`, `LicenseArn`,
  `ProductCode`. New integrations must not rely on `CustomerIdentifier`
  (deprecated).
- `GetEntitlements` (Entitlement Service) — contract dimensions.
  Filters: `CUSTOMER_AWS_ACCOUNT_ID`, `LICENSE_ARN`, `DIMENSION`.
- Concurrent agreements (new SaaS products from 2026-06-01) are modeled
  as separate entitlements keyed by `LicenseArn`.
- Events: Amazon EventBridge for new listings (SNS remains for some
  existing products). Not subscribed in this foundation.

## SaaS usage metering

`BatchMeterUsage` is a **metering** API. Metering is a separate
provider (`UsageMeteringProvider`). This release does not send usage
records and does not choose a pricing metric.

## Container / self-hosted / Platform Edition

- `RegisterUsage` / `MeterUsage` run **in the customer AWS account** at
  container start. They are not Control Plane entitlement lookups.
- Contract-priced containers may use AWS License Manager.
- AWS Marketplace does **not** deliver a ZIP of Golden Path templates.
  Template Edition distribution is: entitlement → Distribution Service →
  current RELEASED Golden Path → customer GitHub / customer AWS /
  customer pipeline.

## Seller Catalog API and Agreements API

These manage listings, offers, and private offers. This foundation does
not call them and does not create products or private offers.

## Configuration

```text
AWS_MARKETPLACE_REGION=
AWS_MARKETPLACE_PRODUCT_CODE=
```

Prefer IAM roles / workload identity. Do not commit access keys, session
tokens, registration tokens, or customer identifiers.

If credentials are absent in **local** mode, the adapter reports
**NOT CONFIGURED** and `LocalEntitlementProvider` is used.

If `commercial.entitlementProvider` is `aws` (or `environment` is
`test-marketplace` / AWS production), the adapter is **fail-closed**:
missing configuration or AWS API failure grants **no** entitlements.
It does not fall back to INTERNAL / local ACTIVE grants.

Production requirements: server-side calls only, redact tokens,
validate registration POSTs, rate-limit the fulfillment callback,
backend enforcement, technical audit trail. No GxP claim.

`POST /api/entitlements/marketplace/register` runs ResolveCustomer and
organization linking. It does not create a tenant or grant a portal
session.

Do not say “Available on AWS Marketplace” until a listing is approved.

Related: [local Marketplace simulation](local-marketplace-simulation.md),
[test listing readiness](aws-marketplace-test-listing.md).
