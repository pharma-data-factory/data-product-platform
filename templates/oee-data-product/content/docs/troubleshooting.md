# Troubleshooting

| Symptom | Check |
| --- | --- |
| `oee` is null | `calculationStatus` INCOMPLETE / INVALID_INPUT; missing context or states |
| `oee` is 0 | VALID or NO_PRODUCTION — this is calculated zero, not a failure |
| MQTT DOWN | `MQTT_HOST` set but broker unreachable. Empty host disables MQTT. |
| 503 | Time-series SQLite unavailable |
| Create cannot store secrets | Put tokens in `.env`, not Catalog |
