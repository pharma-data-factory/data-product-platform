from __future__ import annotations

import json
import logging

import paho.mqtt.client as mqtt
from pydantic import ValidationError

from app.config import Settings
from app.ingest import EventValidationError, validate_event
from app.models import MachineStateRecord
from app.store import MachineStateStore, Outcome

logger = logging.getLogger(__name__)


class MqttIngest:
    def __init__(self, settings: Settings, store: MachineStateStore) -> None:
        self._settings = settings
        self._store = store
        self._client: mqtt.Client | None = None

    def start(self) -> None:
        if not self._settings.mqtt_host:
            logger.info("mqtt_disabled", extra={"reason": "MQTT_HOST is empty"})
            return

        client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=self._settings.mqtt_client_id,
            protocol=mqtt.MQTTv311,
        )
        client.on_connect = self._handle_connect
        client.on_disconnect = self._handle_disconnect
        client.on_message = self._handle_message
        if self._settings.mqtt_username:
            client.username_pw_set(self._settings.mqtt_username, self._settings.mqtt_password)
        client.connect(self._settings.mqtt_host, self._settings.mqtt_port, keepalive=30)
        client.loop_start()
        self._client = client

    def stop(self) -> None:
        if self._client is None:
            return
        self._client.loop_stop()
        self._client.disconnect()
        self._client = None

    def ingest_payload(self, payload: str | dict) -> tuple[MachineStateRecord, Outcome]:
        document = payload if isinstance(payload, dict) else json.loads(payload)
        event = validate_event(document)
        return self._store.apply(event)

    def _handle_connect(self, client, _userdata, _connect_flags, reason_code, _properties) -> None:
        if getattr(reason_code, "is_failure", False):
            logger.error("mqtt_connect_failed", extra={"reason": str(reason_code)})
            return
        client.subscribe(self._settings.mqtt_topic)
        logger.info("mqtt_connected", extra={"topic": self._settings.mqtt_topic})

    def _handle_disconnect(self, _client, _userdata, _disconnect_flags, reason_code, _properties) -> None:
        logger.info("mqtt_disconnected", extra={"reason": str(reason_code)})

    def _handle_message(self, _client, _userdata, message) -> None:
        payload = message.payload.decode("utf-8", errors="replace")
        try:
            self.ingest_payload(payload)
        except (EventValidationError, ValidationError, ValueError) as error:
            logger.warning(
                "mqtt_message_rejected",
                extra={"topic": message.topic, "error": str(error)},
            )
