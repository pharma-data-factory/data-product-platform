# Platform Component Model

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

## Definition

A Platform Component is a reusable technical capability used to compose
Data Products and Golden Paths.

Examples:

- Kafka Consumer = Platform Component
- PostgreSQL = Platform Component
- REST API = Platform Component
- Unified Namespace = Platform Component
- Asset Administration Shell Foundation = Platform Component
- OEE = Data Product / Golden Path (technically CERTIFIED / RELEASED;
  commercial FUTURE)

## Catalog representation

Use native Backstage `kind: Component`. Do not introduce a custom Catalog
kind.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: kafka-consumer
  title: Kafka Consumer
spec:
  type: platform-component
  lifecycle: experimental
  owner: group:default/platform-team
```

Required metadata:

| Field | Source |
| --- | --- |
| name, title, description | Catalog metadata |
| category | `dataprod.platform/category` |
| version | `dataprod.platform/version` |
| lifecycle | native `spec.lifecycle` |
| owner | native `spec.owner` |
| certificationStatus | `dataprod.platform/certification-status` |
| compatibleStandardVersions | `dataprod.platform/compatible-standard-versions` |
| documentation, repository | native links / TechDocs |
| providesApis, consumesApis, dependsOn | native spec fields |

Do not duplicate topology in annotations. Used By is derived from Catalog
relations (`dependsOn` / `dependencyOf`).
