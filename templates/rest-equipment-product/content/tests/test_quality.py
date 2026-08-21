from fastapi.testclient import TestClient

from app.main import store
from app.quality import evaluate

VALID = {
    "equipmentId": "EQ-1001",
    "name": "Bioreactor 01",
    "site": "SITE-A",
    "status": "ACTIVE",
    "updatedAt": "2026-08-17T06:30:00Z",
}


def _check(report, name: str):
    return next(check for check in report.checks if check.name == name)


def test_empty_payloads_pass_quality_gate() -> None:
    report = evaluate([])
    assert report.status == "PASS"
    assert report.contractVersion == "1.0.0"
    assert all(check.passed and check.mandatory for check in report.checks)


def test_valid_records_pass_quality_gate() -> None:
    report = evaluate([VALID, {**VALID, "equipmentId": "EQ-1002", "status": "INACTIVE"}])
    assert report.status == "PASS"
    assert report.contractVersion == "1.0.0"
    assert all(check.passed and check.failedCount == 0 for check in report.checks)


def test_empty_equipment_id_fails() -> None:
    report = evaluate([{**VALID, "equipmentId": ""}])
    assert report.status == "FAIL"
    assert _check(report, "equipmentId_not_empty").passed is False


def test_duplicate_equipment_id_fails_uniqueness() -> None:
    report = evaluate([VALID, {**VALID, "name": "Other"}])
    assert report.status == "FAIL"
    assert _check(report, "equipmentId_unique").passed is False


def test_empty_name_fails() -> None:
    report = evaluate([{**VALID, "name": ""}])
    assert report.status == "FAIL"
    assert _check(report, "name_not_empty").passed is False


def test_empty_site_fails() -> None:
    report = evaluate([{**VALID, "site": ""}])
    assert report.status == "FAIL"
    assert _check(report, "site_not_empty").passed is False


def test_invalid_status_fails() -> None:
    report = evaluate([{**VALID, "status": "UNKNOWN"}])
    assert report.status == "FAIL"
    assert _check(report, "status_allowed").passed is False


def test_invalid_updated_at_fails() -> None:
    report = evaluate([{**VALID, "updatedAt": "17.08.2026"}])
    assert report.status == "FAIL"
    assert _check(report, "updatedAt_iso8601").passed is False


def test_malformed_record_fails_contract_schema() -> None:
    report = evaluate([{**VALID, "extra": "nope"}])
    assert report.status == "FAIL"
    assert _check(report, "contract_schema").passed is False


def test_quality_endpoint_uses_stored_records(client: TestClient) -> None:
    store.clear()
    client.post("/api/v1/equipment", json=VALID)
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PASS"
    assert body["contractVersion"] == "1.0.0"
    assert body["checks"]
