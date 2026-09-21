# OEE MVP boundary

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.1.0

Historical design boundary for OEE 1.0. The Golden Path is implemented
in `templates/oee-data-product`. **Do not change OEE formulas** from this
page. **Do not implement OEE** dashboards, Kafka, RAG, or GxP from this
page.

Technical status: **CERTIFIED / RELEASED**. Commercial availability:
**FUTURE**. Validation: **NOT VALIDATED**.

Official Golden Paths are MQTT Temperature, REST Equipment, and OEE.
See [MVP 1.0 baseline](../mvp-1.0-baseline.md).

## Verdicts used by the gate

- Ingestion: **Mode A** — certified MQTT Consumer plus REST Source
- Storage: **SQLITE_ACCEPTABLE_FOR_OEE_PILOT** (single instance, low volume)
- Unified Namespace: **UNS_OPTIONAL_FOR_OEE_PILOT**
- AAS Foundation: **AAS_OPTIONAL_FOR_OEE_PILOT**

OEE consumes machine events through the certified MQTT Consumer
directly. Do not couple OEE 1.0 to UNS or AAS.

## Conceptual flow

```text
Machine / MES
      ↓
MQTT Consumer and/or REST Source
      ↓
validated production events
      ↓
OEE domain logic (Data Product code, not a Platform Component)
      ↓
Time-Series Storage
      ↓
REST API
      ↓
OEE consumer / dashboard (post-MVP)
```

Formulas stay in the generated Data Product:

```text
Availability
Performance
Quality
OEE = Availability × Performance × Quality
```

## Required CERTIFIED components

Pin ranges, not unversioned names:

| Component | Range |
| --- | --- |
| Health | 1.x |
| Observability | 1.x |
| MQTT Consumer | 1.x |
| REST Source | 1.x |
| Time-Series Storage | 1.x |
| REST API | 1.x |

Validated manifest: `catalog/artifacts/nexora/oee-data-product-direct.yaml`.

Optional, not in the MVP 1.0 manifest:

| Component | Range | Why optional |
| --- | --- | --- |
| Unified Namespace | 1.x | Event distribution / topic governance later (Mode B) |
| AAS Foundation | 1.x | Equipment semantics later |

Do not include Kafka, RAG, LLM, Knowledge Graph, billing, or SaaS.

## Minimum contracts

See [Contracts](contracts.md).

| Contract | Needed for | Typical source |
| --- | --- | --- |
| `machine-state-event` | Availability (runtime / downtime) | PLC / machine via MQTT |
| `production-count-event` | Performance (actual count) | PLC / machine via MQTT |
| `quality-count-event` | Quality (good / reject / total) | PLC / machine or quality station via MQTT or REST |
| `production-context` | Planned time, ideal cycle time, order window | MES via REST |

Do not assume every plant has identical sources. Map at composition time.

## Keep core systems standard

OEE must not require:

- custom MES database access
- direct ERP database access
- LIMS database access
- EWM database access

Prefer governed REST APIs, MQTT events, and files/streams where a plant
already exposes them. REST Source stays a generic GET. MQTT Consumer
stays a generic subscribe.

## Outside this boundary (post-MVP)

- OEE dashboard / BI frontend
- Kafka, RAG, AI, Knowledge Graph, SaaS
- plant shift calendar
- GxP validation
- commercial OEE SKU (remains FUTURE until product decides otherwise)

OEE 1.1 Loss & Microstop APIs live in the generated Data Product. They
do not expand this Wave 1 composition and do not change OEE 1.0 formulas.
See [Loss management](losses.md).
