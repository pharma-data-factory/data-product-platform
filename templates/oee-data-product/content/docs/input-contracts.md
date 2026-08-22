# Input Contracts

Version 1.0.0:

- `production-context` — MES via REST Source (`batchId` / `productId` / `recipeId` optional)
- `machine-state-event` — `RUNNING`, `STOPPED`, `IDLE`, `MAINTENANCE`; optional `reasonCode` is diagnostic only
- `production-count-event` — cumulative `totalCount`
- `quality-count-event` — cumulative `goodCount` / `rejectCount`
- `counter-event` — combined cumulative counters on one MQTT message

OpenAPI and AsyncAPI live in `contracts/openapi.yaml` and `contracts/asyncapi.yaml`.
Capability lifecycle: `capabilities.yaml`.

OEE 1.1 additive:

- `loss-event` — classified stop interval
- `reason-code` — hierarchical reason catalog

Schemas live in `contracts/`.
