from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.config import Settings
from app.source import RestEquipmentSource

RECORD = {
    "equipmentId": "EQ-1001",
    "name": "Bioreactor 01",
    "site": "SITE-A",
    "status": "ACTIVE",
    "updatedAt": "2026-08-17T06:30:00Z",
}


def test_source_disabled_when_url_empty() -> None:
    source = RestEquipmentSource(Settings(source_api_url=""))
    assert source.enabled() is False
    assert source.fetch() == []


def test_source_fetches_array_payload() -> None:
    settings = Settings(
        source_api_url="https://source.example/equipment",
        source_api_token="secret-token",
        source_api_timeout=5,
    )
    source = RestEquipmentSource(settings)
    response = MagicMock()
    response.json.return_value = [RECORD]
    response.raise_for_status.return_value = None
    with patch("app.source.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = response
        records = source.fetch()
        client_cls.return_value.__enter__.return_value.get.assert_called_once()
        _, kwargs = client_cls.return_value.__enter__.return_value.get.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer secret-token"
    assert records == [RECORD]


def test_source_fetches_items_object() -> None:
    source = RestEquipmentSource(Settings(source_api_url="https://source.example/equipment"))
    response = MagicMock()
    response.json.return_value = {"items": [RECORD]}
    response.raise_for_status.return_value = None
    with patch("app.source.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = response
        assert source.fetch() == [RECORD]


def test_source_rejects_malformed_payload() -> None:
    source = RestEquipmentSource(Settings(source_api_url="https://source.example/equipment"))
    response = MagicMock()
    response.json.return_value = {"unexpected": True}
    response.raise_for_status.return_value = None
    with patch("app.source.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = response
        with pytest.raises(ValueError):
            source.fetch()


def test_source_raises_on_http_error() -> None:
    source = RestEquipmentSource(Settings(source_api_url="https://source.example/equipment"))
    response = MagicMock()
    response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "boom",
        request=MagicMock(),
        response=MagicMock(),
    )
    with patch("app.source.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = response
        with pytest.raises(httpx.HTTPStatusError):
            source.fetch()
