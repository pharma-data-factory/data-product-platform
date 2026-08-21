from app.config import Settings
from app.transport import MqttTransport


def test_mqtt_transport_stays_disconnected_when_disabled():
    transport = MqttTransport(Settings(uns_mqtt_enabled=False))
    transport.start()
    assert transport.connected is False
    transport.publish("pharma/site-a/packaging/line-01/filler-01/production/cycle", "{}")
    transport.stop()
