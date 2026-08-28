# UNS Readiness Assessment

**Assessment date:** 2026-08-23  
**Product validation status (unchanged):** `NOT_VALIDATED`  
**Scope:** Platform Unified Namespace standard + Model Company as Customer Zero reference

---

## Classification

**`READY_WITH_CONDITIONS`**

---

## What already exists

| Asset | Location | Status |
| --- | --- | --- |
| UNS platform component (DEVELOPMENT) | `uns/` | Topic parser, envelope, registry, Mosquitto, QoS 1 |
| UNS docs (v1.0 Mode A) | `docs/uns/*` | Root default `pharma`; segments site/area/line/equipment/domain/event |
| MQTT Temperature GP | `templates/mqtt-temperature-product` | Topic string configurable; flat `temperature-event` schema |
| OEE GP | `templates/oee-data-product` | Topics remappable; closed state enum; counter schema |
| REST Equipment GP | `templates/rest-equipment-product` | REST only — not MQTT/UNS |
| Model Company v0.1 | `model-company/`, `plugins/model-company*` | Proprietary `model-company/{site}/{line}/{equipment}/…` topics |

---

## Golden Path UNS compatibility

| Golden Path | Classification | Notes |
| --- | --- | --- |
| MQTT Temperature | `REQUIRES_EXTENSION` | No UNS hierarchy Create params; payload `extra=forbid` rejects UNS envelope |
| OEE Data Product | `UNS_COMPATIBLE_WITH_CONFIG` for **topics**; `REQUIRES_EXTENSION` for **state vocabulary / counts contract** | Topics remappable; states `DOWN`/`MICROSTOP`/`BREAKDOWN` not in OEE 1.0 enum without mapping |
| REST Equipment | `NOT_COMPATIBLE` (MQTT/UNS) | Remains REST master-data path |
| Existing `uns/` service | `UNS_NATIVE` (itself) | Hierarchy differs from ISA-95 enterprise pattern requested for Model Company |

---

## Conditions (non-blocking for Model Company UNS v0.1)

1. Introduce **Platform UNS Standard 1.0** with configurable root (default `uns`) and ISA-95-inspired hierarchy including **enterprise** and **informationType** — without claiming ISA-95 certification.
2. Model Company must **migrate publishers** from `model-company/…` to UNS topics; do not keep a parallel demo namespace as the primary path.
3. Do **not** fork OEE/Temperature logic inside Model Company. Gaps → `CUSTOMER_COMPONENT_GAP`.
4. Existing `uns/` DEVELOPMENT service (root `pharma`, domain/event) remains until a later migration; Standard 1.0 docs must state the relationship.
5. Live E2E OEE/Temperature against scaffolded GP instances requires operator wiring → documented as P0/P1 Customer Zero findings.

---

## Blockers

**None** for implementing Platform UNS Standard 1.0 + Model Company as first consumer.

---

## Decision

| Item | Result |
| --- | --- |
| Proceed | **YES** |
| Classification | **`READY_WITH_CONDITIONS`** |
| Change `NOT_VALIDATED` | **NO** |
