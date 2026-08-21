# OEE Contracts 1.0

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Versioned input and output contracts for OEE 1.0. No runtime ingest is
implemented here.

Compatibility uses the existing Data Product policy:
[compatibility-matrix.md](../compatibility-matrix.md),
[Compatibility](../engineering/compatibility.md),
[config/data-product-compatibility-policy.yaml](../../config/data-product-compatibility-policy.yaml).
Results remain `COMPATIBLE`, `BREAKING_CHANGE`, and `UNKNOWN`.

## Contract set

| Logical contract | Version | Role | Schema |
| --- | --- | --- | --- |
| `machine-state-event` | 1.0.0 | Reused | Existing UNS / Machine State Consumer schema |
| `production-count-event` | 1.0.0 | New | [schemas/production-count-event.schema.json](schemas/production-count-event.schema.json) |
| `quality-count-event` | 1.0.0 | New | [schemas/quality-count-event.schema.json](schemas/quality-count-event.schema.json) |
| `production-context` | 1.0.0 | New | [schemas/production-context.schema.json](schemas/production-context.schema.json) |
| `oee-result` | 1.0.0 | Output | [schemas/oee-result.schema.json](schemas/oee-result.schema.json) |

Do not create a second machine-state contract. OEE consumes
`machine-state-event` 1.0.0 as published by Unified Namespace and the
Machine State Consumer composition proof.

Demonstration UNS contracts `machine-state` and `production-cycle` are
**not** OEE 1.0 inputs.

## Layers

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  T[Transport envelope or REST body] --> P[Versioned payload]
  P --> N[Canonical OEE input record]
  N --> R[oee-result 1.0.0]

  class T,P teal
  class N,R navy
