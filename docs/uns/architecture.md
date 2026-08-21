# UNS Architecture

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  SRC[PLC / SCADA / MES / Historian / Sensors] --> IN[MQTT ingestion]
  IN --> UNS[Unified Namespace]
  UNS --> TOPICS[Governed topic hierarchy]
  TOPICS --> CONTRACTS[Data Contracts]
  CONTRACTS --> DP[Consumers / Data Products]

  class SRC navy
  class UNS teal
  class DP navy
```

MQTT is the first transport. `EventTransport` is the seam for a later
Kafka implementation. Do not add Kafka in this milestone.

Do not imply direct database access to MES, ERP, or LIMS.
