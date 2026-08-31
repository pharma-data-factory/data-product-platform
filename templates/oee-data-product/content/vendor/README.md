# Wave 1 Platform Components (CERTIFIED 1.0.0)

These packages are frozen snapshots of the Nexora Wave 1
libraries. They are not OEE domain code.

- `health` → `pdf-health` 1.0.0
- `observability` → `pdf-observability` 1.0.0
- `mqtt-consumer` → `pdf-mqtt-consumer` 1.0.0
- `rest-source` → `pdf-rest-source` 1.0.0
- `timeseries` → `pdf-timeseries` 1.0.0
- `rest-api` → `pdf-rest-api` 1.0.0

Canonical source: `platform-components/` in the Control Plane repository.
Do not change public APIs here to make OEE easier. Prefer an adapter in
`app/ingestion` or `app/store.py`.

The generated runtime installs these packages locally so it can ingest,
calculate, store, and serve without Backstage.
