from fastapi import FastAPI
from fastapi.testclient import TestClient
from pdf_observability import (
    Observability,
    ObservabilityMiddleware,
    configure_logging,
    health_check,
)


def test_metrics_and_error_counters() -> None:
    obs = Observability("demo")
    obs.metrics.incr("http_requests", 2)
    obs.error("boom")
    snap = obs.metrics.snapshot()
    assert snap["counters"]["http_requests"] == 2
    assert snap["counters"]["errors"] == 1


def test_request_correlation_and_timing() -> None:
    configure_logging()
    obs = Observability("demo")
    app = FastAPI()
    app.add_middleware(ObservabilityMiddleware, observability=obs)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"ok": "true"}

    client = TestClient(app)
    response = client.get("/ping", headers={"X-Request-ID": "corr-1"})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "corr-1"
    assert obs.metrics.snapshot()["counters"]["http_requests"] == 1
    assert "http_request_duration_seconds" in obs.metrics.snapshot()["timings"]


def test_observability_health_integration() -> None:
    obs = Observability("demo")
    obs.metrics.incr("http_requests")
    result = health_check(obs)()
    assert result.status == "UP"
    assert "requests=1" in (result.detail or "")


def test_secret_fields_are_redacted(caplog) -> None:
    configure_logging()
    caplog.set_level("ERROR")
    obs = Observability("demo")
    obs.error("failed", token="super-secret", password="hunter2", path="/health")
    record = caplog.records[-1]
    assert record.token == "***"
    assert record.password == "***"
    assert record.path == "/health"
    assert "super-secret" not in caplog.text
    assert "hunter2" not in caplog.text
