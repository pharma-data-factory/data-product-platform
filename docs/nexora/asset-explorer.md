# Asset & Equipment Explorer

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Route: `/equipment`

## What it does

Shows shopfloor equipment from the Catalog as Site → Area → Line →
Equipment. One plugin covers fillers, dispensers, mixers, tanks, and
other generic equipment. It is not an EAM, MES, or SCADA system.

## Required catalog metadata

```yaml
kind: Component
spec:
  type: equipment
metadata:
  annotations:
    nexora.io/equipment-id: filler-01
    nexora.io/site: basel
    nexora.io/area: packaging
    nexora.io/line: line-04
    nexora.io/equipment-type: filler
```

Link Data Products with `spec.dependsOn` and interface Resources the same
way. Do not duplicate those relationships as free-text lists.

## Optional integrations

| Annotation | Purpose |
| --- | --- |
| `nexora.io/metrics-api` | Generic metric cards |
| `nexora.io/equipment-state-api` | RUNNING / STOPPED / IDLE / MAINTENANCE |
| `nexora.io/connectivity-api` | MQTT / REST / OPC UA status |

Missing providers render an empty integration state. They do not crash
the page.

## Example

See `catalog/samples/industrial.yaml` for `filler-01` and `dispenser-01`.
