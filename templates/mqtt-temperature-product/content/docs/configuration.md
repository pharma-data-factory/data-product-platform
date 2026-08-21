# Configuration

Copy `.env.example` to `.env`. Do not commit secrets.

| Variable | Purpose |
| --- | --- |
| `MQTT_HOST` | Broker host. Empty disables MQTT ingestion. |
| `MQTT_PORT` | Broker port. Default `1883`. |
| `MQTT_USERNAME` | Optional username |
| `MQTT_PASSWORD` | Optional password |
| `MQTT_TOPIC` | Subscription topic. Default `${{ values.mqttTopic }}`. |
| `TEMPERATURE_MIN` | Lower technical quality limit. Default `-50`. |
| `TEMPERATURE_MAX` | Upper technical quality limit. Default `150`. |

The service name and version come from the project manifest and
`catalog-info.yaml`.
