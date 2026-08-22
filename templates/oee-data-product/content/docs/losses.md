# Loss & Microstop Management

OEE 1.1 additive APIs. **OEE 1.0 formulas are unchanged.** Short stops still
reduce Availability on `oee-result`. The loss APIs classify those same
intervals for analysis.

## Capture and duration

`POST /api/v1/equipment-states` accepts `RUNNING`, `STOPPED`, `IDLE`,
`MAINTENANCE`, and `PLANNED_STOP` (stored as `MAINTENANCE`). Supply `start`
or `timestamp`. Optional `end` closes the interval. Duration is
`end − start` from the next event when `end` is omitted.

`GET /api/v1/equipment-states?equipmentId=&from=&to=` returns closed
intervals.

MQTT / `POST /api/v1/ingest` still accept point `machine-state-event` 1.0.0
payloads.

## Microstops

Default: duration **3–60 seconds** on `STOPPED` → `MICROSTOP`.
Configure with `GET`/`PUT /api/v1/loss-config`. Thresholds may be global,
per equipment, or per equipment type. They are not hardcoded.

## Classification

`GET /api/v1/losses` classifies non-running intervals:

`MICROSTOP`, `UNPLANNED_DOWNTIME`, `PLANNED_DOWNTIME`, `CHANGEOVER`,
`IDLE_TIME`, `EQUIPMENT_FAILURE`, `MATERIAL_STARVATION`, `QUALITY_STOP`,
`UNKNOWN_STOP`.

Rules in `loss-config.rules` override the defaults.

## Reason codes

`GET`/`POST /api/v1/reason-codes` and `PATCH /api/v1/reason-codes/{id}`.
Codes have `parentReasonCodeId` for hierarchy, `active`, optional
equipment / equipment-type assignment, and `signals` for automatic mapping.

Automatic assignment records `assignmentSource: AUTOMATIC`.
`PATCH /api/v1/losses/{lossId}/reason` is manual. Original and previous
codes, user, and timestamp are retained. Automatic values are not silently
replaced.

Unmapped stops use reason `UNKNOWN`.

## Analysis

| Method | Path |
| --- | --- |
| GET | `/api/v1/loss-tree` |
| GET | `/api/v1/losses/pareto?rankBy=duration\|occurrences\|lostQuantity\|oeeImpact` |
| GET | `/api/v1/reliability/{equipmentId}` (MTBF / MTTR) |
| GET | `/api/v1/oee/{equipmentId}/history-with-losses` |

Filters: `from`, `to`, `window`, `equipmentId`, `line`, `orderId`,
`batchId`, `product` / `materialId`, `shiftId`, `site`, `area`, `recipeId`.

OpenAPI: `GET /openapi.json` and `/docs`.
