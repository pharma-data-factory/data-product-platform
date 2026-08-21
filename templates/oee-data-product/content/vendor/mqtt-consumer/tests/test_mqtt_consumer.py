from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pdf_mqtt_consumer import MqttConsumer, MqttConsumerSettings


def test_disabled_when_host_empty() -> None:
    consumer = MqttConsumer(MqttConsumerSettings(host=""), client=MagicMock())
    consumer.start()
    assert consumer.connected is False
    assert consumer.health_check().status == "UP"
    assert consumer.health_check().detail == "disabled"


def test_subscribe_on_connect_and_message_handler() -> None:
    received: list[tuple[str, str]] = []
    client = MagicMock()
    client.reconnect_delay_set = MagicMock()
    consumer = MqttConsumer(
        MqttConsumerSettings(host="mqtt.example", topic="plant/+/metric"),
        on_message=lambda topic, payload: received.append((topic, payload)),
        client=client,
    )
    consumer.start()
    client.connect.assert_called_once()
    client.reconnect_delay_set.assert_called_with(min_delay=1, max_delay=30)
    consumer._handle_connect(client, None, None, 0)
    client.subscribe.assert_called_with("plant/+/metric")
    assert consumer.connected is True
    assert consumer.health_check().status == "UP"
    consumer._handle_message(
        client,
        None,
        SimpleNamespace(topic="plant/m1/metric", payload=b'{"ok":true}'),
    )
    assert received == [("plant/m1/metric", '{"ok":true}')]


def test_connect_failure_and_handler_error() -> None:
    client = MagicMock()
    consumer = MqttConsumer(
        MqttConsumerSettings(host="mqtt.example"),
        on_message=lambda *_args: (_ for _ in ()).throw(ValueError("bad payload")),
        client=client,
    )
    consumer._handle_connect(client, None, None, 1)
    assert consumer.connected is False
    assert consumer.health_check().status == "DOWN"
    consumer._handle_connect(client, None, None, 0)
    consumer._handle_message(client, None, SimpleNamespace(topic="t", payload=b"x"))
    assert "bad payload" in (consumer.last_error or "")


def test_reconnect_updates_health() -> None:
    client = MagicMock()
    consumer = MqttConsumer(MqttConsumerSettings(host="mqtt.example"), client=client)
    consumer._handle_connect(client, None, None, 0)
    assert consumer.health_check().status == "UP"
    consumer._handle_disconnect(client)
    assert consumer.connected is False
    assert consumer.health_check().status == "DOWN"
    consumer._handle_connect(client, None, None, 0)
    assert consumer.health_check().status == "UP"
    assert client.subscribe.call_count == 2


def test_tls_configuration_seam() -> None:
    settings = MqttConsumerSettings(tls_enabled=True, tls_ca_certs="/certs/ca.pem")
    client = MagicMock()
    MqttConsumer(settings, client=client)
    client.tls_set.assert_called_once_with(ca_certs="/certs/ca.pem")


def test_start_raises_on_broker_error() -> None:
    client = MagicMock()
    client.connect.side_effect = OSError("refused")
    consumer = MqttConsumer(MqttConsumerSettings(host="mqtt.example"), client=client)
    with pytest.raises(OSError):
        consumer.start()
    assert consumer.health_check().status == "DOWN"


def test_reconnect_delay_is_configurable() -> None:
    client = MagicMock()
    MqttConsumer(
        MqttConsumerSettings(
            host="mqtt.example",
            reconnect_min_delay=2,
            reconnect_max_delay=8,
        ),
        client=client,
    )
    client.reconnect_delay_set.assert_called_with(min_delay=2, max_delay=8)


def test_password_is_not_logged() -> None:
    client = MagicMock()
    consumer = MqttConsumer(
        MqttConsumerSettings(host="mqtt.example", username="user", password="mqtt-secret"),
        client=client,
    )
    client.username_pw_set.assert_called_once_with("user", "mqtt-secret")
    assert "mqtt-secret" not in repr(consumer.health_check())
