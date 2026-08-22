# OEE Loss & Microstop Management 1.1

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.1.0

Additive OEE domain capability in `templates/oee-data-product`. This is
**not** a new Golden Path and **not** a Wave 1 Platform Component.

`oee-result` 1.0.0 formulas stay frozen:

```text
OEE = Availability × Performance × Quality
```

Microstops remain Availability loss on that contract. Loss APIs classify
the same intervals for CI analysis (loss tree, Pareto, MTBF/MTTR).

## Scope

P0 and P1 from the Loss & Microstop feature:

- Equipment state capture and retrieval with duration
- Configurable microstop detection
- Configurable stop classification
- Hierarchical reason codes
- Automatic and manual reason assignment with audit fields
- Loss tree, Pareto, MTBF/MTTR
- Production context filters (line, order, batch, product, shift)
- OpenAPI via the generated FastAPI app
- Health / readiness unchanged

Out of scope: dashboards, Kafka, AI/anomaly detection, cross-line
benchmarking, GxP claims.

## Mapping

| Need | Implementation |
| --- | --- |
| Capture states | `POST /api/v1/equipment-states` plus existing MQTT ingest |
| Duration | Next event or optional `end` |
| Microstop thresholds | `MICROSTOP_MIN_SECONDS` / `MAX` and `PUT /api/v1/loss-config` |
| Reason hierarchy | `parentReasonCodeId` |
| Historical OEE + losses | `GET /api/v1/oee/{id}/history-with-losses` |

`PLANNED_STOP` is an ingest alias for `MAINTENANCE`. The 1.0 state enum
is not extended.
