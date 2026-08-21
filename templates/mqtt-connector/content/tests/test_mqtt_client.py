from config import Settings
from mqtt_client import MqttConnection


def test_connect_is_noop_when_disabled() -> None:
    settings = Settings(mqtt_enabled=False, mqtt_broker_host="unused.example")
    connection = MqttConnection(settings)
    connection.connect()
    assert connection.connected is False
