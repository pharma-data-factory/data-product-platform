from unittest.mock import MagicMock

import httpx
import pytest
from pdf_observability import Observability
from pdf_rest_source import RestSource, RestSourceError, RestSourceSettings
from pydantic import ValidationError


def test_disabled_when_url_empty() -> None:
    source = RestSource(RestSourceSettings(url=""))
    assert source.enabled() is False
    assert source.get() is None


def test_get_success_with_auth_header() -> None:
    client = MagicMock()
    response = MagicMock()
    response.json.return_value = {"id": "1"}
    response.raise_for_status.return_value = None
    client.get.return_value = response
    source = RestSource(
        RestSourceSettings(url="https://source.example/data", token="secret", timeout=3),
        client=client,
        validator=lambda payload: payload,
        observability=Observability("source"),
    )
    assert source.get() == {"id": "1"}
    assert source.observability is not None
    assert source.observability.metrics.snapshot()["counters"]["rest_source_success"] == 1
    _, kwargs = client.get.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer secret"
    assert kwargs["timeout"] == 3


def test_timeout_retries_then_fails() -> None:
    client = MagicMock()
    client.get.side_effect = httpx.TimeoutException("slow")
    source = RestSource(RestSourceSettings(url="https://source.example/data", retries=1), client=client)
    with pytest.raises(RestSourceError):
        source.get()
    assert client.get.call_count == 2


def test_http_error_is_retried() -> None:
    client = MagicMock()
    error = httpx.HTTPStatusError("no", request=MagicMock(), response=MagicMock())
    client.get.side_effect = error
    source = RestSource(RestSourceSettings(url="https://source.example/data", retries=0), client=client)
    with pytest.raises(RestSourceError):
        source.get()


def test_custom_auth_header_and_missing_token() -> None:
    client = MagicMock()
    response = MagicMock()
    response.json.return_value = {"ok": True}
    response.raise_for_status.return_value = None
    client.get.return_value = response
    keyed = RestSource(
        RestSourceSettings(
            url="https://source.example/data",
            token="key-1",
            auth_header="X-API-Key",
            auth_scheme="",
        ),
        client=client,
    )
    keyed.get()
    assert client.get.call_args.kwargs["headers"]["X-API-Key"] == "key-1"
    anonymous = RestSource(
        RestSourceSettings(url="https://source.example/data", token=""),
        client=client,
    )
    anonymous.get()
    assert client.get.call_args.kwargs["headers"] == {}


def test_mock_transport_success() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://source.example/data"
        return httpx.Response(200, json={"id": "mock"})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as client:
        source = RestSource(
            RestSourceSettings(url="https://source.example/data"),
            client=client,
        )
        assert source.get() == {"id": "mock"}


def test_observability_records_success_and_errors() -> None:
    obs = Observability("rest-source")
    client = MagicMock()
    response = MagicMock()
    response.json.return_value = {"ok": True}
    response.raise_for_status.return_value = None
    client.get.side_effect = [httpx.TimeoutException("slow"), response]
    source = RestSource(
        RestSourceSettings(url="https://source.example/data", retries=1),
        observability=obs,
        client=client,
    )
    assert source.get() == {"ok": True}
    snap = obs.metrics.snapshot()["counters"]
    assert snap["rest_source_errors"] == 1
    assert snap["rest_source_success"] == 1


def test_retries_and_timeout_are_bounded() -> None:
    with pytest.raises(ValidationError):
        RestSourceSettings(url="https://source.example/data", retries=99)
    with pytest.raises(ValidationError):
        RestSourceSettings(url="https://source.example/data", timeout=0)
    with pytest.raises(ValidationError):
        RestSourceSettings(url="https://source.example/data", timeout=120)
    settings = RestSourceSettings(url="https://source.example/data", retries=5, timeout=60)
    assert settings.retries == 5
    assert settings.timeout == 60


def test_token_is_not_logged() -> None:
    events: list[dict] = []

    class RecordingObs(Observability):
        def info(self, event: str, **fields: object) -> None:
            events.append(fields)
            super().info(event, **fields)

        def warning(self, event: str, **fields: object) -> None:
            events.append(fields)
            super().warning(event, **fields)

    obs = RecordingObs("rest-source")
    client = MagicMock()
    response = MagicMock()
    response.json.return_value = {"ok": True}
    response.raise_for_status.return_value = None
    client.get.return_value = response
    source = RestSource(
        RestSourceSettings(url="https://source.example/data", token="source-secret"),
        observability=obs,
        client=client,
    )
    source.get()
    dumped = str(events)
    assert "source-secret" not in dumped
    assert "token" not in dumped
