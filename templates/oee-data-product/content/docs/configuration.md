# Configuration

Copy `.env.example` to `.env`. Runtime only:

| Variable | Purpose |
| --- | --- |
| `MQTT_HOST` | Broker host. Empty disables MQTT. |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | Optional credentials |
| `MQTT_TOPIC` | Subscription pattern |
| `SOURCE_API_URL` | Production-context GET URL (`${{ values.contextUrlRef }}`) |
| `SOURCE_API_TOKEN` | Optional bearer token |
| `TIMESERIES_SQLITE_PATH` | SQLite file |
| `EQUIPMENT_ID` | Canonical equipment |

Secrets never belong in Catalog or committed files.
