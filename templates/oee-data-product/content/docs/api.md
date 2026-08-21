# API

| Method | Path |
| --- | --- |
| GET | `/health` |
| GET | `/health/ready` |
| GET | `/api/v1/oee` |
| GET | `/api/v1/oee/{equipmentId}` |
| GET | `/api/v1/oee/{equipmentId}/current` |
| GET | `/api/v1/oee/{equipmentId}/history` |
| GET | `/api/v1/quality` |
| GET | `/api/v1/platform-metadata` |

Query: `from`, `to`, `window`, `orderId`.

`POST /api/v1/ingest` is a local simulator helper. It is not a plant interface.
`oee: 0` with `calculationStatus: VALID` or `NO_PRODUCTION` is not the same as
`oee: null` with `INCOMPLETE`.
