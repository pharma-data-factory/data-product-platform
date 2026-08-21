# Contracts

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

Consumers bind to a versioned Catalog `API` (`spec.type: contract`), not
to source-system schemas.

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  P[Provider Data Product] --> C[Contract API]
  C --> CONS[Consumer]

  class P navy
  class C teal
  class CONS navy
```

| Logical contract | Current version | Canonical schema docs |
| --- | --- | --- |
| `temperature-event` | 1.1.0 | [temperature-event.md](../contracts/temperature-event.md) |
| `equipment-event` | 1.0.0 | [equipment-event.md](../contracts/equipment-event.md) |
| `machine-state-event` | 1.0.0 | Reused by OEE 1.0; [OEE contracts](../oee/contracts.md) |
| `production-count-event` | 1.0.0 | [OEE contracts](../oee/contracts.md) (design; no runtime) |
| `quality-count-event` | 1.0.0 | [OEE contracts](../oee/contracts.md) (design; no runtime) |
| `production-context` | 1.0.0 | [OEE contracts](../oee/contracts.md) (design; no runtime) |
| `oee-result` | 1.0.0 | [OEE contracts](../oee/contracts.md) (design; no runtime) |

API identity: [api-identity.md](../api-identity.md).  
How to change a contract: [Update a Data Contract](../how-to/contract-change.md).
