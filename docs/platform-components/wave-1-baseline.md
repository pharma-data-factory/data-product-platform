# Wave 1 Platform Component baseline

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Frozen baseline for the Pharma Data Factory pilot hardening gate.
Do not change component APIs or runtime semantics unless a demonstrated
P0/P1 defect requires it.

CERTIFIED means technical conformance to the
[Platform Component Standard](component-standard.md) only. It does not
mean GxP validated, regulatory approved, commercially approved, or
AWS Marketplace listed.

Catalog `spec.lifecycle` for these six components is `production`.
Certification stays on `dataprod.platform/certification-status: CERTIFIED`.

| Component | Catalog | Package | Version | Status |
| --- | --- | --- | --- | --- |
| Health | `component:default/health` | `pdf-health` | 1.0.0 | CERTIFIED |
| Observability | `component:default/observability` | `pdf-observability` | 1.0.0 | CERTIFIED |
| REST API | `component:default/rest-api` | `pdf-rest-api` | 1.0.0 | CERTIFIED |
| REST Source | `component:default/rest-source` | `pdf-rest-source` | 1.0.0 | CERTIFIED |
| MQTT Consumer | `component:default/mqtt-consumer` | `pdf-mqtt-consumer` | 1.0.0 | CERTIFIED |
| Time-Series Storage | `component:default/timeseries` | `pdf-timeseries` | 1.0.0 | CERTIFIED |

Not in this freeze:

| Asset | Status | Note |
| --- | --- | --- |
| Machine Metrics Reference | TESTED | Composition proof. Not a Golden Path. Catalog class REFERENCE. |
| Unified Namespace | DEVELOPMENT | Optional for OEE. Not CERTIFIED. |
| AAS Foundation | DEVELOPMENT | Optional for OEE. Not CERTIFIED. |
| Kafka / RAG / AI / Knowledge Graph | PLANNED | Placeholders only. |

Composition consumers must pin version ranges (`1.x`), not unversioned
names. Incompatible ranges fail `validateComposition`.
