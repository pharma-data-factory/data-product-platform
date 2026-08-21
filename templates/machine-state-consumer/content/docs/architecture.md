# Architecture

This product is independently deployable. Backstage is the Control Plane.
UNS and this consumer are Runtime / Data Plane.

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  UNS[Unified Namespace]
  C[machine-state-event]
  DP[Machine State Consumer]
  DB[SQLite]
  API[REST API]
  CONS[Consumer]

  UNS --> C --> DP --> DB --> API --> CONS

  class UNS teal
  class DP navy
```

MQTT is optional for local tests. `POST /api/v1/events` uses the same
validation and persistence path.
