# Realtime

Preferred path:

```text
UNS / MQTT → Data Product / Consume backend → SSE or authenticated poll → Browser
```

## Endpoints

- `GET /api/data-products/consume/stream` — SSE (when session allows)
- `GET /api/data-products/consume/stream-poll` — authenticated JSON poll fallback

## Browser rules

- Do not open MQTT from the browser
- Do not ship broker credentials to the client
- Pause/resume is client-side event buffering

## v1 note

Without configured upstream, stream emits SAMPLE fixture events labeled as such.
Live MQTT bridge to a running product instance remains optional configuration.
