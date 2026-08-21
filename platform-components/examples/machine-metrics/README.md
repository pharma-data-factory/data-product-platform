# Machine Metrics Reference

Owner: Platform Team  
Version: 1.0.0

Reference composition only. MQTT Event → MQTT Consumer → validation hook →
Time-Series Storage → REST API.

Not an OEE product. MQTT_HOST may be empty; metrics can be posted to
`POST /api/v1/metrics` for local proof. Query with
`GET /api/v1/metrics?entityId=machine-01&metric=cycle-time`.

The service runs without Backstage. From `platform-components/`:

```
docker compose up --build
```

or `docker build -f examples/machine-metrics/Dockerfile .`
