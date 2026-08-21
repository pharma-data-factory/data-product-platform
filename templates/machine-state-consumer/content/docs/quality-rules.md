# Quality Rules

`GET /api/v1/quality` uses the shared Data Product quality report:

- valid event envelope fields on stored records
- valid contract reference (payload schema)
- valid state enum
- required source metadata
- valid timestamp
- unique `eventId` on latest stored state

Malformed events are rejected before storage.

Out-of-order events: latest valid timestamp wins per equipment. An event
with an older timestamp is recorded as `ignored_out_of_order` and does
not replace stored state. Duplicate `eventId` values are not reprocessed.
