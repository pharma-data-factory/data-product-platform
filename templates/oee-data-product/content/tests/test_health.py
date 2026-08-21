from fastapi.testclient import TestClient


def test_health_returns_up(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "UP"
    assert body["service"] == "oee-test"
    assert body["version"] == "1.0.0"
