# Data Contract

Canonical schema: `contracts/temperature-event.schema.json`

Version: `1.1.0`

The Software Catalog identity for this contract is the API entity
`temperature-event`. The authoritative version annotation is
`dataprod.platform/contract-version`.

```json
{
  "eventId": "evt-probe-1",
  "deviceId": "probe-1",
  "timestamp": "2026-08-16T17:00:00Z",
  "temperature": 21.5,
  "unit": "C"
}
```

Required fields:

- `eventId` — unique non-empty string, idempotent ingest key
- `deviceId` — non-empty string
- `timestamp` — ISO-8601 datetime
- `temperature` — number
- `unit` — `C` or `F`

A duplicate `eventId` does not create a second stored event.
Additional properties are rejected.
