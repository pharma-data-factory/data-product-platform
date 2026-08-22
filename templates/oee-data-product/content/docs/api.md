# API

| Method | Path |
| --- | --- |
| GET | `/health` |
| GET | `/health/ready` |
| GET | `/api/v1/oee` |
| GET | `/api/v1/oee/{equipmentId}` |
| GET | `/api/v1/oee/{equipmentId}/current` |
| GET | `/api/v1/oee/{equipmentId}/history` |
| GET | `/api/v1/oee/{equipmentId}/history-with-losses` |
| POST | `/api/v1/equipment-states` |
| GET | `/api/v1/equipment-states` |
| GET | `/api/v1/losses` |
| PATCH | `/api/v1/losses/{lossId}/reason` |
| GET | `/api/v1/reason-codes` |
| POST | `/api/v1/reason-codes` |
| GET | `/api/v1/reason-codes/{reasonCodeId}` |
| PATCH | `/api/v1/reason-codes/{reasonCodeId}` |
| GET | `/api/v1/loss-config` |
| PUT | `/api/v1/loss-config` |
| GET | `/api/v1/loss-tree` |
| GET | `/api/v1/losses/pareto` |
| GET | `/api/v1/reliability/{equipmentId}` |
| GET | `/api/v1/capabilities` |
| GET | `/api/v1/quality` |
| GET | `/api/v1/platform-metadata` |

Query: `from`/`start`, `to`/`end`, `window`/`windowType`, `orderId`, `line`,
`batchId`, `product`, `materialId`, `shiftId`, `site`, `area`, `recipeId`.

`POST /api/v1/ingest` is a local simulator helper. It is not a plant interface.
`oee: null` with a `MISSING_*` or `INSUFFICIENT_OBSERVATION` status means the
calculation was not completed. `COMPLETE` may still publish `oee: 0` when
Quality is observed as zero (all rejects).

OpenAPI: `contracts/openapi.yaml`, also served at `/docs` and `/openapi.json`.
AsyncAPI: `contracts/asyncapi.yaml`.

Loss and reason-code APIs are OEE 1.1 additive. They do not change
`oee-result` 1.0.0. See [Loss Management](losses.md).
