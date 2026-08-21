# Wave 1 Certified Components

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Wave 1 reusable implementations, technically CERTIFIED against the
[Platform Component Standard](component-standard.md). Not GxP validated.

| Component | Version | Catalog | Category | Compatible Standard |
| --- | --- | --- | --- | --- |
| Health | 1.0.0 | `component:default/health` | operations | 1.x |
| Observability | 1.0.0 | `component:default/observability` | operations | 1.x |
| REST API | 1.0.0 | `component:default/rest-api` | integration | 1.x |
| REST Source | 1.0.0 | `component:default/rest-source` | integration | 1.x |
| MQTT Consumer | 1.0.0 | `component:default/mqtt-consumer` | integration | 1.x |
| Time-Series Storage | 1.0.0 | `component:default/timeseries` | data | 1.x |

Machine Metrics Reference remains a composition proof at **TESTED**. It
is not a Golden Path and is not CERTIFIED as a Data Product.

Unified Namespace remains **DEVELOPMENT** (reusable runtime, separate
from this Wave 1 library set). Kafka, RAG, AI, and Knowledge Graph remain
out of scope.

Evidence: [Wave 1 Conformance Matrix](wave-1-conformance.md).
