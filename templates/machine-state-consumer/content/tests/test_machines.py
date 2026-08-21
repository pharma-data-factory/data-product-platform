from uuid import uuid4

from fastapi.testclient import TestClient

from tests.sample_event import sample_event


def test_broker_free_post_stores_latest_running_state(client: TestClient) -> None:
    created = client.post("/api/v1/events", json=sample_event())
    assert created.status_code == 201
    assert created.json()["outcome"] == "created"

    listed = client.get("/api/v1/machines")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    filler = client.get("/api/v1/machines/filler-01")
    assert filler.status_code == 200
    body = filler.json()
    assert body["state"] == "RUNNING"
    assert body["equipmentId"] == "filler-01"
    assert body["eventId"] == "11111111-1111-4111-8111-111111111111"
    assert body["site"] == "site-a"


def test_invalid_envelope_is_rejected(client: TestClient) -> None:
    event = sample_event()
    del event["eventId"]
    response = client.post("/api/v1/events", json=event)
    assert response.status_code == 400


def test_missing_source_metadata_is_rejected(client: TestClient) -> None:
    event = sample_event()
    del event["source"]["equipment"]
    response = client.post("/api/v1/events", json=event)
    assert response.status_code == 400
    assert client.get("/api/v1/machines").json() == []


def test_invalid_state_is_rejected(client: TestClient) -> None:
    event = sample_event(payload={"state": "DOWN", "reason": None})
    response = client.post("/api/v1/events", json=event)
    assert response.status_code == 400
    assert client.get("/api/v1/machines").json() == []


def test_duplicate_event_id_is_not_reprocessed(client: TestClient) -> None:
    first = client.post("/api/v1/events", json=sample_event())
    second = client.post("/api/v1/events", json=sample_event())
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["duplicate"] is True
    assert len(client.get("/api/v1/machines").json()) == 1


def test_out_of_order_event_does_not_replace_latest(client: TestClient) -> None:
    newer = sample_event(
        eventId=str(uuid4()),
        timestamp="2026-08-20T13:00:00Z",
        payload={"state": "IDLE", "reason": "pause"},
    )
    older = sample_event(
        eventId=str(uuid4()),
        timestamp="2026-08-20T11:00:00Z",
        payload={"state": "STOPPED", "reason": "stale"},
    )
    assert client.post("/api/v1/events", json=newer).status_code == 201
    ignored = client.post("/api/v1/events", json=older)
    assert ignored.status_code == 200
    assert ignored.json()["outcome"] == "ignored_out_of_order"
    assert client.get("/api/v1/machines/filler-01").json()["state"] == "IDLE"


def test_unknown_equipment_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/machines/missing-01")
    assert response.status_code == 404
