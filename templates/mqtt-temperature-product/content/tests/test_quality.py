from fastapi.testclient import TestClient

from app.config import Settings
from app.main import store
from app.quality import evaluate

VALID_EVENT = {
    "eventId": "evt-1",
    "deviceId": "probe-1",
    "timestamp": "2026-08-16T17:00:00Z",
    "temperature": 21.5,
    "unit": "C",
}

DEFAULT_SETTINGS = Settings(temperature_min=-50, temperature_max=150)


def _check(report, name: str):
    return next(check for check in report.checks if check.name == name)


def test_empty_payloads_pass_quality_gate() -> None:
    report = evaluate([], DEFAULT_SETTINGS)
    assert report.status == "PASS"
    assert report.contractVersion == "1.1.0"
    assert all(check.passed and check.mandatory for check in report.checks)


def test_valid_events_pass_quality_gate() -> None:
    report = evaluate(
        [
            VALID_EVENT,
            {**VALID_EVENT, "eventId": "evt-2", "unit": "F", "deviceId": "probe-2"},
        ],
        DEFAULT_SETTINGS,
    )
    assert report.contractVersion == "1.1.0"
    assert report.status == "PASS"
    assert report.checks
    assert all(check.mandatory for check in report.checks)
    assert all(check.passed and check.failedCount == 0 for check in report.checks)


def test_empty_device_id_fails_quality_gate() -> None:
    report = evaluate([{**VALID_EVENT, "deviceId": ""}], DEFAULT_SETTINGS)
    assert report.status == "FAIL"
    assert _check(report, "deviceId_not_empty").passed is False


def test_empty_event_id_fails_quality_gate() -> None:
    report = evaluate([{**VALID_EVENT, "eventId": ""}], DEFAULT_SETTINGS)
    assert report.status == "FAIL"
    assert _check(report, "eventId_not_empty").passed is False


def test_invalid_timestamp_fails_quality_gate() -> None:
    report = evaluate([{**VALID_EVENT, "timestamp": "16.08.2026"}], DEFAULT_SETTINGS)
    assert report.status == "FAIL"
    assert _check(report, "timestamp_iso8601").passed is False


def test_temperature_outside_limits_fails_quality_gate() -> None:
    report = evaluate([{**VALID_EVENT, "temperature": 999}], DEFAULT_SETTINGS)
    assert report.status == "FAIL"
    assert _check(report, "temperature_within_limits").passed is False


def test_temperature_limits_are_configurable() -> None:
    tight = Settings.model_construct(temperature_min=0.0, temperature_max=10.0)
    report = evaluate([VALID_EVENT], tight)
    assert report.status == "FAIL"
    assert _check(report, "temperature_within_limits").passed is False
    assert "0.0" in _check(report, "temperature_within_limits").message
    assert "10.0" in _check(report, "temperature_within_limits").message


def test_disallowed_unit_fails_quality_gate() -> None:
    report = evaluate([{**VALID_EVENT, "unit": "K"}], DEFAULT_SETTINGS)
    assert report.status == "FAIL"
    assert _check(report, "unit_allowed").passed is False


def test_quality_endpoint_passes_for_valid_stored_events(client: TestClient) -> None:
    store.clear()
    created = client.post("/api/v1/temperatures", json=VALID_EVENT)
    assert created.status_code == 201

    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PASS"
    assert body["contractVersion"] == "1.1.0"
    assert isinstance(body["checks"], list)
    assert {check["name"] for check in body["checks"]} >= {
        "deviceId_not_empty",
        "eventId_not_empty",
        "timestamp_iso8601",
        "temperature_within_limits",
        "unit_allowed",
    }
    assert all(check["mandatory"] is True for check in body["checks"])
    assert all(check["passed"] is True for check in body["checks"])


def test_quality_endpoint_fails_when_temperature_exceeds_limits(client: TestClient) -> None:
    store.clear()
    created = client.post(
        "/api/v1/temperatures",
        json={**VALID_EVENT, "eventId": "evt-hot", "temperature": 999},
    )
    assert created.status_code == 201

    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "FAIL"
    assert body["contractVersion"] == "1.1.0"
    temperature_check = next(
        check for check in body["checks"] if check["name"] == "temperature_within_limits"
    )
    assert temperature_check["mandatory"] is True
    assert temperature_check["passed"] is False
    assert temperature_check["failedCount"] >= 1
