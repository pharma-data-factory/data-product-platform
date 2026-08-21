from datetime import UTC, datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app, settings

client = TestClient(app)


def test_health_is_up():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "UP"
    assert body["service"] == settings.service_name
    assert body["version"] == "1.0.0"


def test_lists_topic_contracts_and_catalog_references():
    topics = client.get("/api/v1/topics")
    contracts = client.get("/api/v1/contracts")
    assert topics.status_code == 200
    assert contracts.status_code == 200
    names = {item["name"] for item in contracts.json()}
    assert names == {
        "production-cycle",
        "machine-state",
        "temperature-value",
        "equipment-status",
    }
    assert all(
        item["catalogApi"].startswith(f"api:default/{settings.service_name}--")
        for item in contracts.json()
    )


def cycle_event():
    return {
        "eventId": str(uuid4()),
        "timestamp": datetime.now(tz=UTC).isoformat(),
        "source": {
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
        },
        "type": "cycle",
        "contract": {"name": "production-cycle", "version": "1.0.0"},
        "payload": {"cycleId": "c-1", "durationMs": 1100, "result": "good"},
    }


def test_accepts_valid_event_and_metrics():
    created = client.post(
        "/api/v1/events",
        json={
            "topic": f"{settings.uns_root_topic}/site-a/packaging/line-01/filler-01/production/cycle",
            "event": cycle_event(),
        },
    )
    assert created.status_code == 201
    metrics = client.get("/api/v1/metrics")
    assert metrics.status_code == 200
    assert metrics.json()["accepted"] >= 1


def test_rejects_malformed_event():
    response = client.post(
        "/api/v1/events",
        json={
            "topic": "not-a-valid-topic",
            "event": cycle_event(),
        },
    )
    assert response.status_code == 400


def test_accepts_demonstration_topics():
    root = settings.uns_root_topic
    samples = [
        (
            f"{root}/site-a/packaging/line-01/filler-01/production/state",
            {
                "type": "state",
                "contract": {"name": "machine-state", "version": "1.0.0"},
                "payload": {"state": "running", "mode": "automatic"},
            },
        ),
        (
            f"{root}/site-b/cold-chain/chamber-07/sensor-07/temperature/value",
            {
                "type": "value",
                "contract": {"name": "temperature-value", "version": "1.0.0"},
                "payload": {"value": 4.2, "unit": "C"},
                "source": {
                    "site": "site-b",
                    "area": "cold-chain",
                    "line": "chamber-07",
                    "equipment": "sensor-07",
                },
            },
        ),
        (
            f"{root}/site-a/packaging/line-01/filler-01/equipment/status",
            {
                "type": "status",
                "contract": {"name": "equipment-status", "version": "1.0.0"},
                "payload": {"status": "ok", "alarm": False},
            },
        ),
    ]
    for topic, extra in samples:
        event = cycle_event()
        event.update(extra)
        response = client.post("/api/v1/events", json={"topic": topic, "event": event})
        assert response.status_code == 201, response.text
