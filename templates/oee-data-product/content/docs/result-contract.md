# Result Contract

`oee-result` 1.0.0. See `contracts/oee-result.schema.json`.

Required identity: `equipmentId` plus an explicit window
(`window.type`, `window.start`, `window.end`).

Supported `window.type` values: `HOUR`, `SHIFT`, `ORDER`, `CUSTOM`.

`calculationStatus`:

- `COMPLETE`
- `MISSING_PRODUCTION_CONTEXT`
- `MISSING_MACHINE_STATE`
- `MISSING_IDEAL_CYCLE`
- `MISSING_COUNTER_DATA`
- `MISSING_QUALITY_DATA`
- `INSUFFICIENT_OBSERVATION`

`oee` and the relevant component ratios are null when calculation cannot be
completed. Nested `context` and `inputSummary` are published when available.
MTBF/MTTR are not part of this contract.
