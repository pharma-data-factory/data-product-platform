from fastapi.testclient import TestClient

from app.config import Settings
from app.quality import evaluate
from tests.sample_event import sample_event

DEFAULT_SETTINGS = Settings()


def _check(report, name: str):
    return next(check for check in report.checks if check.name == name)


def test_empty_payloads_pass_quality_gate() -> None:
    report = evaluate([], DEFAULT_SETTINGS)
    assert report.status == "PASS"
    assert report.contractVersion == "1.0.0"
    assert all(check.passed and check.mandatory for check in report.checks)


def test_valid_machine_state_passes_quality_gate() -> None:
    stored = {
        "equipmentId": "filler-01",
        "state": "RUNNING",
        "reason": None,
        "eventId": "11111111-1111-4111-8111-111111111111",
        "timestamp": "2026-08-20T12:00:00+00:00",
        "site": "site-a",
        "area": "packaging",
        "line": "line-01",
    }
    report = evaluate([stored], DEFAULT_SETTINGS)
    assert report.status == "PASS"
    assert all(check.passed for check in report.checks)


def test_invalid_state_fails_quality_gate() -> None:
    stored = {
        "equipmentId": "filler-01",
        "state": "DOWN",
        "reason": None,
        "eventId": "11111111-1111-4111-8111-111111111111",
        "timestamp": "2026-08-20T12:00:00+00:00",
        "site": "site-a",
        "area": "packaging",
        "line": "line-01",
    }
    report = evaluate([stored], DEFAULT_SETTINGS)
    assert report.status == "FAIL"
    assert _check(report, "state_enum").passed is False


def test_quality_endpoint_passes_for_valid_stored_events(client: TestClient) -> None:
    created = client.post("/api/v1/events", json=sample_event())
    assert created.status_code == 201
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PASS"
    assert body["contractVersion"] == "1.0.0"
    assert {check["name"] for check in body["checks"]} >= {
        "eventId_not_empty",
        "timestamp_iso8601",
        "source_metadata_required",
        "state_enum",
        "contract_schema",
        "eventId_unique",
    }
