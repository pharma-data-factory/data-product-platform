from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health_returns_up_without_broker() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "UP"
    assert payload["service"] == "${{ values.name }}"
    assert payload["version"] == "${{ values.version }}"
    assert payload["mqttEnabled"] is False
    assert payload["mqttConnected"] is False
