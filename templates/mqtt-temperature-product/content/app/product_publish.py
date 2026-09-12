"""Opt-in Product Publish Bus egress (ADR-011). Default off."""

from __future__ import annotations

import json
import logging
from typing import Any

import paho.mqtt.client as mqtt

from app.config import Settings

logger = logging.getLogger(__name__)


class ProductPublishBus:
    """
    Publishes StreamEvent envelopes to products/{domain}/{name}/{contract}/v{major}.
    Not Unified Namespace. Disabled unless MQTT_PUBLISH_ENABLED and MQTT_HOST are set.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: mqtt.Client | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._settings.mqtt_publish_enabled and self._settings.mqtt_host)

    def start(self) -> None:
        if not self.enabled:
            logger.info(
                "mqtt_publish_disabled",
                extra={"reason": "MQTT_PUBLISH_ENABLED is false or MQTT_HOST empty"},
            )
            return
        client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"{self._settings.mqtt_client_id}-publish",
            protocol=mqtt.MQTTv311,
        )
        if self._settings.mqtt_username:
            client.username_pw_set(
                self._settings.mqtt_username,
                self._settings.mqtt_password,
            )
        client.connect(
            self._settings.mqtt_host,
            self._settings.mqtt_port,
            keepalive=30,
        )
        client.loop_start()
        self._client = client
        logger.info(
            "mqtt_publish_started",
            extra={"topic": self._settings.mqtt_publish_topic},
        )

    def stop(self) -> None:
        if self._client is None:
            return
        self._client.loop_stop()
        self._client.disconnect()
        self._client = None

    def publish_temperature(self, event: Any) -> None:
        if not self.enabled or self._client is None:
            return
        topic = (self._settings.mqtt_publish_topic or "").strip()
        if not topic:
            logger.warning("mqtt_publish_skipped", extra={"reason": "empty topic"})
            return
        payload = event.model_dump(mode="json") if hasattr(event, "model_dump") else dict(event)
        timestamp = payload.get("timestamp") or ""
        if hasattr(timestamp, "isoformat"):
            timestamp = timestamp.isoformat().replace("+00:00", "Z")
        envelope = {
            "eventId": str(payload.get("eventId", "")),
            "timestamp": str(timestamp),
            "source": self._settings.service_name,
            "dataQuality": "PASS",
            "payload": payload,
        }
        self._client.publish(
            topic,
            payload=json.dumps(envelope, default=str),
            qos=1,
        )
