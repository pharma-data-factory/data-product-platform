# AWS Marketplace test listing readiness

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

**Status: TEST_INTEGRATION_READY for one limited REST Equipment test
product.** This Control Plane still must **not** create a live/public
listing, offer, metering record, or SaaS tenant.

Public wording remains: **Designed for future AWS Marketplace
distribution.** Do not say “Available on AWS Marketplace”.

## Recommended first test product

**REST Equipment** (`golden-path.rest-equipment`)

## Environments

| Environment | Provider | Failure mode |
| --- | --- | --- |
| `local` | `LocalEntitlementProvider` | Local ACTIVE grants are intentional. |
| `test-marketplace` | AWS adapter, fail-closed | AWS down → no entitlement. Overlay: `app-config.marketplace-test.yaml`. |
| `production` | local until a live listing is approved; AWS must be fail-closed | Never mix with local fallback. |

```yaml
commercial:
  environment: test-marketplace
  entitlementProvider: aws
  legalDistributionStatus: BLOCKED
```

Required: `AWS_MARKETPLACE_REGION`, `AWS_MARKETPLACE_PRODUCT_CODE`.
No production customer identifiers in committed config.

## Registration

`POST /api/entitlements/marketplace/register` (unauthenticated AWS
fulfillment POST):

1. Rate-limit by client address (20 requests / 60 seconds).
2. Accept `x-amzn-marketplace-token` server-side only.
3. `ResolveCustomer` (token never logged, persisted as plaintext, or
   returned).
4. Map `CustomerAWSAccountId` + `LicenseArn` + `ProductCode` through the
   server-side `MarketplaceOrganizationLink` table.
5. Unknown identity → `PENDING_ACCESS` (admin must approve). Known AWS
   account → existing organization `internal`. Conflicting account → deny
   and audit. Disabled link → not entitled.
6. `GetEntitlements` filtered by `LICENSE_ARN` (and account). ACTIVE is
   required.
7. Return a controlled result. **No tenant. No portal session.** Sign in
   with an approved Catalog user is still required.

Replay: AWS registration tokens are intended to be single-use at
`ResolveCustomer`. This Control Plane stores only a SHA-256 of the token
in memory so a repeated POST can return the same registration id without
calling AWS again. After process restart, a replayed token is sent to
AWS and typically fails. Plaintext is never written to disk.

## Identity separation

Marketplace customer identity (AWS account / License ARN) is not a
portal user. Application access requires:

verified Marketplace registration **and** authenticated Pharma Data
Factory user **and** approved Catalog User / RBAC.

## Organization links

Platform Admin on `/admin/marketplace-integration` may VIEW, APPROVE, or
DISABLE a verified identity onto the existing `internal` organization.
The browser cannot choose an arbitrary organization id. Multiple License
ARNs may map to the same organization. Links are not auto-reassigned.

## Legal distribution gate

Default: **BLOCKED**. Internal Create (`handoff: internal`) remains
available. Customer artifact handoff (`handoff: customer`) is denied
until `commercial.legalDistributionStatus: APPROVED` after counsel.

See [generated placeholders](legal/generated-placeholders.md) and
[REST Equipment packaging](golden-paths/rest-equipment-packaging.md).

## Support boundary (test product only)

Pharma Data Factory may support: Marketplace registration integration,
entitlement resolution, Golden Path generation, template defects, the
`dataprod` contract framework, and Control Plane defects.

Customer/tester responsibility: AWS account, GitHub, source-system
credentials, networking, and the deployment environment.

No SLA is offered.

## Human steps in AWS Marketplace Management Portal

Do **not** perform these from automation.

1. Register as a seller (tax, banking, identity). Do not use a personal
   administrator long-lived key for runtime.
2. Open **Products → SaaS** and create a **limited** (seller-account)
   product. Do not make it public.
3. Describe fulfillment as Control Plane entitlement to REST Equipment
   generation. Do not describe a hosted equipment service.
4. Add a contract dimension whose id is `golden-path.rest-equipment`.
5. Set the fulfillment URL to
   `https://<control-plane>/api/entitlements/marketplace/register`.
6. Attach a least-privilege IAM role (`GetEntitlements`,
   `ResolveCustomer` only) to the Control Plane workload. Configure
   `AWS_MARKETPLACE_REGION` and `AWS_MARKETPLACE_PRODUCT_CODE`.
7. Load `app-config.marketplace-test.yaml`. Confirm
   `/admin/marketplace-integration` shows fail-closed AWS mode, legal
   status BLOCKED, and no secrets.
8. Subscribe from the seller account → Continue to configuration →
   registration POST → Sign In → Platform Admin approves the link if
   pending → REST Equipment shows ENTITLED → Developer may Create
   internally.
9. Do **not** create a public offer, private offer, or metering
   integration. Do **not** subscribe production customers.

Related: [AWS Marketplace integration](aws-marketplace-integration.md),
[Local simulation](local-marketplace-simulation.md).
