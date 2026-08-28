# Integration

## REST (Backstage backend plugin)

Base path: `/api/model-company`

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/health` | unauthenticated |
| GET | `/sites` | `modelCompany.read` |
| GET | `/lines` | `modelCompany.read` |
| GET | `/equipment` | `modelCompany.read` |
| GET | `/orders` | `modelCompany.read` |
| GET | `/warehouse` | `modelCompany.read` |
| GET | `/scenarios` | `modelCompany.read` |
| GET | `/events` | `modelCompany.read` |
| GET | `/overview` | `modelCompany.read` |
| GET | `/data-products` | `modelCompany.read` |
| GET | `/traceability/:equipmentId` | `modelCompany.read` |
| POST | `/simulation/start` | `modelCompany.control` |
| POST | `/simulation/stop` | `modelCompany.control` |
| POST | `/simulation/reset` | `modelCompany.control` |
| POST | `/scenarios/run` | `modelCompany.runScenario` |

## MQTT topics

```text
model-company/{site}/{line}/{equipment}/telemetry
model-company/{site}/{line}/{equipment}/state
model-company/{site}/orders
model-company/{site}/warehouse
```

Published by the **Model Company runtime** when Compose is running.  
The Backstage plugin also buffers equivalent events for UI/API when the embedded engine ticks.

## Binding Golden Paths (customer steps)

### MQTT Temperature

1. Scaffold `mqtt-temperature-data-product`
2. Set `mqttTopic` to e.g. `model-company/MODEL-PHARMA-01/+/+/telemetry` (or equipment-specific)
3. Point broker env at Model Company Mosquitto

### REST Equipment

1. Scaffold `rest-equipment-data-product`
2. Set `SOURCE_API_URL` to Control Plane or runtime equipment list endpoint (customer adapter may map fields)

### OEE

1. Scaffold `oee-data-product`
2. Align MQTT topics with Model Company `state` / count events (or use a bridge)
3. Point production context URL at MES Simulator endpoint when runtime is up

## Traceability example

```text
BOTTLE-FILLER-01
        ↓
Equipment Simulator
        ↓
MQTT (model-company/.../state)
        ↓
Equipment Connector / MQTT ingest (Golden Path)
        ↓
OEE Data Product
        ↓
OEE API
```

## Config keys (`app-config.yaml`)

```yaml
modelCompany:
  factoryPath: model-company/factories/model-pharma.yaml
  runtimeStorePath: .runtime/model-company/state.json
  eventsPath: .runtime/model-company/events.jsonl
  runtimeBaseUrl: http://127.0.0.1:18091   # optional
```
