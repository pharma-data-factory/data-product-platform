# Data Product Consumption Framework — Architecture

**Product validation status:** `NOT_VALIDATED` (unchanged)

## Logical architecture

```text
Backstage Frontend
        |
        v
Data Product Experience (/data-products/:name)
        |
        +-----------------------------+
        |                             |
        v                             v
Discovery Layer               Consumption SDK
(@internal/data-product-      (@internal/data-product-
 consumption descriptor)       consumption client/hooks)
        |                             |
        v                             v
Backstage Catalog         data-products-backend /consume/*
        |                             |
        +-------------+---------------+
                      |
                      v
                 Data Products (REST / SSE bridge)
                      |
          +-----------+-----------+
          |                       |
         REST                 Realtime (SSE/poll)
                             (MQTT stays server-side)
```

## Separation of concerns

| Concept | Representation |
| --- | --- |
| Data Product (business) | Catalog `Component` `spec.type: data-product` + annotations / optional `dataproduct.yaml` |
| Component (implementation) | Service / vendor components via `dependsOn` |
| API / Contract | Catalog `API` + contract schemas |
| Visualization extension | Registered platform extension id (e.g. `oee-dashboard`) |

## Packages

- `@internal/data-product-consumption` — types, descriptor, client, hooks, renderers, extension registry
- `@internal/plugin-data-products` — generic experience UI
- `@internal/plugin-data-products-backend` — `/consume/*` access layer

## Trust boundary

Browser → Backstage auth → permissions → consume backend → optional upstream base URL.
MQTT broker credentials never reach the browser.
