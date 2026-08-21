# Testing

```bash
ruff check app tests dataprod
pytest
```

Covers envelope validation, invalid state rejection, duplicate
`eventId`, out-of-order timestamps, broker-free POST, MQTT ingest, quality,
and compatibility.
