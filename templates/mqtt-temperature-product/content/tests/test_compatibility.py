from copy import deepcopy

from app.compatibility import (
    compatibility_gate_should_fail,
    evaluate_compatibility,
    load_consumers,
    load_current_schema,
    load_published_schema,
    version_satisfies,
)

BASE_SCHEMA = {
    "version": "1.1.0",
    "required": ["eventId", "deviceId", "timestamp", "temperature", "unit"],
    "properties": {
        "eventId": {"type": "string"},
        "deviceId": {"type": "string"},
        "timestamp": {"type": "string"},
        "temperature": {"type": "number"},
        "unit": {"type": "string"},
    },
}

CONSUMER = {
    "name": "temperature-dashboard-consumer",
    "consumesContract": "temperature-event",
    "compatibleVersions": ["1.x"],
    "active": True,
}


def test_compatible_minor_schema_change() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["version"] = "1.2.0"
    nxt["properties"]["humidity"] = {"type": "number"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "COMPATIBLE"
    assert any(finding["rule"] == "new_optional_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is False


def test_removed_required_property_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["required"] = [field for field in nxt["required"] if field != "deviceId"]
    del nxt["properties"]["deviceId"]
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "BREAKING_CHANGE"
    assert report["blockedConsumers"] == ["temperature-dashboard-consumer"]
    assert any(finding["rule"] == "removed_required_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is True


def test_changed_field_type_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["properties"]["temperature"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "BREAKING_CHANGE"
    assert any(finding["rule"] == "changed_field_type" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is True


def test_new_optional_property_is_compatible() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["properties"]["qualityFlag"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "COMPATIBLE"
    assert any(finding["rule"] == "new_optional_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is False


def test_new_required_property_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["required"] = [*nxt["required"], "location"]
    nxt["properties"]["location"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "BREAKING_CHANGE"
    assert any(finding["rule"] == "new_required_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is True


def test_major_version_change_fails_for_active_1_x_consumer() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["version"] = "2.0.0"
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert version_satisfies("1.1.0", ["1.x"]) is True
    assert version_satisfies("2.0.0", ["1.x"]) is False
    assert report["status"] == "BREAKING_CHANGE"
    assert compatibility_gate_should_fail(report) is True


def test_current_contract_remains_compatible_with_active_consumers() -> None:
    published = load_published_schema()
    current = load_current_schema()
    consumers = load_consumers()
    report = evaluate_compatibility(published, current, consumers, contract="temperature-event")
    assert current["version"] == "1.1.0"
    assert any(consumer["name"] == "temperature-dashboard-consumer" for consumer in consumers)
    assert report["status"] == "COMPATIBLE"
    assert compatibility_gate_should_fail(report) is False
