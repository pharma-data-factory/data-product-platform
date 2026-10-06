# Data Product Model

System of record remains Backstage Catalog **Component** with `spec.type: data-product`.
No duplicate custom Catalog kind is introduced.

## Annotations (Consumption Framework)

| Annotation | Purpose |
| --- | --- |
| `dataprod.platform/interfaces` | Declared interfaces (e.g. REST) |
| `dataprod.platform/consume-rest-path` | Absolute path on the upstream origin; must start with `/` and may not change the host |
| `dataprod.platform/consume-stream` | `sse` \| `websocket` |
| `dataprod.platform/consume-base-url` | Optional upstream hint. Followed only if its origin is in `dataProducts.consume.allowedOrigins` and it resolves to public addresses; internal upstreams go in `dataProducts.consume.baseUrls` (NXD-091) |
| `dataprod.platform/presentation-capabilities` | CSV of capabilities |
| `dataprod.platform/presentation-extensions` | CSV of registered extension ids |
| `dataprod.platform/validation-status` | Default `NOT_VALIDATED` |
| `dataprod.platform/input-contracts` | Input contract ids |
| `dataprod.platform/data-contracts` | Output contract ids |
| `dataprod.platform/freshness-target-seconds` | Quality expectation |
| `dataprod.platform/completeness-target` | Quality expectation |

## Optional repo file

The canonical manifest of a Data Product is `nexora.yaml` (`apiVersion: nexora.dev/v1alpha1`,
kind `DATA_PRODUCT`) at the repository root. Its schema is `NEXORA_MANIFEST_SCHEMA` in
`@internal/platform-common`; it states runtime, interfaces and install-time configuration, and the
registry checks it when a version is registered. See NXD-130 in
[`DECISIONS.md`](../nexora-transformation/DECISIONS.md). The OEE Golden Path ships one (NXD-131).

`dataproduct.yaml` is gone. No code ever read it, and its copies disagreed with each other and with
`catalog-info.yaml`.

Runtime discovery still reads Catalog annotations via `descriptorFromEntity`; deriving those
annotations from `nexora.yaml` is later work.

## Live vs declared quality

Declared targets may be present. Live freshness/completeness default to `NOT_AVAILABLE` until measured.
Validation status is never auto-promoted.
