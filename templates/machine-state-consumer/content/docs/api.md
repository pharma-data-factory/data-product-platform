# API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/api/v1/events` | Broker-free UNS envelope ingest |
| GET | `/api/v1/machines` | Latest state per equipment |
| GET | `/api/v1/machines/{equipmentId}` | Latest state for one equipment |
| GET | `/api/v1/quality` | Standard quality report |
| GET | `/api/v1/platform-metadata` | Standard, SDK, template, contract versions |

POST returns `201` when a newer state is stored, `200` for duplicates or
out-of-order events, and `400` for malformed envelopes or payloads.
