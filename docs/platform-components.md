# Platform Component Library

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Reusable building blocks. These are not business Data Products.

Canonical library: [Platform Components](platform-components/index.md).

Registry UI: `/platform-components`.

| Component | Status | Role |
| --- | --- | --- |
| Unified Namespace | DEVELOPMENT | Governed MQTT namespace |
| MQTT Consumer | DEVELOPMENT | Ingest events |
| REST Source | DEVELOPMENT | Pull MES/API context |
| REST API | TESTED | Product interface |
| Kafka Consumer | DEVELOPMENT | Alternate transport contract. No Kafka cluster. |
| Kafka Producer | DEVELOPMENT | Alternate transport contract. No Kafka cluster. |
| PostgreSQL | DEVELOPMENT | Storage building block |
| Time-Series Storage | DEVELOPMENT | Future domain paths |
| Object Storage | DEVELOPMENT | Files / documents |
| Observability | DEVELOPMENT | Technical health |
| Intelligence set | PLANNED | RAG / LLM / Knowledge Graph placeholders |

UNS uses MQTT as its first transport. It does not copy the MQTT
Temperature Golden Path. Kafka infrastructure is not deployed.

Create a new UNS instance from Marketplace / Create → **Unified Namespace**.
That Marketplace entry is a **BUILDING BLOCK**, not a Data Product.

Composition proof: Create → **Machine State Consumer Data Product**.
See [Compose with UNS](how-to/compose-uns.md).
