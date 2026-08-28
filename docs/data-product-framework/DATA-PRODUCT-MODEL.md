# Data Product Model

System of record remains Backstage Catalog **Component** with `spec.type: data-product`.
No duplicate custom Catalog kind is introduced.

## Annotations (Consumption Framework)

| Annotation | Purpose |
| --- | --- |
| `dataprod.platform/interfaces` | Declared interfaces (e.g. REST) |
| `dataprod.platform/consume-rest-path` | Relative REST path |
| `dataprod.platform/consume-stream` | `sse` \| `websocket` |
| `dataprod.platform/consume-base-url` | Optional product-level upstream hint |
| `dataprod.platform/presentation-capabilities` | CSV of capabilities |
| `dataprod.platform/presentation-extensions` | CSV of registered extension ids |
| `dataprod.platform/validation-status` | Default `NOT_VALIDATED` |
| `dataprod.platform/input-contracts` | Input contract ids |
| `dataprod.platform/data-contracts` | Output contract ids |
| `dataprod.platform/freshness-target-seconds` | Quality expectation |
| `dataprod.platform/completeness-target` | Quality expectation |

## Optional repo file

Golden Paths may emit `dataproduct.yaml` (`apiVersion: platform.nexora.io/v1alpha1`) as documentation.
Runtime discovery reads Catalog annotations via `descriptorFromEntity`.

## Live vs declared quality

Declared targets may be present. Live freshness/completeness default to `NOT_AVAILABLE` until measured.
Validation status is never auto-promoted.
