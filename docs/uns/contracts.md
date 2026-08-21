# UNS Contracts

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

UNS reuses Pharma Data Factory contract conventions. Topic metadata
lives in `uns/contracts/registry.yaml`. JSON Schemas live beside it.
Catalog API entities use `{component}--{contract}`.

Demonstration contracts:

| Contract | Topic domain | Notes |
| --- | --- | --- |
| production-cycle | production | Sample only |
| machine-state | production | Sample only |
| temperature-value | temperature | Not the MQTT Temperature Golden Path |
| equipment-status | equipment | Not the REST Equipment Golden Path |

Do not duplicate contract fields onto the component beyond Catalog API
relations and `dataprod.platform/dataContract` on the API entity.
