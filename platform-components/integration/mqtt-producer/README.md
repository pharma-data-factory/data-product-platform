# MQTT Producer (Product Publish Bus)

**Status:** DEVELOPMENT / NOT CERTIFIED  
**Role:** Platform Component — opt-in MQTT **egress** for Data Products

Publishes Nexora `StreamEvent` envelopes to topics under:

```text
products/{domain}/{name}/{contract}/v{major}
```

This is **not** Unified Namespace (`uns/…`). See ADR-011.

## Settings (`MQTT_*`)

| Env | Default | Meaning |
| --- | --- | --- |
| `MQTT_HOST` | empty | Broker host; empty disables |
| `MQTT_PUBLISH_ENABLED` | `false` | Must be true to publish |
| `MQTT_PUBLISH_TOPIC` | empty | Default topic |
| `MQTT_PORT` / user / password / TLS | same pattern as mqtt-consumer | |

## Usage

```python
from pdf_mqtt_producer import MqttPublisher, MqttPublisherSettings

publisher = MqttPublisher(MqttPublisherSettings())
publisher.start()
publisher.publish_stream_event(
    event_id="…",
    timestamp="2026-09-10T06:00:00Z",
    source="component:default/my-product",
    payload={"temperature": 21.5, "unit": "C"},
    topic="products/manufacturing/my-product/temperature-event/v1",
)
```
