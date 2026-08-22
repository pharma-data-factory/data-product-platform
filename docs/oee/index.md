# OEE Domain & Contract Design 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.1.0  
Status: **CERTIFIED** (technical platform status only, not GxP)

Canonical OEE domain, contracts, and Golden Path. The generated OEE Data
Product runtime lives in `templates/oee-data-product`. Hub Marketplace
status: available for Create.

| Dimension | OEE 1.0 |
| --- | --- |
| Implementation | CERTIFIED |
| Release | RELEASED |
| Commercial | FUTURE |
| Validation | NOT VALIDATED (not GxP) |

CERTIFIED is not GxP validation. FUTURE commercial status does not mean
OEE is missing technically.

Wave 1 Platform Components remain the building blocks. Existing Golden
Paths (MQTT Temperature, REST Equipment) are unchanged. Unified Namespace
and AAS are optional.

| Document | Contents |
| --- | --- |
| [Golden Path design](golden-path-design.md) | Mode A architecture, pack map |
| [Domain model](domain-model.md) | Concepts, formulas, units |
| [Contracts](contracts.md) | Input/output contracts, compatibility |
| [Calculation](calculation.md) | Pipeline and deterministic tests |
| [Time windows](time-windows.md) | Shift, hour, day, order, custom |
| [Quality](quality.md) | Checks and calculationStatus |
| [Edge cases](edge-cases.md) | Missing data, resets, late events |
| [Edge-case matrix](edge-case-matrix.md) | Behavior × API × logs |
| [API](api.md) | REST surface |
| [Storage](storage.md) | SQLite pilot, upgrade seam |
| [Source mapping](source-mapping.md) | Adapters, AAS, UNS |
| [Create and configuration](create-and-config.md) | Create UX, secrets, layout |
| [Composition](composition.md) | Platform Components and Catalog |
| [Pilot limitations](pilot-limitations.md) | Explicit non-claims |
| [Pilot integration proof](pilot-integration.md) | Generated product + Test MES + MQTT broker |
| [Wave 1 vendoring assessment](pilot-vendoring.md) | Copies vs registry; no distribution implemented |
| [Decisions](decisions.md) | Product questions |
| [Definition of Done](definition-of-done.md) | Implementation gate |
| [MVP boundary](mvp-boundary.md) | Approved pilot constraints |
| [Loss management](losses.md) | OEE 1.1 microstops, reasons, loss APIs |

Do not implement from this pack:

- OEE dashboard / BI frontend
- Kafka infrastructure, RAG, AI, Knowledge Graph, SaaS
