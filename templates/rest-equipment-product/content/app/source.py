from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.models import Equipment


class RestEquipmentSource:
    """Fetches equipment records from a configured REST API. No SAP/MES client."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def enabled(self) -> bool:
        return bool(self._settings.source_api_url.strip())

    def fetch(self) -> list[dict[str, Any]]:
        if not self.enabled():
            return []
        headers: dict[str, str] = {}
        if self._settings.source_api_token:
            headers["Authorization"] = f"Bearer {self._settings.source_api_token}"
        with httpx.Client(timeout=self._settings.source_api_timeout) as client:
            response = client.get(self._settings.source_api_url, headers=headers)
            response.raise_for_status()
            payload = response.json()
        return self._records(payload)

    def fetch_equipment(self) -> list[Equipment]:
        return [Equipment.model_validate(item) for item in self.fetch()]

    def _records(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict) and isinstance(payload.get("items"), list):
            return [item for item in payload["items"] if isinstance(item, dict)]
        raise ValueError("Source API must return a JSON array or an object with items")
