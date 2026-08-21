# UNS Event Envelope

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

Required envelope:

```json
{
  "eventId": "uuid",
  "timestamp": "ISO-8601",
  "source": {
    "site": "site-a",
    "area": "packaging",
    "line": "line-01",
    "equipment": "filler-01"
  },
  "type": "cycle",
  "contract": {
    "name": "production-cycle",
    "version": "1.0.0"
  },
  "payload": {}
}
```

`eventId`, `timestamp` (timezone-aware), `source`, and contract
name/version are required. Payload must validate against the referenced
JSON Schema. Duplicate `eventId` values are accepted once.
