from __future__ import annotations

from collections.abc import Callable
from typing import Any

import httpx
from pdf_observability import Observability
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Validator = Callable[[Any], Any]


class RestSourceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SOURCE_API_", extra="ignore")

    url: str = ""
    token: str = ""
    timeout: float = Field(default=10.0, ge=0.1, le=60)
    retries: int = Field(default=2, ge=0, le=5)
    auth_header: str = "Authorization"
    auth_scheme: str = "Bearer"


class RestSourceError(Exception):
    """Raised when the remote source cannot be fetched after retries."""


class RestSource:
    """Generic GET client. No SAP/MES/customer API knowledge."""

    def __init__(
        self,
        settings: RestSourceSettings | None = None,
        *,
        observability: Observability | None = None,
        validator: Validator | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.settings = settings or RestSourceSettings()
        self.observability = observability
        self.validator = validator
        self._client = client

    def enabled(self) -> bool:
        return bool(self.settings.url.strip())

    def _headers(self) -> dict[str, str]:
        if not self.settings.token:
            return {}
        value = (
            f"{self.settings.auth_scheme} {self.settings.token}".strip()
            if self.settings.auth_scheme
            else self.settings.token
        )
        return {self.settings.auth_header: value}

    def get(self, url: str | None = None) -> Any:
        if not (url or self.enabled()):
            return None
        target = url or self.settings.url
        last_error: Exception | None = None
        attempts = max(self.settings.retries, 0) + 1
        for attempt in range(1, attempts + 1):
            try:
                payload = self._request(target)
                if self.observability:
                    self.observability.info(
                        "rest_source_ok",
                        url=target,
                        attempt=attempt,
                    )
                    self.observability.metrics.incr("rest_source_success")
                return self.validator(payload) if self.validator else payload
            except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as error:
                last_error = error
                if self.observability:
                    self.observability.warning(
                        "rest_source_retry",
                        url=target,
                        attempt=attempt,
                        error=error.__class__.__name__,
                    )
                    self.observability.metrics.incr("rest_source_errors")
        raise RestSourceError(str(last_error)) from last_error

    def _request(self, url: str) -> Any:
        client = self._client
        if client is not None:
            response = client.get(
                url,
                headers=self._headers(),
                timeout=self.settings.timeout,
            )
            response.raise_for_status()
            return response.json()
        with httpx.Client(timeout=self.settings.timeout) as owned:
            response = owned.get(url, headers=self._headers())
            response.raise_for_status()
            return response.json()
