from fastapi import FastAPI
from fastapi.testclient import TestClient
from pdf_health import HealthCheckResult, liveness_payload, readiness_payload
from pdf_health.router import create_health_router


def test_liveness_is_up_without_dependencies() -> None:
    payload = liveness_payload("demo", "1.0.0")
    assert payload.model_dump() == {"status": "UP", "service": "demo", "version": "1.0.0", "checks": None}


def test_readiness_includes_optional_checks() -> None:
    def ok() -> HealthCheckResult:
        return HealthCheckResult(name="store", status="UP")

    def down() -> HealthCheckResult:
        return HealthCheckResult(name="mqtt", status="DOWN", detail="disconnected")

    payload = readiness_payload("demo", "1.0.0", [ok, down])
    assert payload.status == "DOWN"
    assert payload.checks is not None
    assert [item.name for item in payload.checks] == ["store", "mqtt"]


def test_health_router_liveness_and_readiness() -> None:
    def boom() -> HealthCheckResult:
        raise RuntimeError("store unavailable")

    app = FastAPI()
    app.include_router(create_health_router("svc", "1.2.3", checkers=[boom]))
    client = TestClient(app)
    live = client.get("/health")
    assert live.status_code == 200
    assert live.json() == {"status": "UP", "service": "svc", "version": "1.2.3"}
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "DOWN"
    assert ready.json()["checks"][0]["detail"] == "store unavailable"
