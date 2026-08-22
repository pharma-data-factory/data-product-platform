# Configuration

Copy `.env.example` to `.env`. Runtime only:

| Variable | Purpose |
| --- | --- |
| `MQTT_HOST` | Broker host. Empty disables MQTT. |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | Optional credentials |
| `MQTT_TOPIC` | Optional extra subscription pattern |
| `MACHINE_STATE_TOPIC` | Machine-state MQTT topic |
| `COUNTER_TOPIC` | Cumulative counter MQTT topic |
| `SOURCE_API_URL` | Production-context GET URL (`${{ values.contextUrlRef }}`) |
| `SOURCE_API_TOKEN` | Optional bearer token |
| `TIMESERIES_SQLITE_PATH` | SQLite file |
| `EQUIPMENT_ID` | Canonical equipment |
| `MICROSTOP_MIN_SECONDS` | Default microstop lower bound (3) |
| `MICROSTOP_MAX_SECONDS` | Default microstop upper bound (60) |

Secrets never belong in Catalog or committed files.
