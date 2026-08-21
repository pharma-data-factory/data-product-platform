from fastapi.testclient import TestClient

from app.main import store

PAYLOAD = {
    "equipmentId": "EQ-1001",
    "name": "Bioreactor 01",
    "site": "SITE-A",
    "status": "ACTIVE",
    "updatedAt": "2026-08-17T06:30:00Z",
}


def test_post_and_list_equipment(client: TestClient) -> None:
    store.clear()
    created = client.post("/api/v1/equipment", json=PAYLOAD)
    assert created.status_code == 201
    body = created.json()
    assert body["equipmentId"] == "EQ-1001"
    assert body["name"] == "Bioreactor 01"
    assert body["status"] == "ACTIVE"

    listed = client.get("/api/v1/equipment")
    assert listed.status_code == 200
    assert any(item["equipmentId"] == "EQ-1001" for item in listed.json())


def test_same_equipment_id_updates_the_record(client: TestClient) -> None:
    store.clear()
    first = client.post("/api/v1/equipment", json=PAYLOAD)
    updated = {
        **PAYLOAD,
        "name": "Bioreactor 01 Refurbished",
        "status": "MAINTENANCE",
    }
    second = client.post("/api/v1/equipment", json=updated)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["name"] == "Bioreactor 01 Refurbished"
    assert second.json()["status"] == "MAINTENANCE"
    assert store.count() == 1


def test_post_rejects_invalid_status(client: TestClient) -> None:
    response = client.post("/api/v1/equipment", json={**PAYLOAD, "status": "UNKNOWN"})
    assert response.status_code == 422


def test_sync_is_disabled_without_source_url(client: TestClient) -> None:
    response = client.post("/api/v1/source/sync")
    assert response.status_code == 200
    assert response.json()["source"] == "disabled"
    assert response.json()["fetched"] == 0
