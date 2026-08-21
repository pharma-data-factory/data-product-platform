# Operations

- Liveness: `GET /health`
- Readiness: `GET /health/ready` (MQTT, REST Source, time-series)
- Quality: `GET /api/v1/quality`
- Logs include correlation ids from Observability 1.x. Tokens are not logged.
