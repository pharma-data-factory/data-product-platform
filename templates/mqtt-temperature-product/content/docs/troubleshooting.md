# Troubleshooting

Owner: Golden Path Team  
Template: mqtt-temperature-data-product

| Symptom | What to check |
| --- | --- |
| Service will not start | `.env` from `.env.example`; Python 3.12 |
| No MQTT events | Broker host/topic; or use `POST /api/v1/temperatures` |
| Contract tests fail | Payload vs `contracts/temperature-event.schema.json` |
| CI UNKNOWN in the portal | GitHub Actions permission, not a product defect |
| Duplicate events | Ingest is idempotent on `eventId` |

See [Quality Rules](quality-rules.md) and [CI/CD](ci-cd.md).
