# Equipment Use Log composition example

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

**DOCUMENTATION / DESIGN EXAMPLE ONLY.**

This is a **platform reuse proof**. It is not a product, not a Golden
Path, and not a runtime. It is not AVAILABLE, CERTIFIED, or RELEASED.

Composer 1.0 at `/compose` can load this example, validate it, and
export YAML. It does **not** generate Equipment Use Log code.

## Use case

A pharmaceutical manufacturing organization needs an Equipment Use Log
that records equipment usage events and publishes them as a governed
Data Product.

Illustrative events (not plant-specific rules):

- equipment started / stopped
- equipment used for a production order
- cleaning started / completed
- maintenance event
- equipment status change

## Derived component selection

This composition is **not** a copy of OEE Mode A. Selection follows
actual Wave 1 capabilities and `dependsOn` metadata.

### REQUIRED

| Component | Why |
| --- | --- |
| MQTT Consumer | Shop-floor start/stop/status events are event ingest. This is the CERTIFIED MQTT runtime. Kafka cannot be selected (catalog-only, no runtime). |
| REST API | The Data Product is consumed as a governed HTTP API. Domain routes stay on the host. |
| Health | REST API and MQTT Consumer declare `dependsOn` Health. Liveness/readiness convention. |
| Observability | REST API and MQTT Consumer declare `dependsOn` Observability. Structured logs and correlation. |

### OPTIONAL

| Component | Why it is optional |
| --- | --- |
| REST Source | Needed only when MES/order/cleaning/maintenance context is pulled from a governed REST API. Not required if the log is MQTT-only. |
| Time-Series Storage | Needed only to persist generic status/duration **points**. Usage sessions, reason codes, and operator/equipment relationships are domain records and must not be forced into the time-series point schema. PostgreSQL is catalog-only, so it cannot be selected as the session store. |

### NOT CURRENTLY REQUIRED

| Component | Why |
| --- | --- |
| Kafka Consumer / Producer | Catalog-only. No reusable runtime. |
| PostgreSQL / Object Storage | Catalog-only. No reusable runtime. |
| Audit | Catalog-only. No GxP audit-trail claim. |
| AAS Foundation | DEVELOPMENT. Asset meaning is not required to record usage events. |
| Unified Namespace | DEVELOPMENT. MQTT Consumer is sufficient for a design-first ingest. UNS topic governance is optional later. |
| RAG / KG / AI | PLANNED. Not selectable. |

## Canonical composition YAML

`kind: GoldenPathComposition` remains the only format. Required
components only:

```yaml
apiVersion: dataprod.platform/v1alpha1
kind: GoldenPathComposition

metadata:
  name: equipment-use-log
  title: Equipment Use Log (design example)
  description: >
    DOCUMENTATION / DESIGN EXAMPLE ONLY. No Equipment Use Log runtime
    exists. Developers implement the usage-session domain model and reuse
    Wave 1 Platform Components. REST Source and Time-Series Storage are
    OPTIONAL and are not in this required composition.

spec:
  standardVersion: 1.0.0
  components:
    - ref: component:default/health
      version: "1.x"
    - ref: component:default/observability
      version: "1.x"
    - ref: component:default/mqtt-consumer
      version: "1.x"
    - ref: component:default/rest-api
      version: "1.x"
```

Source of truth for this example: the TypeScript constant
`EQUIPMENT_USE_LOG_COMPOSITION_YAML`, kept in lockstep with this page.
Catalog remains the source of truth for registered components. This YAML
is the version-controlled composition. No second metadata database.

## Domain logic boundary

Platform Components do **not** provide:

- EquipmentUseEvent
- EquipmentStatus (as a usage-session concept)
- UsageSession
- ProductionOrderReference
- CleaningReference
- MaintenanceReference
- duration / reason codes / operator relationships

Those belong in the future Data Product repository.

## Contract design preview

Inspected existing contracts first.

| Existing contract | Reuse? |
| --- | --- |
| `equipment-event` (REST Equipment) | **Do not reuse.** Master-data upsert (`equipmentId`, site, ACTIVE/INACTIVE/MAINTENANCE). Not a usage session. |
| `equipment-status` (UNS payload) | **Do not reuse as the product contract.** Status `ok/warning/fault` plus alarm. Related to status change, not to usage sessions. |
| `machine-state-event` (OEE / UNS) | **Do not reuse.** OEE machine-state semantics, not Equipment Use Log. |

Proposed **DESIGN / NOT IMPLEMENTED** contracts (do not add schema files yet):

- `equipment-use-event` — started, stopped, production-use, cleaning, maintenance
- `equipment-use-log-entry` — session, duration, reason, operator/equipment
- `equipment-status-event` — usage-oriented status change; do not duplicate `equipment-event` master status

## Architecture (from selected required components)

```
Machine / MES (outside Catalog)
        │
        ▼
   MQTT Consumer
        │
        ▼
   DOMAIN LOGIC
   Equipment Use Log
        │
        ▼
     REST API

Health + Observability are cross-cutting (dependsOn).
REST Source and Time-Series appear only if the developer selects them.
```

The Composer graph is generated from the current selection. It is not a
hard-coded fake topology.

## Golden Path recommendation

Would Equipment Use Log likely be:

- **A.** one customer-specific Data Product
- **B.** reusable reference architecture
- **C.** recurring standardized product pattern

**Recommendation: B now. Do not create a Golden Path.**

Only **C** should normally justify a Golden Path. There is no runtime,
no second customer, and no certification record. After at least one
independent implementation exists and the pattern repeats, re-evaluate
for C.

## Developer journey (Route B)

1. Browse Platform Components
2. Composer → load Equipment Use Log DESIGN EXAMPLE
3. Inspect status, compatibility, dependencies
4. Validate (`validateComposition()`)
5. Export `composition.yaml`
6. Implement **only** Equipment Use Log domain logic in a future repo
7. Later decide whether the pattern deserves a Golden Path

Route A (Marketplace → Golden Path → Create) remains MQTT Temperature,
REST Equipment, and OEE.
