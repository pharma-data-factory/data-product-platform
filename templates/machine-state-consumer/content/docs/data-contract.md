# Data Contract

Logical name: `machine-state-event`  
Version: `1.0.0`  
Schema: `contracts/machine-state-event.schema.json`

Payload:

- `state` required: `RUNNING`, `STOPPED`, `IDLE`, `MAINTENANCE`
- `reason` optional string or null

The Catalog API entity is `{product}--machine-state-event`.
