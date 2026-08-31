from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from helpers import get_oee
from scenarios import CONTEXT, iter_mqtt_messages


def test_generated_runtime_has_no_backstage_dependency(generated_root: Path) -> None:
    for path in generated_root.joinpath("app").rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        assert "backstage" not in text.lower()
        assert "localhost:7007" not in text


def test_compose_stack_excludes_control_plane_and_uns() -> None:
    compose = Path(__file__).resolve().parents[1].joinpath("docker-compose.yml").read_text(
        encoding="utf-8",
    )
    assert "test-mes" in compose
    assert "mosquitto" in compose
    assert "generated/pilot-oee-line-01" in compose
    assert "backstage" not in compose.lower()
    assert "7007" not in compose
    assert "image: grafana" not in compose.lower()
    assert "bitnami/kafka" not in compose.lower()
    assert "neo4j" not in compose.lower()
    assert "kind: Deployment" not in compose


def test_runtime_works_without_control_plane(oee_client: TestClient) -> None:
    """This pytest session does not start Nexora / Backstage."""
    oee_client.post("/api/v1/ingest", json=CONTEXT)
    for _topic, payload in iter_mqtt_messages("PERFECT"):
        assert oee_client.post("/api/v1/ingest", json=payload).status_code == 200
    oee = get_oee(oee_client)
    assert oee.status_code == 200
    assert oee.json()["oee"] == 1.0
    assert oee_client.get("/health").status_code == 200
    assert oee_client.get("/health/ready").status_code == 200
    assert oee_client.get("/api/v1/quality").status_code == 200
    rest = next(
        item
        for item in oee_client.get("/health/ready").json()["checks"]
        if item["name"] == "rest-source"
    )
    assert rest["status"] == "UP"
