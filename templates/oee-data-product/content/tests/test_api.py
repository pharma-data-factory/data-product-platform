from fastapi.testclient import TestClient

CONTEXT = {
    "contextId": "ctx-1",
    "equipmentId": "filler-01",
    "plannedStart": "2026-08-20T08:00:00Z",
    "plannedEnd": "2026-08-20T09:00:00Z",
    "idealCycleTimeSeconds": 1.0,
    "timestamp": "2026-08-20T07:55:00Z",
    "orderId": "po-1042",
}


def _load_perfect(client: TestClient) -> None:
    assert client.post("/api/v1/ingest", json=CONTEXT).status_code == 200
    assert client.post(
        "/api/v1/ingest",
        json={
            "eventId": "s1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "RUNNING",
        },
    ).status_code == 200
    assert client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p0",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "totalCount": 0,
        },
    ).status_code == 200
    assert client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "totalCount": 3600,
        },
    ).status_code == 200
    assert client.post(
        "/api/v1/ingest",
        json={
            "eventId": "q0",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "goodCount": 0,
            "rejectCount": 0,
        },
    ).status_code == 200
    assert client.post(
        "/api/v1/ingest",
        json={
            "eventId": "q1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "goodCount": 3600,
            "rejectCount": 0,
        },
    ).status_code == 200


def test_perfect_oee_via_api(client: TestClient) -> None:
    _load_perfect(client)
    response = client.get(
        "/api/v1/oee/filler-01",
        params={
            "window": "custom",
            "from": "2026-08-20T08:00:00Z",
            "to": "2026-08-20T09:00:00Z",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["availability"] == 1.0
    assert body["performance"] == 1.0
    assert body["quality"] == 1.0
    assert body["oee"] == 1.0
    assert body["calculationStatus"] == "COMPLETE"
    assert body["oee"] != None


def test_zero_is_not_incomplete(client: TestClient) -> None:
    client.post("/api/v1/ingest", json=CONTEXT)
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "s1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "RUNNING",
        },
    )
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p0",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "totalCount": 0,
        },
    )
    body = client.get(
        "/api/v1/oee/filler-01",
        params={
            "window": "custom",
            "from": "2026-08-20T08:00:00Z",
            "to": "2026-08-20T09:00:00Z",
        },
    ).json()
    assert body["oee"] is None
    assert body["calculationStatus"] == "MISSING_QUALITY_DATA"


def test_invalid_window_is_400(client: TestClient) -> None:
    response = client.get(
        "/api/v1/oee/filler-01",
        params={
            "window": "custom",
            "from": "2026-08-20T09:00:00Z",
            "to": "2026-08-20T08:00:00Z",
        },
    )
    assert response.status_code == 400


def test_invalid_state_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ingest",
        json={
            "eventId": "bad",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "BROKEN",
        },
    )
    assert response.status_code == 400


def test_storage_unavailable_is_503(client: TestClient) -> None:
    from app.main import events

    events.storage_error = "disk full"
    response = client.get("/api/v1/oee/filler-01")
    assert response.status_code == 503
    assert "oee" not in response.json() or response.json().get("oee") != 0
    events.storage_error = None


def test_unknown_equipment_is_404(client: TestClient) -> None:
    response = client.get("/api/v1/oee/unknown-line")
    assert response.status_code == 404
    assert response.json().get("oee") != 0


def test_rest_unavailable_is_incomplete_not_zero(client: TestClient) -> None:
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "s1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "RUNNING",
        },
    )
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p0",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "totalCount": 0,
        },
    )
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "totalCount": 3600,
        },
    )
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "q0",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "goodCount": 0,
            "rejectCount": 0,
        },
    )
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "q1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "goodCount": 3600,
            "rejectCount": 0,
        },
    )
    response = client.get(
        "/api/v1/oee/filler-01",
        params={
            "window": "custom",
            "from": "2026-08-20T08:00:00Z",
            "to": "2026-08-20T09:00:00Z",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["availability"] == 1.0
    assert body["performance"] is None
    assert body["oee"] is None
    assert body["calculationStatus"] == "MISSING_PRODUCTION_CONTEXT"


def test_mqtt_unavailable_health_is_down(client: TestClient) -> None:
    from app.main import mqtt

    previous_host = mqtt.settings.host
    previous_connected = mqtt.connected
    mqtt.settings.host = "broker.example"
    mqtt.connected = False
    mqtt.last_error = "disconnected"
    try:
        ready = client.get("/health/ready")
        mqtt_check = next(item for item in ready.json()["checks"] if item["name"] == "mqtt")
        assert mqtt_check["status"] == "DOWN"
    finally:
        mqtt.settings.host = previous_host
        mqtt.connected = previous_connected


def test_mqtt_disabled_health_ready(client: TestClient) -> None:
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    mqtt = next(item for item in ready.json()["checks"] if item["name"] == "mqtt")
    assert mqtt["status"] == "UP"
    assert mqtt["detail"] == "disabled"
