# UNS Contracts 1.0

Schemas live under `contracts/uns/` (platform, not Model-Company-only).

| Schema file | Topic informationType | Kind |
| --- | --- | --- |
| `envelope-v1.schema.json` | (wrapper) | all |
| `equipment-state-v1.schema.json` | `state` | state |
| `equipment-telemetry-v1.schema.json` | `telemetry` | state |
| `equipment-counts-v1.schema.json` | `counts` | state |
| `equipment-availability-v1.schema.json` | `availability` | state |
| `temperature-v1.schema.json` | `temperature` | state |
| `production-order-v1.schema.json` | orders `…/state` | state |
| `batch-v1.schema.json` | batches `…/state` | state |
| `handling-unit-v1.schema.json` | warehouse HU `…/state` | state |
| `equipment-event-v1.schema.json` | `events/*` | event |

## Canonical envelope fields

```json
{
  "schemaVersion": "1.0",
  "eventId": "EVT-…",
  "timestamp": "2026-08-23T10:32:14.123Z",
  "sourceSystem": "model-factory",
  "enterpriseId": "model-pharma",
  "siteId": "MODEL-PHARMA-01",
  "areaId": "PACKAGING",
  "lineId": "PKG-L01",
  "equipmentId": "BOTTLE-FILLER-01",
  "orderId": "PO-10004567",
  "batchId": "B26082301",
  "dataQuality": "GOOD",
  "payload": {}
}
```

Nullable when semantically inappropriate (e.g. warehouse HU may omit `lineId`).

## Equipment states

`OFF` `IDLE` `SETUP` `RUNNING` `MICROSTOP` `STOPPED` `BREAKDOWN` `MATERIAL_STARVED` `QUALITY_HOLD` `MAINTENANCE` `CHANGEOVER`

## Counters

Enforce `totalCount = goodCount + rejectCount`. Counters must not decrease within a production execution unless an explicit reset is modeled.

## Deviation from Golden Path schemas

| Consumer | Gap |
| --- | --- |
| OEE 1.0 `machine-state-event` | Closed enum `RUNNING\|STOPPED\|IDLE\|MAINTENANCE` — UNS extended states require GP extension or adapter (**CUSTOMER_COMPONENT_GAP**) |
| MQTT Temperature `temperature-event` | Flat `deviceId`/`temperature`/`unit` with `additionalProperties: false` — cannot ingest UNS envelope without extension |

Do not silently reshape payloads to fake compatibility inside Model Company.
