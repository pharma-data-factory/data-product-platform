from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Protocol

import paho.mqtt.client as mqtt

from app.config import Settings

logger = logging.getLogger(__name__)

MessageHandler = Callable[[str, str], None]


class EventTransport(Protocol):
    """MQTT today. A Kafka transport can implement the same surface later."""

    connected: bool

    def start(self) -> None: ...
    def stop(self) -> None: ...
    def publish(self, topic: str, payload: str) -> None: ...


class MqttTransport:
    def __init__(self, settings: Settings, on_message: MessageHandler | None = None) -> None:
        self._settings = settings
        self._on_message = on_message
        self.connected = False
        self._client = mqtt.Client(
            client_id=settings.uns_mqtt_client_id,
            protocol=mqtt.MQTTv311,
        )
        self._client.on_connect = self._handle_connect
        self._client.on_disconnect = self._handle_disconnect
        self._client.on_message = self._handle_message
        if settings.uns_mqtt_username:
            self._client.username_pw_set(
                settings.uns_mqtt_username,
                settings.uns_mqtt_password,
            )

    def start(self) -> None:
        if not self._settings.uns_mqtt_enabled:
            logger.info("uns_mqtt_disabled")
            return
        self._client.connect(
            self._settings.uns_mqtt_host,
            self._settings.uns_mqtt_port,
            keepalive=30,
        )
        self._client.loop_start()

    def stop(self) -> None:
        self._client.loop_stop()
        self._client.disconnect()
        self.connected = False

    def publish(self, topic: str, payload: str) -> None:
        if not self._settings.uns_mqtt_enabled:
            return
        self._client.publish(topic, payload=payload, qos=1)

    def _handle_connect(self, _client: mqtt.Client, _userdata: object, _flags: dict, rc: int) -> None:
        self.connected = rc == 0
        if self.connected:
            subscription = f"{self._settings.uns_root_topic}/#"
            self._client.subscribe(subscription, qos=1)
            logger.info("uns_mqtt_connected", extra={"topic": subscription})
        else:
            logger.error("uns_mqtt_connect_failed", extra={"rc": rc})

    def _handle_disconnect(self, _client: mqtt.Client, _userdata: object, _rc: int) -> None:
        self.connected = False

    def _handle_message(self, _client: mqtt.Client, _userdata: object, message: mqtt.MQTTMessage) -> None:
        payload = message.payload.decode("utf-8", errors="replace")
        if self._on_message:
            self._on_message(message.topic, payload)
