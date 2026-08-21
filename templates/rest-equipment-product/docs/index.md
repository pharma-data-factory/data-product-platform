# REST Equipment Data Product Template

Official Data Product Platform template for reusable equipment master data.

The generated repository fetches equipment records from a configurable REST
source (or a local mock ingest endpoint), validates them against a versioned
data contract (`contracts/equipment-event.schema.json`, version `1.0.0`),
stores them in SQLite with unique `equipmentId` upsert, and exposes a REST
API plus `GET /api/v1/quality`.

Generated artifacts include contract tests, data quality tests, compatibility
tests, Docker, GitHub Actions, TechDocs, and a `catalog-info.yaml` that
registers a Data Product Component with `providesApis: [equipment-event]`
and the `equipment-event` API entity.
