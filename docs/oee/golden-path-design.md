# OEE Golden Path Design 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: **CERTIFIED** (technical platform status only, not GxP)

This is the implementation-ready design for the first composite Domain
Golden Path: **OEE Data Product**. The runtime and Create template are
implemented in `templates/oee-data-product`.

Thesis:

> KEEP CORE SYSTEMS STANDARD. INNOVATE THROUGH DATA PRODUCTS.

MES, ERP, LIMS, and EWM stay standard. OEE is a Data Product that
consumes governed REST and MQTT. Direct database access to those cores
is prohibited.

## Pilot baseline (Mode A)

```text
MES / Production Context
        │
        ▼
   REST Source 1.x
        │
        ├──────────────────────┐
        │                      │
Machine / PLC                  │
        │                      │
        ▼                      │
 MQTT Consumer 1.x             │
        │                      │
        └──────────┬───────────┘
                   ▼
           OEE DOMAIN LOGIC
       Availability × Performance × Quality
                   │
                   ▼
       Time-Series Storage 1.x
                   │
                   ▼
             REST API 1.x

Cross-cutting: Health 1.x, Observability 1.x
Optional later: Unified Namespace, AAS Foundation
```

Composition: `catalog/compositions/oee-data-product-direct.yaml`.

## Pack index

| Document | Contents |
| --- | --- |
| [Domain model](domain-model.md) | Concepts, units, formulas |
| [Contracts](contracts.md) | Input/output contracts |
| [Calculation](calculation.md) | Pipeline and numeric scenarios |
| [Time windows](time-windows.md) | Event time, kinds, late events |
| [Quality](quality.md) | Checks and calculationStatus |
| [Edge cases](edge-cases.md) | Missing/reset/overlap rules |
| [Edge-case matrix](edge-case-matrix.md) | Behavior × status × API × logs |
| [API](api.md) | Future REST surface |
| [Storage](storage.md) | SQLite pilot, upgrade seam |
| [Source mapping](source-mapping.md) | Adapters, AAS, UNS |
| [Create and configuration](create-and-config.md) | Create UX, secrets, package boundary |
| [Pilot limitations](pilot-limitations.md) | Explicit non-claims |
| [Decisions](decisions.md) | Product questions still open |
| [Definition of Done](definition-of-done.md) | Future implementation gate |
| [MVP boundary](mvp-boundary.md) | Approved pilot constraints |

Hub status for the semantic pack: **CERTIFIED** (technical). Dashboard,
Kafka, AAS, and UNS remain out of this Golden Path.
