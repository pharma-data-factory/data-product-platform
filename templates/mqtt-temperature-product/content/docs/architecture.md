# Architecture

```text
MQTT broker  →  ingest  →  contract validation  →  SQLite store  →  REST API
                                      │
                                      └── quality endpoint / CI gate
```

The service is a standalone FastAPI application. It does not require the
Data Product Platform at runtime.

- MQTT ingestion is optional. An empty `MQTT_HOST` disables the subscriber.
- `POST /api/v1/temperatures` stores events without a broker.
- Ingest is idempotent on `eventId`.
- `GET /api/v1/quality` evaluates stored events against mandatory rules.
- Generic quality and compatibility helpers come from the vendored
  `dataprod` package. MQTT ingest and temperature rules stay in `app/`.

Catalog topology (when registered in Backstage):

- Unique API entity `${{ values.name }}--temperature-event`
- Human-readable title: Temperature Event Contract
- Logical contract: `temperature-event`
- Component `providesApis` points at that unique entity
- Consumers declare `consumesApis` for that same unique entity
