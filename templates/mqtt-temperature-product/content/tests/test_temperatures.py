from fastapi.testclient import TestClient

from app.main import ingest, store
from app.models import TemperatureEvent

PAYLOAD = {
    "eventId": "evt-probe-1",
    "deviceId": "probe-1",
    "timestamp": "2026-08-16T17:00:00Z",
    "temperature": 4.2,
    "unit": "C",
}


def test_post_and_list_temperatures(client: TestClient) -> None:
    store.clear()
    created = client.post("/api/v1/temperatures", json=PAYLOAD)
    assert created.status_code == 201
    body = created.json()
    assert body["eventId"] == "evt-probe-1"
    assert body["deviceId"] == "probe-1"
    assert body["temperature"] == 4.2
    assert body["unit"] == "C"

    listed = client.get("/api/v1/temperatures")
    assert listed.status_code == 200
    assert any(item["eventId"] == "evt-probe-1" for item in listed.json())


def test_duplicate_event_id_does_not_create_a_second_event(client: TestClient) -> None:
    store.clear()
    first = client.post("/api/v1/temperatures", json=PAYLOAD)
    duplicate = {
        **PAYLOAD,
        "temperature": 99.9,
        "deviceId": "probe-other",
    }
    second = client.post("/api/v1/temperatures", json=duplicate)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["eventId"] == "evt-probe-1"
    assert second.json()["temperature"] == 4.2
    assert store.count() == 1
    listed = client.get("/api/v1/temperatures").json()
    assert len([item for item in listed if item["eventId"] == "evt-probe-1"]) == 1


def test_post_rejects_invalid_unit(client: TestClient) -> None:
    response = client.post(
        "/api/v1/temperatures",
        json={**PAYLOAD, "unit": "K"},
    )
    assert response.status_code == 422


def test_post_rejects_missing_event_id(client: TestClient) -> None:
    payload = {key: value for key, value in PAYLOAD.items() if key != "eventId"}
    response = client.post("/api/v1/temperatures", json=payload)
    assert response.status_code == 422


def test_mqtt_payload_is_stored(client: TestClient) -> None:
    event = ingest.ingest_payload(
        '{"eventId":"evt-mqtt","deviceId":"probe-mqtt","timestamp":"2026-08-16T17:00:00Z","temperature":8.1,"unit":"C"}'
    )
    assert isinstance(event, TemperatureEvent)
    assert event.eventId == "evt-mqtt"
    assert any(item.eventId == "evt-mqtt" for item in store.list_recent())


def test_mqtt_duplicate_event_id_is_idempotent(client: TestClient) -> None:
    store.clear()
    first = ingest.ingest_payload(
        '{"eventId":"evt-dup","deviceId":"probe-mqtt","timestamp":"2026-08-16T17:00:00Z","temperature":8.1,"unit":"C"}'
    )
    second = ingest.ingest_payload(
        '{"eventId":"evt-dup","deviceId":"probe-other","timestamp":"2026-08-16T18:00:00Z","temperature":1.0,"unit":"F"}'
    )
    assert first.eventId == second.eventId == "evt-dup"
    assert second.temperature == 8.1
    assert store.count() == 1