```

1. **Transport** — Mode A MQTT message or Mode B UNS envelope, or REST
   Source JSON for context.
2. **Payload** — JSON Schema named above.
3. **Canonical OEE record** — identity normalized for calculation.

Canonical record (not a separate published contract):

| Field | Source |
| --- | --- |
| `eventId` | Envelope `eventId`, or payload `eventId` when no envelope |
| `timestamp` | Envelope `timestamp` for `machine-state-event`; payload `timestamp` for count events |
| `equipmentId` | Envelope `source.equipment` for `machine-state-event`; payload `equipmentId` for new contracts |
| `site`, `area`, `line` | Envelope `source.*` or production context |

If envelope and payload both carry equipment identity, they must match.
Mismatch is a quality failure; the event is not used.

## machine-state-event 1.0.0 (reused)

Payload stays:

```json
{
  "state": "RUNNING",
  "reason": null
}
```

`state` enum: `RUNNING`, `STOPPED`, `IDLE`, `MAINTENANCE`.
`reason` optional string or null.

Identity and time come from the standard UNS envelope
([event envelope](../uns/event-envelope.md)) or an equivalent MQTT
Consumer mapping. Adding required payload fields would be
`BREAKING_CHANGE`. OEE 1.0 does not require that change.

Canonical files (do not duplicate):

- `uns/contracts/machine-state-event.schema.json`
- `templates/machine-state-consumer/content/contracts/machine-state-event.schema.json`

## production-count-event 1.0.0

```json
{
  "eventId": "8c1e0b2a-4d3f-4a1e-9c0b-1f2e3d4c5b6a",
  "equipmentId": "filler-01",
  "timestamp": "2026-08-21T08:15:00Z",
  "totalCount": 1000
}
```

### Count convention

**Cumulative** per `equipmentId`.

| Rule | Meaning |
| --- | --- |
| Canonical | Each event is the counter reading at `timestamp`, not a window delta |
| Window production | Difference between ordered readings, with reset handling |
| First reading in/before the window | Baseline, not production |
| Decrease | Count reset — see [Edge cases](edge-cases.md#count-resets) |

Delta payloads are not a 1.0 contract. A future optional `countMode`
field would be `COMPATIBLE` only if existing cumulative events remain
valid. Changing the default from cumulative to delta is
`BREAKING_CHANGE`.

`totalCount` is integer `>= 0`.

## quality-count-event 1.0.0

```json
{
  "eventId": "9d2f1c3b-5e40-4b2f-8d1c-2a3b4c5d6e7f",
  "equipmentId": "filler-01",
  "timestamp": "2026-08-21T08:15:00Z",
  "goodCount": 980,
  "rejectCount": 20
}
```

`goodCount` and `rejectCount` are cumulative integers `>= 0`.
Optional `totalCount` is cumulative and, when present, must satisfy
`goodCount <= totalCount` and `rejectCount <= totalCount`.
Window Quality uses `goodCount / (goodCount + rejectCount)` from the
quality stream when both fields exist after deltas.

`goodCount + rejectCount` should equal the production counter when both
streams are present.

### Quality reconciliation

| Situation | Rule |
| --- | --- |
| Quality and production events both present | Window `goodCount` / `rejectCount` from quality stream. Window `totalCount` from production stream. |
| Only quality events | `totalCount = goodCount + rejectCount` |
| Only production events | `totalCount` from production. `goodCount` / `rejectCount` unknown. Quality is `null`. |
| `goodCount + rejectCount` ≠ production `totalCount` | Use each stream as above. Set result `reconciliationStatus: COUNT_MISMATCH`. Still calculate Quality from quality counts: `goodCount / (goodCount + rejectCount)` when that sum `> 0`. |
| `goodCount > goodCount + rejectCount` | Impossible; reject the event |
| Negative or non-integer | Reject the event |

Quality events follow the same cumulative and reset rules as production
counts, independently per field.

## production-context 1.0.0

Document ingested by REST Source (GET), not a machine event.

```json
{
  "contextId": "ctx-1042-2026-08-21",
  "equipmentId": "filler-01",
  "orderId": "po-1042",
  "materialId": "sku-500ml",
  "plannedStart": "2026-08-21T06:00:00Z",
  "plannedEnd": "2026-08-21T14:00:00Z",
  "idealCycleTimeSeconds": 1.0,
  "targetQuantity": 28000,
  "timestamp": "2026-08-21T05:55:00Z",
  "site": "site-a",
  "area": "packaging",
  "line": "line-01",
  "shiftId": "shift-a",
  "plannedDowntime": [
    {
      "start": "2026-08-21T10:00:00Z",
      "end": "2026-08-21T10:15:00Z",
      "kind": "MAINTENANCE"
    }
  ]
}
```

Required: `contextId`, `equipmentId`, `plannedStart`, `plannedEnd`,
`idealCycleTimeSeconds`, `timestamp`.

Optional: `orderId`, `materialId`, `targetQuantity`, `site`, `area`,
`line`, `shiftId`, `plannedDowntime`.
`orderId` is required for the request when `windowKind` is `order`.

Source responsibility: typically **MES via REST Source**. The adapter
maps MES JSON onto these domain names. Do not name fields `AUFNR`,
`MATNR`, `ARBPL`, or other ERP/MES identifiers.

`plannedEnd` must be after `plannedStart`. `idealCycleTimeSeconds` must
be `> 0`. `targetQuantity` is not used in 1.0 formulas.

## oee-result 1.0.0

```json
{
  "contract": {
    "name": "oee-result",
    "version": "1.0.0"
  },
  "equipmentId": "filler-01",
  "windowKind": "custom",
  "windowStart": "2026-08-21T08:00:00Z",
  "windowEnd": "2026-08-21T09:00:00Z",
  "orderId": "po-1042",
  "availability": 0.9167,
  "performance": 1.0,
  "quality": 1.0,
  "oee": 0.9167,
  "totalCount": 3300,
  "goodCount": 3300,
  "rejectCount": 0,
  "runtimeSeconds": 3300,
  "downtimeSeconds": 300,
  "plannedProductionSeconds": 3600,
  "idealCycleTimeSeconds": 1.0,
  "completeness": "COMPLETE",
  "calculationStatus": "VALID",
  "reconciliationStatus": "ALIGNED",
  "calculatedAt": "2026-08-21T09:00:05Z"
}
```

Nullable numeric fields use JSON `null` when a guard applies
([Domain model](domain-model.md#formulas)).

`windowKind`: `shift` | `hour` | `day` | `order` | `custom`.

`completeness`: `COMPLETE` | `PARTIAL` | `INCOMPLETE` (input coverage).

`calculationStatus`: `VALID` | `INCOMPLETE` | `INVALID_INPUT` |
`NO_PRODUCTION` | `PENDING_LATE_DATA`. See [Quality](quality.md).

`reconciliationStatus`: `ALIGNED` | `COUNT_MISMATCH` | `COUNTS_UNAVAILABLE`.

## Compatibility (existing policy)

Do not change policy semantics. Applied to OEE contracts:

| Change | Result |
| --- | --- |
| New optional property (example: `shiftId` on context) | `COMPATIBLE` |
| New required property | `BREAKING_CHANGE` |
| Removed required property | `BREAKING_CHANGE` |
| Field type change | `BREAKING_CHANGE` |
| Same-major version bump `1.0.0` → `1.1.0` | `COMPATIBLE` |
| Major version `1.x` → `2.0.0` | `BREAKING_CHANGE` |
| Add optional state to `machine-state-event` enum | `BREAKING_CHANGE` if existing consumers use a closed enum (type / allowed-values change) |
| Reuse `machine-state-event` 1.0.0 unchanged | `COMPATIBLE` |
| Switch count convention cumulative → delta | `BREAKING_CHANGE` |
| Cap Performance at 1.0 after publishing uncapped 1.0.0 | `BREAKING_CHANGE` for consumers of `oee-result` |
| Add optional `oee-result` diagnostic field | `COMPATIBLE` |

Closed enum extension is treated as an incompatible allowed-value change
for OEE 1.0 planning. Prefer optional context flags over new states.
