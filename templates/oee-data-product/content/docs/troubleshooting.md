# Troubleshooting

| Symptom | Check |
| --- | --- |
| `oee` is null | `calculationStatus` is a `MISSING_*` or `INSUFFICIENT_OBSERVATION` value; do not treat null as zero |
| `oee` is 0 | `COMPLETE` with observed zero quality (for example all rejects) |
| MQTT DOWN | `MQTT_HOST` set but broker unreachable. Empty host disables MQTT. |
| 503 | Time-series SQLite unavailable |
| Create cannot store secrets | Put tokens in `.env`, not Catalog |
