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
| Envelope adapter | Golden Path mapper in `data-products-backend` `/consume/query` → `QueryResult` |

## Query Envelope (Phase A)

`/consume/query` returns a stable **QueryResult** (`columns` + `rows` + `semanticType`) for dashboards.

Upstream JSON is mapped by template adapters (`mqtt-temperature`, `rest-equipment`, `oee`) or passed through when the body is already Envelope v1. Context filters (`site`, `area`, `line`, `equipment`) are forwarded as query parameters.

## Product Publish Bus (Phase B)

Opt-in MQTT **egress** is separate from Unified Namespace:

| Bus | Prefix | Role |
| --- | --- | --- |
| UNS | `uns/…` (or configured root) | OT ingress / plant truth |
| Product Publish Bus | `products/{domain}/{name}/{contract}/v{major}` | Product contract outputs |

Catalog annotations: `publish-enabled`, `publish-ports`, `publish-mqtt-topic`. Descriptor exposes `publish` + interface `direction: publish`. Runtime: `mqtt-producer` platform component / Golden Path `ProductPublishBus` (default **off**).

## Warehouse Sink (Phase C)

Analytics warehouses sit **behind** the Publish Bus, not as a second bus:

| Profile | Behavior (DEVELOPMENT) |
| --- | --- |
| `file` | JSONL under local staging dir |
| `snowflake` | Same JSONL + `CREATE_TABLE.sql` stub (no live connect) |
| `databricks` | Same JSONL + path / delta stub marker |

Catalog annotations: `publish-warehouse-profile`, `publish-warehouse-dataset` (dataset id `{domain}.{product}_{contract}_v{major}`). Runtime: `warehouse-sink` platform component (`WAREHOUSE_ENABLED`, default **off**). No Snowflake/Databricks SDK in this release.

## Packages

- `@internal/data-product-consumption` — types, descriptor, client, hooks, renderers, extension registry
- `@internal/plugin-data-products` — generic experience UI
- `@internal/plugin-data-products-backend` — `/consume/*` access layer

## Trust boundary

Browser → Backstage auth → permissions → consume backend → optional upstream base URL.
MQTT broker credentials never reach the browser.
