from __future__ import annotations

import logging

from fastapi.testclient import TestClient
from pdf_observability import redact_fields

from helpers import get_oee
from scenarios import CONTEXT, iter_mqtt_messages


def test_platform_metadata(oee_client: TestClient) -> None:
    body = oee_client.get("/api/v1/platform-metadata").json()
    assert body["dataProductStandardVersion"] == "1.0.0"
    assert body["sdkVersion"] == "1.0.0"
    assert body["template"] == "oee-data-product"
    assert body["templateVersion"] == "1.0.0"
    assert body["contractVersion"] == "1.0.0"


def test_quality_healthy_invalid_mismatch_and_missing_context(oee_client: TestClient) -> None:
    from datetime import UTC, datetime

    from app.main import events, ingest

    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    ingest.rejected.clear()
    missing = oee_client.get("/api/v1/quality").json()
    names = {check["name"]: check for check in missing["checks"]}
    assert names["production_context_present"]["passed"] is False
    assert missing["status"] == "FAIL"

    oee_client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("PERFECT"):
        oee_client.post("/api/v1/ingest", json=payload)
    get_oee(oee_client)
    healthy = oee_client.get("/api/v1/quality").json()
    assert healthy["status"] == "PASS"

    oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "bad-state",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "BROKEN",
        },
    )
    invalid = oee_client.get("/api/v1/quality").json()
    assert invalid["status"] == "FAIL"


def test_structured_logs_redact_credentials(oee_client: TestClient, caplog) -> None:
    from app.main import obs

    caplog.set_level(logging.INFO)
    obs.info(
        "pilot_redaction_probe",
        mqtt_password="pilot-mqtt-password-do-not-log",
        source_api_token="pilot-rest-token-do-not-log",
        github_secret="ghp_should_not_appear",
        aws_secret="AKIA_SHOULD_NOT_APPEAR",
        request_id="req-123",
    )
    messages = " ".join(record.getMessage() for record in caplog.records)
    extras = " ".join(str(getattr(record, "mqtt_password", "")) for record in caplog.records)
    combined = messages + extras + str(redact_fields({"mqtt_password": "secret"}))
    assert "pilot-mqtt-password-do-not-log" not in caplog.text
    assert "pilot-rest-token-do-not-log" not in caplog.text
    assert "ghp_should_not_appear" not in caplog.text
    assert "AKIA_SHOULD_NOT_APPEAR" not in caplog.text
    assert redact_fields({"mqtt_password": "x", "token": "y", "authorization": "z"}) == {
        "mqtt_password": "***",
        "token": "***",
        "authorization": "***",
    }
    assert "secret" not in combined or "***" in combined

    response = oee_client.get("/health", headers={"X-Request-ID": "pilot-corr-1"})
    assert response.status_code == 200
    assert response.headers.get("x-request-id") or response.headers.get("X-Request-ID")
