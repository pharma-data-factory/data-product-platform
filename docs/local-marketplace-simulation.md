# Local Marketplace simulation

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Prove the commercial flow without AWS credentials.

```yaml
commercial:
  entitlementProvider: local
  localEntitlements:
    internal:
      - golden-path.mqtt-temperature
      - golden-path.rest-equipment
      - platform.core
```

No secrets. MQTT Temperature and REST Equipment Create continue to work
for Developers because the local provider marks those products ACTIVE.

Views:

- Marketplace commercial chips: ENTITLED / NOT ENTITLED / PLANNED / FUTURE
- `/access` — My Access / My Products
- `/admin/entitlements` — Platform Admin
- `/admin/marketplace-integration` — LOCAL / NOT CONFIGURED

To simulate a missing entitlement, remove a product id from
`localEntitlements` and restart the backend. Do not edit entitlements
from the browser.

## Controlled AWS test (only if seller/test setup exists)

Do not create Marketplace products or offers automatically.

1. Set `AWS_MARKETPLACE_REGION` and `AWS_MARKETPLACE_PRODUCT_CODE`.
2. Use an IAM role with `GetEntitlements` / `ResolveCustomer` only.
3. Set `commercial.entitlementProvider: aws`.
4. Open `/admin/marketplace-integration`. Expect CONNECTED or ERROR.
5. If unset, status remains NOT CONFIGURED. In AWS mode that is fail-closed
   (no local entitlement fallback). Use `app-config.marketplace-test.yaml`
   for a limited test overlay. Do not mix `environment: local` with
   `entitlementProvider: aws`.
