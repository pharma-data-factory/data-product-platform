from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

PC = Path(__file__).resolve().parents[3]
for rel in (
    "operations/health/src",
    "operations/observability/src",
    "integration/rest-api/src",
    "asset-semantic/aas-foundation/src",
):
    sys.path.insert(0, str(PC / rel))

from pdf_aas.main import create_app
from pdf_aas.repository import SqliteAasRepository
from pdf_aas.seed import seed_reference_assets


def client(tmp_path: Path) -> TestClient:
    repo = SqliteAasRepository(tmp_path / "aas.sqlite")
    seed_reference_assets(repo)
    return TestClient(create_app(repo))


def test_health_and_crud(tmp_path: Path) -> None:
    api = client(tmp_path)
    live = api.get("/health")
    assert live.status_code == 200
    assert live.json()["status"] == "UP"
    ready = api.get("/health/ready")
    assert ready.status_code == 200
    assets = api.get("/api/v1/assets")
    assert assets.status_code == 200
    ids = {item["id"] for item in assets.json()}
    assert "filler-01" in ids
    created = api.post(
        "/api/v1/assets",
        json={"id": "capper-01", "displayName": "Capper 01", "assetType": "Capper"},
        headers={"x-aas-actor": "tester"},
    )
    assert created.status_code == 201
    duplicate = api.post(
        "/api/v1/assets",
        json={"id": "capper-01", "displayName": "Capper 01"},
        headers={"x-aas-actor": "tester"},
    )
    assert duplicate.status_code == 409
    missing = api.get("/api/v1/assets/unknown")
    assert missing.status_code == 404
    updated = api.put(
        "/api/v1/assets/capper-01",
        json={"description": "Updated"},
        headers={"x-aas-actor": "tester"},
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Updated"


def test_property_endpoint_and_audit(tmp_path: Path) -> None:
    api = client(tmp_path)
    speed = api.get("/api/v1/assets/filler-01/properties/speed")
    assert speed.status_code == 200
    assert speed.json()["unit"] == "rpm"
    endpoint = api.get("/api/v1/assets/filler-01/properties/speed/endpoint")
    assert endpoint.json()["topic"].endswith("/filler-01/speed/value")
    lookup = api.get("/api/v1/resolve/assets/filler-01/properties/speed")
    assert lookup.json()["unit"] == "rpm"
    added = api.post(
        "/api/v1/assets/filler-01/properties",
        json={
            "id": "reject-count",
            "idShort": "RejectCount",
            "name": "Reject Count",
            "dataType": "integer",
            "unit": "1",
            "semanticId": {
                "type": "ExternalReference",
                "keys": [{"type": "GlobalReference", "value": "https://example.org/semantics/reject-count"}],
            },
            "connectivity": {
                "protocol": "REST",
                "endpoint": "http://mes.example/counts",
                "contract": "quality-count-event",
                "contractVersion": "1.0.0",
            },
        },
        headers={"x-aas-actor": "owner"},
    )
    assert added.status_code == 201
    secret = api.post(
        "/api/v1/assets/filler-01/properties",
        json={
            "id": "bad",
            "idShort": "Bad",
            "name": "Bad",
            "dataType": "string",
            "connectivity": {"protocol": "MQTT", "topic": "x", "endpoint": "token=super-secret"},
        },
        headers={"x-aas-actor": "owner"},
    )
    assert secret.status_code == 400
    audit = api.get("/api/v1/audit", params={"assetId": "filler-01"})
    actions = {item["action"] for item in audit.json()}
    assert "asset.seeded" in actions
    assert "property.added" in actions
    rels = api.get("/api/v1/assets/filler-01/relationships")
    assert rels.json()[0]["firstAssetId"] == "line-01"
    submodels = api.get("/api/v1/assets/filler-01/submodels")
    shorts = {item["idShort"] for item in submodels.json()}
    assert shorts == {
        "Identification",
        "TechnicalData",
        "OperationalDataDefinition",
        "Sensors",
        "Connectivity",
    }


def test_machine_metrics_conceptual_lookup(tmp_path: Path) -> None:
    api = client(tmp_path)
    resolved = api.get("/api/v1/resolve/assets/filler-01/properties/speed").json()
    assert resolved["assetId"] == "filler-01"
    assert resolved["propertyId"] == "speed"
    assert resolved["unit"] == "rpm"
    assert resolved["connectivity"]["protocol"] == "MQTT"
    assert "machine-metrics" not in str(resolved).lower()
