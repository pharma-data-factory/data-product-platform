from __future__ import annotations

from collections.abc import Callable
from typing import Any

import paho.mqtt.client as mqtt
from pdf_health import HealthCheckResult
from pdf_observability import Observability
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

MessageHandler = Callable[[str, str], None]


class MqttConsumerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MQTT_", extra="ignore")

    host: str = ""
    port: int = 1883
    username: str = ""
    password: str = ""
    topic: str = "#"
    client_id: str = "pdf-mqtt-consumer"
    keepalive: int = Field(default=30, ge=1, le=120)
    tls_enabled: bool = False
    tls_ca_certs: str | None = None
    reconnect_min_delay: int = Field(default=1, ge=1, le=60)
    reconnect_max_delay: int = Field(default=30, ge=1, le=300)


class MqttConsumer:
    """Generic MQTT subscribe/reconnect client. No domain payload parsing."""

    def __init__(
        self,
        settings: MqttConsumerSettings | None = None,
        *,
        on_message: MessageHandler | None = None,
        observability: Observability | None = None,
        client: Any | None = None,
    ) -> None:
        self.settings = settings or MqttConsumerSettings()
        self.on_message = on_message
        self.observability = observability
        self.connected = False
        self.last_error: str | None = None
        self._owned_client = client is None
        self._client = client or self._build_client()
        if client is not None:
            self._bind_client(self._client)

    def _bind_client(self, client: Any) -> None:
        if hasattr(client, "reconnect_delay_set"):
            client.reconnect_delay_set(
                min_delay=self.settings.reconnect_min_delay,
                max_delay=max(
                    self.settings.reconnect_max_delay,
                    self.settings.reconnect_min_delay,
                ),
            )
        client.on_connect = self._handle_connect
        client.on_disconnect = self._handle_disconnect
        client.on_message = self._handle_message
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
        if not self.settings.host:
            if self.observability:
                self.observability.info("mqtt_disabled", reason="MQTT_HOST is empty")
            return
        try:
            self._client.connect(self.settings.host, self.settings.port, keepalive=self.settings.keepalive)
            if hasattr(self._client, "loop_start"):
                self._client.loop_start()
        except Exception as error:
            self.last_error = str(error)
            self.connected = False
            if self.observability:
                self.observability.error("mqtt_connect_failed", error=self.last_error)
            raise

    def stop(self) -> None:
        if hasattr(self._client, "loop_stop"):
            self._client.loop_stop()
        if hasattr(self._client, "disconnect"):
            self._client.disconnect()
        self.connected = False

    def health_check(self) -> HealthCheckResult:
        if not self.settings.host:
            return HealthCheckResult(name="mqtt", status="UP", detail="disabled")
        if self.connected:
            return HealthCheckResult(name="mqtt", status="UP", detail="connected")
        return HealthCheckResult(
            name="mqtt",
            status="DOWN",
            detail=self.last_error or "disconnected",
        )

    def _handle_connect(self, client: Any, *_args: Any) -> None:
        reason = _args[2] if len(_args) >= 3 else (_args[-1] if _args else 0)
        if self._connect_failed(reason):
            self.connected = False
            self.last_error = str(reason)
            if self.observability:
                self.observability.error("mqtt_connect_failed", reason=self.last_error)
            return
        self.connected = True
        self.last_error = None
        client.subscribe(self.settings.topic)
        if self.observability:
            self.observability.info("mqtt_connected", topic=self.settings.topic)

    def _connect_failed(self, reason: Any) -> bool:
        if reason is None:
            return False
        if hasattr(reason, "is_failure"):
            return bool(reason.is_failure)
        return reason != 0

    def _handle_disconnect(self, _client: Any, *_args: Any) -> None:
        self.connected = False
        if self.observability:
            self.observability.warning("mqtt_disconnected")

    def _handle_message(self, _client: Any, _userdata: Any, message: Any) -> None:
        payload = message.payload.decode("utf-8", errors="replace")
        if self.observability:
            self.observability.metrics.incr("mqtt_messages")
        if self.on_message:
            try:
                self.on_message(message.topic, payload)
            except Exception as error:  # noqa: BLE001
                self.last_error = str(error)
                if self.observability:
                    self.observability.warning(
                        "mqtt_handler_failed",
                        topic=getattr(message, "topic", ""),
                        error=str(error),
                    )
