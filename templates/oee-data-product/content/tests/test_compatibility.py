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
    "version": "1.0.0",
    "required": ["equipmentId", "windowKind", "oee", "calculationStatus"],
    "properties": {
        "equipmentId": {"type": "string"},
        "windowKind": {"type": "string"},
        "oee": {"type": ["number", "null"]},
        "calculationStatus": {"type": "string"},
    },
}

CONSUMER = {
    "name": "oee-dashboard-consumer",
    "consumesContract": "oee-result",
    "compatibleVersions": ["1.x"],
    "active": True,
}


def test_compatible_minor_schema_change() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["version"] = "1.1.0"
    nxt["properties"]["shiftId"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "COMPATIBLE"
    assert compatibility_gate_should_fail(report) is False


def test_new_required_property_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["required"] = [*nxt["required"], "plantCode"]
    nxt["properties"]["plantCode"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "BREAKING_CHANGE"
    assert compatibility_gate_should_fail(report) is True


def test_current_contract_remains_compatible_with_active_consumers() -> None:
    published = load_published_schema()
    current = load_current_schema()
    consumers = load_consumers()
    report = evaluate_compatibility(published, current, consumers, contract="oee-result")
    assert current["version"] == "1.0.0"
    assert any(consumer["name"] == "oee-dashboard-consumer" for consumer in consumers)
    assert report["status"] == "COMPATIBLE"
    assert compatibility_gate_should_fail(report) is False
    assert version_satisfies("1.0.0", ["1.x"]) is True
