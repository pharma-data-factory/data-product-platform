# Unified Namespace

Pharma Data Factory **platform component** that provides a governed MQTT
Unified Namespace. It is infrastructure, not a business Data Product.

```bash
docker compose up --build
curl http://localhost:8080/health
python examples/publish_examples.py
```

Environment:

- `UNS_MQTT_HOST`
- `UNS_MQTT_PORT`
- `UNS_MQTT_USERNAME`
- `UNS_MQTT_PASSWORD`
- `UNS_ROOT_TOPIC` (default `pharma`)

Local Mosquitto allows anonymous connections for development. Production
brokers must require credentials and must not be anonymous.
