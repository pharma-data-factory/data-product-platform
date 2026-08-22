from fastapi.testclient import TestClient

WINDOW = {
    "window": "custom",
    "from": "2026-08-20T08:00:00Z",
    "to": "2026-08-20T09:00:00Z",
}


def _post_state(client: TestClient, event_id: str, timestamp: str, state: str, **extra) -> None:
    body = {
        "eventId": event_id,
        "equipmentId": "filler-01",
        "timestamp": timestamp,
        "state": state,
        **extra,
    }
    assert client.post("/api/v1/equipment-states", json=body).status_code == 200


def test_capture_state_computes_duration(client: TestClient) -> None:
    _post_state(client, "s0", "2026-08-20T08:00:00Z", "RUNNING")
    _post_state(client, "s1", "2026-08-20T08:10:00Z", "STOPPED")
    _post_state(client, "s2", "2026-08-20T08:10:10Z", "RUNNING")
    rows = client.get("/api/v1/equipment-states", params={"equipmentId": "filler-01", **WINDOW}).json()
    stopped = next(item for item in rows if item["state"] == "STOPPED")
    assert stopped["durationSeconds"] == 10
    assert stopped["start"] == "2026-08-20T08:10:00Z"
    assert stopped["end"] == "2026-08-20T08:10:10Z"


def test_microstops_and_reason_assignment(client: TestClient) -> None:
    _post_state(client, "s0", "2026-08-20T08:00:00Z", "RUNNING")
    _post_state(client, "s1", "2026-08-20T08:10:00Z", "STOPPED", signal="jam")
    _post_state(client, "s2", "2026-08-20T08:10:10Z", "RUNNING")
    losses = client.get("/api/v1/losses", params={"equipmentId": "filler-01", **WINDOW}).json()
    assert len(losses) == 1
    assert losses[0]["classification"] == "MICROSTOP"
    assert losses[0]["reasonCodeId"] == "JAM"
    assert losses[0]["assignmentSource"] == "AUTOMATIC"
    patched = client.patch(
        f"/api/v1/losses/{losses[0]['lossId']}/reason",
        json={"reasonCodeId": "LABEL_STUCK", "user": "operator.1"},
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["reasonCodeId"] == "LABEL_STUCK"
    assert body["assignmentSource"] == "MANUAL"
    assert body["originalReasonCodeId"] == "JAM"
    assert body["previousReasonCodeId"] == "JAM"
    assert body["assignedBy"] == "operator.1"


def test_reason_codes_are_hierarchical(client: TestClient) -> None:
    codes = client.get("/api/v1/reason-codes").json()
    by_id = {item["reasonCodeId"]: item for item in codes}
    assert by_id["UNKNOWN"]["active"] is True
    assert by_id["LABEL_STUCK"]["parentReasonCodeId"] == "JAM"
    created = client.post(
        "/api/v1/reason-codes",
        json={
            "reasonCodeId": "BELT",
            "name": "Belt",
            "description": "Conveyor belt",
            "parentReasonCodeId": "EQUIPMENT",
            "active": True,
        },
    )
    assert created.status_code == 200
    inactive = client.patch("/api/v1/reason-codes/BELT", json={"active": False})
    assert inactive.json()["active"] is False
    active_only = {item["reasonCodeId"] for item in client.get("/api/v1/reason-codes").json()}
    assert "BELT" not in active_only


def test_configurable_microstop_threshold(client: TestClient) -> None:
    assert client.put(
        "/api/v1/loss-config",
        json={"equipmentId": "filler-01", "microstopMinSeconds": 3, "microstopMaxSeconds": 8},
    ).status_code == 200
    _post_state(client, "s0", "2026-08-20T08:00:00Z", "RUNNING")
    _post_state(client, "s1", "2026-08-20T08:10:00Z", "STOPPED")
    _post_state(client, "s2", "2026-08-20T08:10:10Z", "RUNNING")
    losses = client.get("/api/v1/losses", params={"equipmentId": "filler-01", **WINDOW}).json()
    assert losses[0]["classification"] == "UNPLANNED_DOWNTIME"


def test_loss_tree_pareto_reliability_and_history(client: TestClient) -> None:
    client.post(
        "/api/v1/ingest",
        json={
            "contextId": "ctx-1",
            "equipmentId": "filler-01",
            "plannedStart": "2026-08-20T08:00:00Z",
            "plannedEnd": "2026-08-20T09:00:00Z",
            "idealCycleTimeSeconds": 1.0,
            "timestamp": "2026-08-20T07:55:00Z",
            "orderId": "po-1042",
            "line": "line-01",
            "batchId": "b-9",
            "materialId": "sku-500",
            "shiftId": "shift-a",
        },
    )
    _post_state(client, "s0", "2026-08-20T08:00:00Z", "RUNNING")
    _post_state(client, "s1", "2026-08-20T08:10:00Z", "STOPPED", signal="fault")
    _post_state(client, "s2", "2026-08-20T08:15:00Z", "RUNNING")
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
            "totalCount": 3000,
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
            "reworkCount": 0,
        },
    )
    client.post(
        "/api/v1/ingest",
        json={
            "eventId": "q1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:59:59Z",
            "goodCount": 2970,
            "rejectCount": 30,
            "reworkCount": 5,
        },
    )
    tree = client.get("/api/v1/loss-tree", params={"equipmentId": "filler-01", **WINDOW}).json()
    assert tree["oee"]["availability"] is not None
    assert tree["oee"]["oee"] is not None
    assert tree["lossTree"]["availabilityLoss"]["breakdown"]["occurrences"] == 1
    pareto = client.get(
        "/api/v1/losses/pareto",
        params={"equipmentId": "filler-01", "rankBy": "duration", **WINDOW},
    ).json()
    assert pareto[0]["classification"] == "EQUIPMENT_FAILURE"
    reliability = client.get(
        "/api/v1/reliability/filler-01",
        params=WINDOW,
    ).json()
    assert reliability["failureCount"] == 1
    assert reliability["mttrSeconds"] == 300
    history = client.get(
        "/api/v1/oee/filler-01/history-with-losses",
        params={**WINDOW, "line": "line-01", "batchId": "b-9", "product": "sku-500", "shiftId": "shift-a"},
    )
    assert history.status_code == 200
    body = history.json()
    assert body["oee"]["quality"] == 0.99
    assert len(body["losses"]) == 1
    missing = client.get(
        "/api/v1/oee/filler-01",
        params={**WINDOW, "line": "other-line"},
    )
    assert missing.status_code == 404


def test_planned_stop_alias_and_openapi(client: TestClient) -> None:
    captured = client.post(
        "/api/v1/equipment-states",
        json={
            "eventId": "plan-1",
            "equipmentId": "filler-01",
            "start": "2026-08-20T08:00:00Z",
            "end": "2026-08-20T08:10:00Z",
            "state": "PLANNED_STOP",
        },
    )
    assert captured.status_code == 200
    rows = client.get("/api/v1/equipment-states", params={"equipmentId": "filler-01", **WINDOW}).json()
    assert rows[0]["state"] == "MAINTENANCE"
    assert rows[0]["durationSeconds"] == 600
    spec = client.get("/openapi.json").json()
    assert "/api/v1/losses" in spec["paths"]
    assert "/api/v1/reason-codes" in spec["paths"]
    assert "/health" in spec["paths"]
    assert "/health/ready" in spec["paths"]
