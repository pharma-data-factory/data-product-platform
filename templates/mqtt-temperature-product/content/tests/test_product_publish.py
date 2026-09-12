"""Product Publish Bus opt-in — default disabled."""

from unittest.mock import MagicMock

from app.config import Settings
from app.models import TemperatureEvent
from app.product_publish import ProductPublishBus


def test_publish_disabled_by_default() -> None:
    bus = ProductPublishBus(Settings(mqtt_host="mqtt.example", mqtt_publish_enabled=False))
    assert bus.enabled is False
    bus.start()
    bus.publish_temperature(
        TemperatureEvent(
            eventId="e1",
            deviceId="d1",
            timestamp="2026-09-10T06:00:00Z",
            temperature=21.5,
            unit="C",
        )
    )


def test_publish_sends_stream_envelope_when_enabled() -> None:
    settings = Settings(
        mqtt_host="mqtt.example",
        mqtt_publish_enabled=True,
        mqtt_publish_topic="products/manufacturing/demo/temperature-event/v1",
        service_name="demo",
    )
    bus = ProductPublishBus(settings)
    client = MagicMock()
    bus._client = client
    # Pretend started/enabled without broker
    object.__setattr__(bus, "enabled", property(lambda self: True))  # type: ignore[attr-defined]
    # Force enabled path by patching property via settings already true and client set
    bus.publish_temperature(
        TemperatureEvent(
            eventId="e1",
            deviceId="d1",
            timestamp="2026-09-10T06:00:00Z",
            temperature=21.5,
            unit="C",
        )
    )
    # enabled requires start(); set client after faking enabled check
    assert bus.enabled is True
    bus._client = client
    bus.publish_temperature(
        TemperatureEvent(
            eventId="e2",
            deviceId="d1",
            timestamp="2026-09-10T06:01:00Z",
            temperature=22.0,
            unit="C",
        )
    )
    assert client.publish.called
    topic = client.publish.call_args[0][0]
    assert topic.startswith("products/")
