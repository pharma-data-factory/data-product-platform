from __future__ import annotations

from fastapi.testclient import TestClient

from helpers import MQTT_HOST, MQTT_PORT, get_oee, wait_until
from publish import publish
from scenarios import SCENARIOS, iter_mqtt_messages


def _ingest_http(client: TestClient, scenario: str) -> None:
    from scenarios import CONTEXT

    assert client.post("/api/v1/ingest", json=CONTEXT).status_code == 200
    for _topic, payload in iter_mqtt_messages(scenario):
        if payload.get("state") == "BROKEN" or payload.get("totalCount", 0) < 0:
            client.post("/api/v1/ingest", json=payload)
            continue
        if payload.get("timestamp") == "not-a-timestamp" or payload.get("equipmentId") == "other-line":
            client.post("/api/v1/ingest", json=payload)
            continue
        assert client.post("/api/v1/ingest", json=payload).status_code in {200, 400}


def _ingest_mqtt(scenario: str) -> None:
    publish(MQTT_HOST, MQTT_PORT, scenario, delay_ms=20)


def _assert_expected(body: dict, expected: dict) -> None:
    for key, value in expected.items():
        actual = body[key] if key != "quality" else body["quality"]
        if key == "totalCount":
            assert body["totalCount"] == value
        elif key == "quality":
            assert body["quality"] == value
        else:
            assert actual == value, f"{key}: {actual} != {value}"


def test_scenario_a_perfect_via_api(oee_client: TestClient) -> None:
    _ingest_http(oee_client, "PERFECT")
    response = get_oee(oee_client)
    assert response.status_code == 200
    body = response.json()
    _assert_expected(body, SCENARIOS["PERFECT"]["expected"])
    assert body["calculationStatus"] == "VALID"


def test_scenario_b_downtime_via_api(oee_client: TestClient) -> None:
    _ingest_http(oee_client, "DOWNTIME")
    body = get_oee(oee_client).json()
    _assert_expected(body, SCENARIOS["DOWNTIME"]["expected"])


def test_scenario_c_slow_via_api(oee_client: TestClient) -> None:
    _ingest_http(oee_client, "SLOW")
    body = get_oee(oee_client).json()
    _assert_expected(body, SCENARIOS["SLOW"]["expected"])


def test_scenario_d_quality_loss_via_api(oee_client: TestClient) -> None:
    _ingest_http(oee_client, "QUALITY_LOSS")
    body = get_oee(oee_client).json()
    _assert_expected(body, SCENARIOS["QUALITY_LOSS"]["expected"])


def test_scenario_e_mixed_via_api(oee_client: TestClient) -> None:
    _ingest_http(oee_client, "MIXED")
    body = get_oee(oee_client).json()
    _assert_expected(body, SCENARIOS["MIXED"]["expected"])


def test_scenarios_a_e_via_mqtt(mqtt_client: TestClient) -> None:
    for name in ("PERFECT", "DOWNTIME", "SLOW", "QUALITY_LOSS", "MIXED"):
        from datetime import UTC, datetime

        from app.main import events, ingest

        events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
        events.forget_event_ids()
        ingest.rejected.clear()
        ingest.duplicate_count = 0
        ingest.refresh_context()
        expected = SCENARIOS[name]["expected"]
        _ingest_mqtt(name)
        body = wait_until(
            lambda expected=expected: (
                result.json()
                if (result := get_oee(mqtt_client)).status_code == 200
                and result.json().get("oee") == expected["oee"]
                else None
            ),
            timeout=20,
        )
        assert body is not None, f"MQTT scenario {name} did not reach expected OEE"
        _assert_expected(body, expected)
