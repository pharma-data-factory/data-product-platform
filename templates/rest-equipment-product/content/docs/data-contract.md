# Data Contract

Canonical schema: `contracts/equipment-event.schema.json`

Version: `1.0.0`

The Software Catalog identity for this contract is the API entity
`equipment-event`. The authoritative version annotation is
`dataprod.platform/contract-version`.

```json
{
  "equipmentId": "EQ-1001",
  "name": "Bioreactor 01",
  "site": "SITE-A",
  "status": "ACTIVE",
  "updatedAt": "2026-08-17T06:30:00Z"
}
```

Required fields:

- `equipmentId` — unique non-empty string, upsert key
- `name` — non-empty string
- `site` — non-empty string
- `status` — `ACTIVE`, `INACTIVE`, or `MAINTENANCE`
- `updatedAt` — ISO-8601 datetime

Repeated ingestion of the same `equipmentId` updates the stored record.
Additional properties are rejected.
