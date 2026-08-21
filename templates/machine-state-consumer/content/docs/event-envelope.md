# Event Envelope

This product reuses the standard Unified Namespace envelope:

- `eventId` UUID
- timezone-aware `timestamp`
- `source` (site, area, line, equipment)
- `type` = `machine-state`
- `contract.name` / `contract.version`
- `payload` validated against `machine-state-event`

Do not invent a second envelope.
