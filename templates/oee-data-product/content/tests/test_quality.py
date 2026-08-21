from fastapi.testclient import TestClient

from tests.test_api import CONTEXT, _load_perfect


def test_quality_report_passes_for_valid_events(client: TestClient) -> None:
    _load_perfect(client)
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PASS"
    assert body["contractVersion"] == "1.0.0"
    names = {check["name"] for check in body["checks"]}
    assert "machine_state_valid" in names
    assert "timestamp_valid" in names
    assert "counts_non_negative" in names


def test_quality_without_context_still_reports(client: TestClient) -> None:
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "FAIL"
    names = {check["name"]: check for check in body["checks"]}
    assert names["production_context_present"]["passed"] is False


def test_quality_fails_after_invalid_event(client: TestClient) -> None:
    _load_perfect(client)
    rejected = client.post(
        "/api/v1/ingest",
        json={
            "eventId": "bad-state",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "BROKEN",
        },
    )
    assert rejected.status_code == 400
    body = client.get("/api/v1/quality").json()
    assert body["status"] == "FAIL"
    names = {check["name"]: check for check in body["checks"]}
    assert names["machine_state_valid"]["passed"] is False


def test_quality_reports_count_mismatch(client: TestClient) -> None:
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
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "p1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "totalCount": 100,
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
            "goodCount": 80,
            "rejectCount": 30,
        },
    )
    oee = client.get(
        "/api/v1/oee/filler-01",
        params={
            "window": "custom",
            "from": "2026-08-20T08:00:00Z",
            "to": "2026-08-20T09:00:00Z",
        },
    ).json()
    assert oee["reconciliationStatus"] == "COUNT_MISMATCH"
    body = client.get("/api/v1/quality").json()
    names = {check["name"]: check for check in body["checks"]}
    assert names["count_mismatch"]["passed"] is False
    assert names["count_mismatch"]["mandatory"] is False
