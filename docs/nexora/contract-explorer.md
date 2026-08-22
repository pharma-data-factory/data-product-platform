# Data Product & Contract Explorer

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Route: `/contracts`

## What it does

Adds industrial context around Data Products: producer equipment,
consumers, contract fields, compatibility, and a capability matrix.
OpenAPI / AsyncAPI / JSON Schema rendering stays in Catalog API Docs.

## How contracts are linked

Use standard `spec.providesApis` on the Data Product and an API entity
of type `openapi`, `asyncapi`, or `contract`. The explorer links to
`/catalog/default/api/<name>`.

## Capability metadata

Optional annotation `nexora.io/capabilities-api`. The mock provider
returns grouped levels:

```text
INCLUDED
FOUNDATION
PLANNED
```

Do not hardcode OEE fields in the plugin. Provide an adapter/payload
per Data Product.

## Producer / consumer relationships

- Producer: `nexora.io/equipment-id` or `spec.dependsOn` to equipment
- Consumers: other Components whose `dependsOn` points at the product

Compatibility is `COMPATIBLE`, `BREAKING_CHANGE`, or `UNKNOWN`. If no
provider exists, the UI says compatibility is unknown.
