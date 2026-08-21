from __future__ import annotations

import subprocess
import time

import httpx
from fastapi.testclient import TestClient

from helpers import MQTT_CONTAINER, get_oee, health_check, wait_until
from scenarios import CONTEXT, iter_mqtt_messages
from test_mes import state as mes_state


def _load_perfect(client: TestClient) -> None:
    client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("PERFECT"):
        assert client.post("/api/v1/ingest", json=payload).status_code == 200
    assert get_oee(client).json()["oee"] == 1.0


def _set_mes_mode(mes_url: str, mode: str) -> None:
    response = httpx.post(f"{mes_url}/api/v1/test-mode", json={"mode": mode}, timeout=5)
    assert response.status_code == 200
    mes_state["mode"] = mode


def test_mes_timeout_keeps_service_alive(oee_client: TestClient, mes_url: str) -> None:
    from datetime import UTC, datetime

    from app.main import events, ingest

    _set_mes_mode(mes_url, "TIMEOUT")
    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    ingest.refresh_context()
    assert ingest.rest_error
    ready = health_check(oee_client, "rest-source")
    assert ready["status"] == "DOWN"
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
    assert oee_client.get("/health").status_code == 200
    _set_mes_mode(mes_url, "NORMAL")


def test_mes_http_500(oee_client: TestClient, mes_url: str) -> None:
    from datetime import UTC, datetime

    from app.main import events, ingest

    _set_mes_mode(mes_url, "HTTP_500")
    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    ingest.refresh_context()
    assert ingest.rest_error
    assert health_check(oee_client, "rest-source")["status"] == "DOWN"
    assert oee_client.get("/api/v1/quality").status_code == 200
    _set_mes_mode(mes_url, "NORMAL")


def test_mes_invalid_contract(oee_client: TestClient, mes_url: str) -> None:
    from datetime import UTC, datetime

    from app.main import events, ingest

    _set_mes_mode(mes_url, "INVALID_CONTRACT")
    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    ingest.refresh_context()
    assert ingest.rest_error
    assert oee_client.get("/health").status_code == 200
    _set_mes_mode(mes_url, "NORMAL")


def test_mes_missing_ideal_cycle(oee_client: TestClient, mes_url: str) -> None:
    from datetime import UTC, datetime

    from app.main import events, ingest

    _set_mes_mode(mes_url, "MISSING_IDEAL_CYCLE")
    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    ingest.refresh_context()
    assert ingest.rest_error
    quality = oee_client.get("/api/v1/quality").json()
    names = {check["name"]: check for check in quality["checks"]}
    assert names["ideal_cycle_time"]["passed"] is False or names["production_context_present"]["passed"] is False
    _set_mes_mode(mes_url, "NORMAL")


def test_mqtt_stop_reconnect_without_oee_restart(mqtt_client: TestClient) -> None:
    _load_perfect(mqtt_client)
    stored = get_oee(mqtt_client).json()
    subprocess.run(["docker", "stop", MQTT_CONTAINER], check=True, capture_output=True)
    down = wait_until(
        lambda: health_check(mqtt_client, "mqtt")["status"] == "DOWN",
        timeout=45,
    )
    assert down
    still = get_oee(mqtt_client)
    assert still.status_code == 200
    assert still.json()["oee"] == stored["oee"]
    assert mqtt_client.get("/api/v1/quality").status_code == 200
    subprocess.run(["docker", "start", MQTT_CONTAINER], check=True, capture_output=True)
    time.sleep(1)
    up = wait_until(
        lambda: health_check(mqtt_client, "mqtt")["status"] == "UP",
        timeout=30,
    )
    assert up, "MQTT consumer did not reconnect without restarting OEE"


def test_storage_unavailable_is_503(oee_client: TestClient) -> None:
    from app.main import events

    _load_perfect(oee_client)
    events.storage_error = "unwritable"
    response = get_oee(oee_client)
    assert response.status_code == 503
    assert response.json().get("oee") not in {0, 0.0, 1.0}
    ingest_response = oee_client.post("/api/v1/ingest", json=CONTEXT)
    assert ingest_response.status_code == 503
    assert health_check(oee_client, "timeseries")["status"] == "DOWN"
    events.storage_error = None


def test_restart_sqlite_persists(oee_client: TestClient) -> None:
    from app.main import events

    _load_perfect(oee_client)
    before = get_oee(oee_client).json()
    events.store.close()
    events.forget_event_ids()
    events.initialize()
    after = get_oee(oee_client).json()
    assert after["oee"] == before["oee"]
    assert after["windowStart"] == before["windowStart"]
    extra = {
        "eventId": "p-after-restart",
        "equipmentId": "filler-01",
        "timestamp": "2026-08-20T08:30:00Z",
        "totalCount": 1800,
    }
    assert oee_client.post("/api/v1/ingest", json=extra).status_code == 200
    again = get_oee(oee_client).json()
    assert again["calculationStatus"] in {"VALID", "NO_PRODUCTION", "INCOMPLETE", "PENDING_LATE_DATA"}
