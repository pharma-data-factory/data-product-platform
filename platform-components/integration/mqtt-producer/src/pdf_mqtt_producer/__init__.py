from __future__ import annotations

import json
from typing import Any

import paho.mqtt.client as mqtt
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MqttPublisherSettings(BaseSettings):
    """
    Opt-in MQTT egress for the Product Publish Bus (ADR-011).

    Disabled when MQTT_PUBLISH_ENABLED is false or MQTT_HOST is empty.
    Uses the same broker credentials as ingest by default (MQTT_*).
    """

    model_config = SettingsConfigDict(env_prefix="MQTT_", extra="ignore")

    host: str = ""
    port: int = 1883
    username: str = ""
    password: str = ""
    client_id: str = "pdf-mqtt-publisher"
    keepalive: int = Field(default=30, ge=1, le=120)
    tls_enabled: bool = False
    tls_ca_certs: str | None = None
    publish_enabled: bool = False
    publish_topic: str = ""
    publish_qos: int = Field(default=1, ge=0, le=2)


class MqttPublisher:
    """Generic MQTT publish client. No domain payload parsing."""

    def __init__(
        self,
        settings: MqttPublisherSettings | None = None,
        *,
        client: Any | None = None,
    ) -> None:
        self.settings = settings or MqttPublisherSettings()
        self.connected = False
        self.last_error: str | None = None
        self._client = client or self._build_client()
        if client is not None:
            self._bind_client(self._client)

    @property
    def enabled(self) -> bool:
        return bool(self.settings.publish_enabled and self.settings.host)

    def _bind_client(self, client: Any) -> None:
        client.on_connect = self._handle_connect
        client.on_disconnect = self._handle_disconnect
        if self.settings.username and hasattr(client, "username_pw_set"):
            client.username_pw_set(self.settings.username, self.settings.password)
        if self.settings.tls_enabled and hasattr(client, "tls_set"):
            client.tls_set(ca_certs=self.settings.tls_ca_certs)

    def _build_client(self) -> mqtt.Client:
        kwargs: dict[str, Any] = {
            "client_id": self.settings.client_id,
            "protocol": mqtt.MQTTv311,
        }
        if hasattr(mqtt, "CallbackAPIVersion"):
            kwargs["callback_api_version"] = mqtt.CallbackAPIVersion.VERSION2
        client = mqtt.Client(**kwargs)
        self._bind_client(client)
        return client

    def start(self) -> None:
        if not self.enabled:
            return
        try:
            self._client.connect(
                self.settings.host,
                self.settings.port,
                keepalive=self.settings.keepalive,
            )
            if hasattr(self._client, "loop_start"):
                self._client.loop_start()
        except Exception as error:  # noqa: BLE001
            self.last_error = str(error)
            self.connected = False
            raise

    def stop(self) -> None:
        if hasattr(self._client, "loop_stop"):
            self._client.loop_stop()
        if hasattr(self._client, "disconnect"):
            self._client.disconnect()
        self.connected = False

    def publish(self, topic: str | None, payload: str | dict[str, Any]) -> bool:
        """
        Publish a UTF-8 payload. Returns False when disabled or topic missing.
        Never raises when disabled.
        """
        if not self.enabled:
            return False
        target = (topic or self.settings.publish_topic or "").strip()
        if not target:
            self.last_error = "publish topic is empty"
            return False
        body = payload if isinstance(payload, str) else json.dumps(payload, default=str)
        try:
            self._client.publish(target, payload=body, qos=self.settings.publish_qos)
            return True
        except Exception as error:  # noqa: BLE001
            self.last_error = str(error)
            return False

    def publish_stream_event(
        self,
        *,
        event_id: str,
        timestamp: str,
        source: str,
        payload: dict[str, Any],
        topic: str | None = None,
        data_quality: str = "PASS",
    ) -> bool:
        """Publish a Nexora StreamEvent envelope onto the Product Publish Bus."""
        envelope = {
            "eventId": event_id,
            "timestamp": timestamp,
            "source": source,
            "dataQuality": data_quality,
            "payload": payload,
        }
        return self.publish(topic, envelope)

    def _handle_connect(self, _client: Any, *_args: Any) -> None:
        reason = _args[2] if len(_args) >= 3 else (_args[-1] if _args else 0)
        if self._connect_failed(reason):
            self.connected = False
            self.last_error = str(reason)
            return
        self.connected = True
        self.last_error = None

    def _connect_failed(self, reason: Any) -> bool:
        if reason is None:
            return False
        if hasattr(reason, "is_failure"):
            return bool(reason.is_failure)
        return reason != 0

    def _handle_disconnect(self, _client: Any, *_args: Any) -> None:
        self.connected = False
