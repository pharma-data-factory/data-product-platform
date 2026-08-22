# OEE Data Product 1.0

Product: **OEE Data Product**  
Version: **1.0**  
Equipment: `${{ values.equipmentId }}`  
Site / area / line: `${{ values.site }}` / `${{ values.area }}` / `${{ values.line }}`

## What it is

For one named equipment asset and one explicit time window, how effectively
did the equipment convert planned production time into good output at the
intended production rate?

Every result is tied to:

```text
equipmentId + explicit calculation interval
```

Supported interval types: `HOUR`, `SHIFT`, `ORDER`, `CUSTOM`.

## Formula

The Golden Path owns the standard formula. Create does not ask developers to
design OEE math.

```text
Availability = runtime / planned production time
Performance  = ideal cycle time × total count / runtime
Quality      = good count / total count
OEE          = Availability × Performance × Quality
```

Performance is not capped at 100%. Missing inputs are never estimated and
never silently defaulted to 0 or 1. Failed calculations publish `oee: null`
and an explicit `calculationStatus`.

## Inputs

```text
REST production context
MQTT machine state
MQTT counters / quality counts
```

Production context is read through a governed REST interface. Machine state
and counters arrive as MQTT events and are aggregated for the requested
interval.

MES remains **System of Record**. This product does not access MES, ERP,
LIMS, EWM, or Historian databases directly.

## Output

Versioned `oee-result` 1.0 REST contract (`GET /api/v1/oee`) with nullable
A/P/Q/OEE, `calculationStatus`, optional context, and `inputSummary`.

## Non-goals

- No plant-level OEE aggregation
- No OEE dashboard or operator UI
- No Six Big Losses implementation
- No SMED / separate changeover formula
- No MTBF / MTTR fields on `oee-result`
- No GxP disposition
- No direct core-system database access

## Certification wording

`CERTIFIED` means the Golden Path is technically complete according to
platform standards. It does **not** mean GxP validated.

## Capability lifecycle

See `capabilities.yaml`. Included in 1.0: quality loss via the Quality
formula. Foundation contracts exist for stop classification, diagnostic
reason codes, unobserved time, speed loss, changeover type metadata, and
context. Planned items (microstops, reason hierarchy, Pareto, MTBF/MTTR,
and related analytics) are not Create options and are not added to
`oee-result`.
