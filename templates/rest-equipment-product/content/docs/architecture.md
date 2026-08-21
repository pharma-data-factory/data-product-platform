# Architecture

```text
REST source or POST /api/v1/equipment
        → contract validation
        → SQLite upsert on equipmentId
        → REST API
              │
              └── quality endpoint / CI gate
```

The service is a standalone FastAPI application. It does not require the
Data Product Platform at runtime.

- Source fetch is optional. An empty `SOURCE_API_URL` disables it.
- `POST /api/v1/equipment` is the local mock ingestion path.
- The same `equipmentId` updates the stored record.
- `GET /api/v1/quality` evaluates stored records against mandatory rules.
- Generic quality and compatibility helpers come from the vendored
  `dataprod` package. REST source and equipment rules stay in `app/`.

Catalog topology (when registered in Backstage):

- Unique API entity `${{ values.name }}--equipment-event`
- Human-readable title: Equipment Event Contract
- Logical contract: `equipment-event`
- Component `providesApis` points at that unique entity
- Consumers declare `consumesApis` for that same unique entity
