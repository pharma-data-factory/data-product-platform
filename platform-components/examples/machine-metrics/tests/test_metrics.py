from datetime import UTC, datetime

import pytest
from app.main import app, ingest_payload, store, validate_metric
from fastapi.testclient import TestClient
from pydantic import ValidationError


def _empty_store() -> None:
    store.initialize()
    store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))


def test_health_and_latest_metric() -> None:
    _empty_store()
    client = TestClient(app)
    assert client.get("/health").json()["status"] == "UP"
    empty = client.get("/api/v1/metrics/latest")
    assert empty.status_code == 404
    created = client.post(
        "/api/v1/metrics",
        json={
            "entityId": "machine-01",
            "metric": "cycle-time",
            "value": 12.4,
            "unit": "seconds",
            "timestamp": datetime(2026, 8, 20, tzinfo=UTC).isoformat(),
        },
    )
    assert created.status_code == 200
    latest = client.get("/api/v1/metrics/latest", params={"entityId": "machine-01"})
    assert latest.status_code == 200
    body = latest.json()
    assert body["entityId"] == "machine-01"
    assert body["metric"] == "cycle-time"
    assert body["value"] == 12.4
    assert body["unit"] == "seconds"
    listed = client.get(
        "/api/v1/metrics",
        params={"entityId": "machine-01", "metric": "cycle-time"},
    )
    assert listed.status_code == 200
    assert listed.json()[0]["value"] == 12.4


def test_mqtt_consume_writes_metric() -> None:
    _empty_store()
    ingest_payload(
        "plant/machine-01/metric",
        '{"entityId":"machine-01","metric":"cycle-time","value":12.4,"unit":"seconds","timestamp":"2026-08-20T12:00:00+00:00"}',
    )
    latest = store.latest(entity_id="machine-01", metric="cycle-time")
    assert latest is not None
    assert latest.value == 12.4


def test_validation_hook_accepts_generic_metric() -> None:
    point = validate_metric(
        {
            "entityId": "machine-01",
            "metric": "cycle-time",
            "value": 12.4,
            "unit": "seconds",
        },
    )
    assert point.entity_id == "machine-01"
    assert "oee" not in point.metric


def test_invalid_payload_is_rejected() -> None:
    with pytest.raises((ValueError, TypeError)):
        ingest_payload("plant/machine-01/metric", "not-json")
    with pytest.raises(ValidationError):
        ingest_payload("plant/machine-01/metric", '{"entityId":"machine-01"}')


def test_duplicate_events_are_both_stored() -> None:
    _empty_store()
    payload = '{"entityId":"machine-01","metric":"cycle-time","value":12.4,"unit":"seconds","timestamp":"2026-08-20T12:00:00+00:00"}'
    ingest_payload("plant/machine-01/metric", payload)
    ingest_payload("plant/machine-01/metric", payload)
    points = store.query_range(entity_id="machine-01", metric="cycle-time")
    assert len(points) == 2
