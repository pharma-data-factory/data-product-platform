# UNS Topic Hierarchy 1.0

## Equipment path

```text
{root}/{enterprise}/{site}/{area}/{line}/{equipment}/{informationType}
```

| Segment | Rules | Example |
| --- | --- | --- |
| root | Configurable; default `uns` | `uns` |
| enterprise | lowercase kebab or stable id | `model-pharma` |
| site | UPPERCASE ids allowed for plant codes | `MODEL-PHARMA-01` |
| area | lowercase kebab preferred in topics | `packaging` |
| line | plant line id | `PKG-L01` |
| equipment | asset id | `BOTTLE-FILLER-01` |
| informationType | see below | `state` |

### Area slug mapping

Factory YAML area ids (`PACKAGING`, `SOLID-DOSE`, `FILL-FINISH`) map to topic slugs:

| Factory area id | Topic slug |
| --- | --- |
| SOLID-DOSE | `manufacturing` |
| PACKAGING | `packaging` |
| FILL-FINISH | `fill-finish` |

### Information types (equipment)

| Type | Semantics | Class |
| --- | --- | --- |
| `availability` | ONLINE / OFFLINE / DEGRADED | state |
| `state` | equipment operating state | state |
| `telemetry` | speed, targets, sensors | state |
| `counts` | cumulative counters | state |
| `temperature` | temperature reading | state |
| `events/{name}` | discrete occurrences | event |

## Site business paths

```text
{root}/{enterprise}/{site}/orders/{orderId}/state
{root}/{enterprise}/{site}/batches/{batchId}/state
{root}/{enterprise}/{site}/materials/{materialId}/state
{root}/{enterprise}/{site}/warehouse/handling-units/{huId}/state
{root}/{enterprise}/{site}/quality/{objectId}/state
```

## Examples

```text
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/state
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/telemetry
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/counts
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/temperature
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/availability
uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/events/breakdown
uns/model-pharma/MODEL-PHARMA-01/orders/PO-10004567/state
uns/model-pharma/MODEL-PHARMA-01/warehouse/handling-units/HU-900001/state
```

## Casing

- Topic segments: no spaces; prefer stable plant identifiers as-is for site/line/equipment.
- Area and informationType: lowercase kebab-case.
- Do not encode secrets or PII in topic names.
