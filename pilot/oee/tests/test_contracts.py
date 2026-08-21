from __future__ import annotations

from fastapi.testclient import TestClient

from helpers import get_oee
from scenarios import CONTEXT, iter_mqtt_messages


def test_invalid_machine_state_rejected(oee_client: TestClient) -> None:
    response = oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "bad-state",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "BROKEN",
        },
    )
    assert response.status_code == 400
    quality = oee_client.get("/api/v1/quality").json()
    assert quality["status"] == "FAIL"
    names = {check["name"]: check for check in quality["checks"]}
    assert names["machine_state_valid"]["passed"] is False
    assert oee_client.get("/health").status_code == 200


def test_negative_count_rejected(oee_client: TestClient) -> None:
    response = oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "neg",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "totalCount": -1,
        },
    )
    assert response.status_code == 400
    quality = oee_client.get("/api/v1/quality").json()
    assert quality["status"] == "FAIL"


def test_invalid_timestamp_rejected(oee_client: TestClient) -> None:
    response = oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "bad-ts",
            "equipmentId": "filler-01",
            "timestamp": "not-a-timestamp",
            "totalCount": 1,
        },
    )
    assert response.status_code == 400


def test_wrong_equipment_rejected(oee_client: TestClient) -> None:
    response = oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "wrong-eq",
            "equipmentId": "other-line",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "RUNNING",
        },
    )
    assert response.status_code == 400


def test_missing_production_context_is_incomplete(oee_client: TestClient) -> None:
    from datetime import UTC, datetime

    from app.main import events, ingest

    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    ingest.rejected.clear()
    oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "s1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "RUNNING",
        },
    )
    oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p0",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "totalCount": 0,
        },
    )
    oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "totalCount": 3600,
        },
    )
    body = get_oee(oee_client).json()
    assert body["calculationStatus"] == "INCOMPLETE"
    assert body["oee"] is None
    quality = oee_client.get("/api/v1/quality").json()
    names = {check["name"]: check for check in quality["checks"]}
    assert names["production_context_present"]["passed"] is False
    assert quality["status"] == "FAIL"


def test_duplicate_event_first_wins(oee_client: TestClient) -> None:
    from app.main import ingest

    oee_client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("DUPLICATE_EVENT"):
        oee_client.post("/api/v1/ingest", json=payload)
    body = get_oee(oee_client).json()
    assert body["totalCount"] == 3600
    assert body["oee"] == 1.0
    assert ingest.duplicate_count >= 1


def test_counter_reset_is_not_a_negative_delta(oee_client: TestClient) -> None:
    oee_client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("COUNTER_RESET"):
        assert oee_client.post("/api/v1/ingest", json=payload).status_code == 200
    body = get_oee(oee_client).json()
    assert body["totalCount"] == 250
    assert body["oee"] == 0.0694


def test_late_event_recalculates_same_window(oee_client: TestClient) -> None:
    oee_client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("LATE_EVENT"):
        if payload.get("eventId") == "s-late":
            continue
        oee_client.post("/api/v1/ingest", json=payload)
    before = get_oee(oee_client).json()
    assert before["windowStart"] == "2026-08-20T08:00:00Z"
    assert before["windowEnd"] == "2026-08-20T09:00:00Z"
    assert before["availability"] == 1.0
    first_calculated = before["calculatedAt"]
    late = {
        "eventId": "s-late",
        "equipmentId": "filler-01",
        "timestamp": "2026-08-20T08:55:00Z",
        "state": "STOPPED",
    }
    assert oee_client.post("/api/v1/ingest", json=late).status_code == 200
    after = get_oee(oee_client).json()
    assert after["windowStart"] == before["windowStart"]
    assert after["windowEnd"] == before["windowEnd"]
    assert after["windowKind"] == before["windowKind"]
    assert after["availability"] == 0.9167
    assert after["oee"] == 0.9167
    assert after["calculatedAt"] != first_calculated


def test_out_of_order_state_events(oee_client: TestClient) -> None:
    oee_client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("OUT_OF_ORDER"):
        assert oee_client.post("/api/v1/ingest", json=payload).status_code == 200
    body = get_oee(oee_client).json()
    assert body["availability"] == 0.9167
    assert body["oee"] == 0.9167
