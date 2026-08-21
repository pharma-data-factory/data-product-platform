# Commercial product IDs

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Entitlement keys are stable product IDs, not UI labels.

| productId | Type | Catalog / template | Availability |
| --- | --- | --- | --- |
| `golden-path.mqtt-temperature` | GOLDEN_PATH | `template:default/mqtt-temperature-data-product` | AVAILABLE |
| `golden-path.rest-equipment` | GOLDEN_PATH | `template:default/rest-equipment-data-product` | AVAILABLE |
| `platform.core` | PLATFORM | `component:default/data-product-platform` | PLANNED |
| `platform.components` | PLATFORM_COMPONENT | Platform Component library | PLANNED |
| `future.golden-path.oee` | GOLDEN_PATH | `template:default/oee-data-product` | FUTURE |

OEE technical status is CERTIFIED / RELEASED. Commercial availability is
FUTURE. Do not treat FUTURE as “OEE does not exist”. Do not treat
CERTIFIED as “customers can buy OEE”.

Source of truth: `config/commercial-products.yaml` (mirrored in
`packages/platform-common/src/commercial-products.catalog.json`).

Do not store Marketplace customer data in Git.

Related: [distribution channels](engineering/distribution-channels.md).
