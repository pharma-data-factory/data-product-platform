# MQTT Temperature Data Product Template

Official Data Product Platform template for a reusable temperature data product.

The generated repository ingests MQTT temperature events, validates them against
a versioned data contract (`contracts/temperature-event.schema.json`, version
`1.1.0`), stores recent readings in SQLite, and exposes a REST API plus
`GET /api/v1/quality`. Ingest is idempotent on `eventId`.

Generated artifacts include contract tests, data quality tests, Docker, a GitHub
Actions quality gate (lint → unit tests → contract tests → data quality tests →
compatibility tests → Docker build), TechDocs, and a `catalog-info.yaml` that
registers the result as a Data Product with `qualityStatus: TESTED` and
`providesApis: [temperature-event]`. Generated TechDocs include Overview,
Architecture, API, Data Contract, Quality Rules, Configuration, Local
Development, Deployment, and Release Notes.
