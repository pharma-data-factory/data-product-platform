# UNS Producer Guide

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

1. Choose a registered topic in the configured namespace.
2. Emit the standard envelope with `eventId`, timezone-aware `timestamp`,
   `source`, and contract name/version.
3. Put domain fields only in `payload`.
4. Publish to MQTT `{UNS_ROOT_TOPIC}/#` or `POST /api/v1/events`.

Malformed events are rejected. Source segments must match the topic.
