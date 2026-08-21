# Broker-Free Testing

`POST /api/v1/events` accepts the same UNS envelope as MQTT.

```bash
python examples/publish_sample.py
curl http://localhost:8080/api/v1/machines/filler-01
```

Expected state: `RUNNING`.
