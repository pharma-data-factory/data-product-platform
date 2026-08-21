from fastapi import APIRouter, HTTPException
from fastapi.testclient import TestClient
from pdf_rest_api import create_rest_app
from pydantic import BaseModel

router = APIRouter()


class Item(BaseModel):
    name: str


@router.get("/items")
def items() -> list[dict[str, str]]:
    return [{"name": "ok"}]


@router.post("/items")
def create_item(item: Item) -> Item:
    return item


@router.get("/fail")
def fail() -> None:
    raise HTTPException(status_code=503, detail="unavailable")


@router.get("/crash")
def crash() -> None:
    raise RuntimeError("boom")


def test_rest_app_health_openapi_and_domain_routes() -> None:
    app = create_rest_app(service="api", version="1.0.0", routers=[router])
    client = TestClient(app, raise_server_exceptions=False)
    health = client.get("/health")
    assert health.json()["status"] == "UP"
    listed = client.get("/api/v1/items")
    assert listed.status_code == 200
    assert listed.json() == [{"name": "ok"}]
    created = client.post("/api/v1/items", json={"name": "n"})
    assert created.status_code == 200
    invalid = client.post("/api/v1/items", json={})
    assert invalid.status_code == 422
    failed = client.get("/api/v1/fail")
    assert failed.status_code == 503
    crashed = client.get("/api/v1/crash")
    assert crashed.status_code == 500
    assert crashed.json()["detail"] == "Internal Server Error"
    ping = client.get("/api/v1/items", headers={"X-Request-ID": "corr-42"})
    assert ping.headers["X-Request-ID"] == "corr-42"
    spec = client.get("/openapi.json")
    assert spec.status_code == 200
    assert "/api/v1/items" in spec.json()["paths"]
    assert app.state.api_prefix == "/api/v1"
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "UP"
    assert any(check["name"] == "observability" for check in ready.json()["checks"])
    assert client.get("/ping-missing").status_code == 404
    snap = app.state.observability.metrics.snapshot()["counters"]
    assert snap["http_requests"] >= 1
    assert snap["http_validation_errors"] == 1
