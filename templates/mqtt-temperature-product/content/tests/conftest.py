import json
import os
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_TEST_DB = Path(__file__).resolve().parent / ".pytest-data" / "temperatures.db"
_TEST_DB.parent.mkdir(parents=True, exist_ok=True)
os.environ["SQLITE_PATH"] = str(_TEST_DB)
os.environ["MQTT_HOST"] = ""
os.environ["TEMPERATURE_MIN"] = "-50"
os.environ["TEMPERATURE_MAX"] = "150"

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


# Test evidence for Nexora (NXD-122). Each test names the URS requirements it
# verifies with @pytest.mark.urs("URS-EPM-001"); every pytest invocation
# writes one JSON file of outcomes into test-evidence/, and CI uploads the
# directory as the artifact "nexora-test-evidence". Nexora reads that
# artifact to record per-requirement test executions. No plugin, no
# dependency: three hooks.
_EVIDENCE_DIR = Path(os.environ.get("NEXORA_TEST_EVIDENCE_DIR", "test-evidence"))
_REQUIREMENTS_BY_TEST: dict[str, list[str]] = {}
_RESULTS: list[dict[str, object]] = []


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers", "urs(*ids): URS requirement ids this test verifies"
    )


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        ids: set[str] = set()
        for mark in item.iter_markers(name="urs"):
            ids.update(str(arg) for arg in mark.args)
        _REQUIREMENTS_BY_TEST[item.nodeid] = sorted(ids)


def pytest_runtest_logreport(report: pytest.TestReport) -> None:
    # One entry per test: its call, or its setup when the test never got that
    # far. A failed setup is an error, not a pass.
    if report.when == "call" or (report.when == "setup" and not report.passed):
        outcome = "error" if report.when == "setup" and report.failed else report.outcome
        _RESULTS.append(
            {
                "testCase": report.nodeid,
                "outcome": outcome,
                "requirements": _REQUIREMENTS_BY_TEST.get(report.nodeid, []),
            }
        )


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    if not _RESULTS:
        return
    _EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "apiVersion": "nexora.test-evidence/v1",
        "commit": os.environ.get("GITHUB_SHA"),
        "runId": os.environ.get("GITHUB_RUN_ID"),
        "suite": " ".join(session.config.invocation_params.args) or "pytest",
        "results": _RESULTS,
    }
    path = _EVIDENCE_DIR / f"{uuid.uuid4().hex}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

