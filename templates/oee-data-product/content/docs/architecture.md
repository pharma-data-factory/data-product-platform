# Architecture

```text
                MES / Context Provider
                        │
                       REST
                        │
                        ▼

PLC / MES Events → MQTT → OEE DATA PRODUCT
                           │
                    ┌──────┼──────┐
                    │      │      │
                    ▼      ▼      ▼
                    A      P      Q
                    │      │      │
                    └──────┼──────┘
                           ▼
                          OEE
                           │
                           ▼
                 calculationStatus
                           │
                           ▼
                    OEE Result API
```

```mermaid
flowchart TB
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff
  MES[MES / Context Provider] --> RS[REST Source 1.x]
  PLC[PLC / MES Events] --> MQTT[MQTT Consumer 1.x]
  RS --> DOM[OEE Data Product]
  MQTT --> DOM
  DOM --> A[Availability]
  DOM --> P[Performance]
  DOM --> Q[Quality]
  A --> OEE[OEE]
  P --> OEE
  Q --> OEE
  OEE --> ST[calculationStatus]
  ST --> API[OEE Result API]
  H[Health 1.x] --> API
  OBS[Observability 1.x] --> API
  class MES,PLC,DOM,OEE navy
  class RS,MQTT,API,H,OBS,A,P,Q,ST teal
```

Adapters in `app/ingestion/mappings.py` translate MES/PLC payloads to canonical
contracts. The calculator does not know SAP or PLC tag names. Unobserved time
is excluded from planned production time; it is not converted into `STOPPED`.
`reasonCode` does not enter Availability, Performance, Quality, or OEE.
MES remains System of Record. No direct core-system database access.
