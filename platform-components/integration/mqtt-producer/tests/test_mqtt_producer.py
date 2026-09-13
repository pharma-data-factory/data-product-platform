from unittest.mock import MagicMock

from pdf_mqtt_producer import MqttPublisher, MqttPublisherSettings


def test_disabled_when_flag_or_host_empty() -> None:
    publisher = MqttPublisher(
        MqttPublisherSettings(host="", publish_enabled=True),
        client=MagicMock(),
    )
    assert publisher.enabled is False
    assert publisher.publish("products/x/y/z/v1", {"a": 1}) is False

    publisher = MqttPublisher(
        MqttPublisherSettings(host="mqtt.example", publish_enabled=False),
        client=MagicMock(),
    )
    assert publisher.enabled is False


def test_publish_stream_event_when_enabled() -> None:
    client = MagicMock()
    publisher = MqttPublisher(
        MqttPublisherSettings(
            host="mqtt.example",
            publish_enabled=True,
            publish_topic="products/manufacturing/demo/temperature-event/v1",
        ),
        client=client,
    )
    publisher.start()
    client.connect.assert_called_once()
    ok = publisher.publish_stream_event(
        event_id="e1",
        timestamp="2026-09-10T06:00:00Z",
        source="component:default/demo",
        payload={"temperature": 21.5, "unit": "C"},
    )
    assert ok is True
    client.publish.assert_called_once()
    call_args = client.publish.call_args
    topic = call_args[0][0] if call_args[0] else call_args.kwargs.get("topic")
    assert str(topic).startswith("products/")
    assert call_args.kwargs.get("qos") == 1
    body = call_args.kwargs.get("payload") or (
        call_args[0][1] if len(call_args[0]) > 1 else ""
    )
    assert "eventId" in body
    assert "temperature" in body
