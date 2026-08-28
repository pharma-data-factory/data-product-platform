# Platform Unified Namespace Standard 1.0

**Owner:** Platform Team  
**Status:** PLATFORM STANDARD — VALIDATION STATUS `NOT_VALIDATED`  
**Audience:** Customers, Golden Path authors, Model Company (Customer Zero)  
**Related:** Existing DEVELOPMENT service in `uns/` (root `pharma`, domain/event) — see [Relationship](#relationship-to-existing-uns-service)

---

## Purpose

The Unified Namespace (UNS) is the **platform integration bus** for OT/IT signals and business context.

Model Company is the first **reference implementation**. Customers replace simulators with PLC, OPC UA, MES, SAP, EWM, historian, or SCADA **without changing downstream Data Product contracts**.

```text
Platform
│
├── UNS Standard  ← this document
├── Golden Paths
├── Data Products
└── Model Company  → consumes UNS Standard
```

---

## Semantic hierarchy (ISA-95 inspired)

Conceptual (not a certification claim):

```text
Enterprise → Site → Area → Line / Work Center → Equipment → Information Type
```

Business objects (orders, batches, materials, warehouse, quality) live under **site**, not under equipment.

---

## Topic pattern

Configurable root (default **`uns`**):

```text
{root}/{enterprise}/{site}/{area}/{line}/{equipment}/{informationType}
```

Site-level business objects:

```text
{root}/{enterprise}/{site}/orders/{orderId}/state
{root}/{enterprise}/{site}/batches/{batchId}/state
{root}/{enterprise}/{site}/materials/{materialId}/state
{root}/{enterprise}/{site}/warehouse/handling-units/{huId}/state
{root}/{enterprise}/{site}/quality/{objectId}/state
```

Details: [TOPIC-HIERARCHY.md](./TOPIC-HIERARCHY.md), [CONTRACTS.md](./CONTRACTS.md), [MQTT-QOS.md](./MQTT-QOS.md), [SECURITY.md](./SECURITY.md), [VERSIONING.md](./VERSIONING.md).

---

## State vs event

| Kind | Topics (examples) | Retained? |
| --- | --- | --- |
| **State** (current truth) | `…/state`, `…/telemetry`, `…/counts`, `…/temperature`, `…/availability` | MAY retain |
| **Event** (something happened) | `…/events/equipment-state-changed`, `…/events/microstop`, `…/events/breakdown` | MUST NOT retain |

---

## Envelope

Every MQTT payload uses a versioned envelope (`schemaVersion: "1.0"`). See [CONTRACTS.md](./CONTRACTS.md). JSON Schemas: `contracts/uns/`.

---

## Data quality

`GOOD` | `UNCERTAIN` | `BAD` | `STALE`

---

## Relationship to existing UNS service

| Aspect | Legacy `uns/` (DEVELOPMENT) | Platform UNS Standard 1.0 |
| --- | --- | --- |
| Default root | `pharma` | `uns` (configurable) |
| Hierarchy | site/area/line/equipment/**domain/event** | enterprise/site/area/line/equipment/**informationType** |
| Envelope | `contract.name` + nested `source` | Flat industrial envelope + `schemaVersion` |

New publishers (including Model Company) **MUST** follow Standard 1.0. Legacy service migration is a separate platform workstream.

---

## Validation boundary

UNS Standard: platform architecture artifact — **`NOT_VALIDATED`**.  
Model Company traffic: **synthetic / NON-GxP / out of Platform Core validation**.
