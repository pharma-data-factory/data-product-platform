# ${{ values.title }}

${{ values.description }}

This is a demonstration MQTT connector. It does not connect to customer
infrastructure unless you explicitly enable MQTT and provide broker settings.

## MQTT connection

The connector uses `paho-mqtt` behind a small `MqttConnection` abstraction.

- Connection is **disabled by default**.
- Set `MQTT_ENABLED=true` only for a local or lab broker.
- Username and password are optional and read from environment variables.
- Credentials are never written to logs.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MQTT_ENABLED` | `false` | Opt-in connection |
| `MQTT_BROKER_HOST` | `localhost` | Broker hostname |
| `MQTT_BROKER_PORT` | `1883` | Broker port |
| `MQTT_USERNAME` | unset | Optional username |
| `MQTT_PASSWORD` | unset | Optional password |
| `MQTT_CLIENT_ID` | `${{ values.name }}` | MQTT client id |
| `MQTT_TOPIC` | `${{ values.defaultTopic }}` | Subscription topic |
| `MQTT_QOS` | `0` | Subscription QoS |
| `MQTT_KEEPALIVE` | `60` | Keepalive seconds |

## Topic structure

Default demonstration topic:

```text
${{ values.defaultTopic }}
```

Recommended convention for later products:

```text
dataprod/<domain>/<product>/<event>
```

Example:

```text
dataprod/integration/${{ values.name }}/events
```

## Message handling

Incoming messages are decoded as UTF-8 and passed to an optional handler.
The default handler logs that a message arrived and does **not** log the
payload, to avoid leaking sensitive data.

## Testing

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
set PYTHONPATH=src
pytest
```

Tests do not require a live MQTT broker.

## Deployment

```bash
docker compose up --build
```

The compose file keeps `MQTT_ENABLED=false`. Override the environment when you
have a local broker for experiments.

## Ownership

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`
- Domain: `${{ values.domain }}`
- Version: `${{ values.version }}`
- Certification: DEVELOPMENT
