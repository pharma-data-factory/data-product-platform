from __future__ import annotations

import logging
from collections.abc import Callable

import paho.mqtt.client as mqtt

from config import Settings

logger = logging.getLogger(__name__)

MessageHandler = Callable[[str, str], None]


class MqttConnection:
    """Thin MQTT abstraction. Connection is opt-in via MQTT_ENABLED=true."""

    def __init__(self, settings: Settings, on_message: MessageHandler | None = None) -> None:
        self._settings = settings
        self._on_message = on_message
        self._connected = False
        self._client = mqtt.Client(client_id=settings.mqtt_client_id, protocol=mqtt.MQTTv311)
        self._client.on_connect = self._handle_connect
        self._client.on_disconnect = self._handle_disconnect
        self._client.on_message = self._handle_message

        if settings.mqtt_username:
            self._client.username_pw_set(settings.mqtt_username, settings.mqtt_password)

    @property
    def connected(self) -> bool:
        return self._connected

    def connect(self) -> None:
        if not self._settings.mqtt_enabled:
            logger.info("mqtt_disabled", extra={"reason": "MQTT_ENABLED is false"})
            return

        logger.info(
            "mqtt_connecting",
            extra={
                "host": self._settings.mqtt_broker_host,
                "port": self._settings.mqtt_broker_port,
                "topic": self._settings.mqtt_topic,
            },
        )
        self._client.connect(
            self._settings.mqtt_broker_host,
            self._settings.mqtt_broker_port,
            keepalive=self._settings.mqtt_keepalive,
        )
        self._client.loop_start()

    def disconnect(self) -> None:
        self._client.loop_stop()
        self._client.disconnect()
        self._connected = False

    def _handle_connect(self, _client: mqtt.Client, _userdata: object, _flags: dict, rc: int) -> None:
        self._connected = rc == 0
        if self._connected:
            self._client.subscribe(self._settings.mqtt_topic, qos=self._settings.mqtt_qos)
            logger.info("mqtt_connected", extra={"topic": self._settings.mqtt_topic})
        else:
            logger.error("mqtt_connect_failed", extra={"rc": rc})

    def _handle_disconnect(self, _client: mqtt.Client, _userdata: object, _rc: int) -> None:
        self._connected = False
        logger.info("mqtt_disconnected")

    def _handle_message(self, _client: mqtt.Client, _userdata: object, message: mqtt.MQTTMessage) -> None:
        payload = message.payload.decode("utf-8", errors="replace")
        logger.info("mqtt_message_received", extra={"topic": message.topic})
        if self._on_message:
            self._on_message(message.topic, payload)
