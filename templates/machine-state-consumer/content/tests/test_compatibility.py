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
    "required": ["state"],
    "properties": {
        "state": {"type": "string"},
        "reason": {"type": ["string", "null"]},
    },
}

CONSUMER = {
    "name": "machine-state-dashboard-consumer",
    "consumesContract": "machine-state-event",
    "compatibleVersions": ["1.x"],
    "active": True,
}


def test_compatible_optional_payload_field() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["version"] = "1.1.0"
    nxt["properties"]["operatorId"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "COMPATIBLE"
    assert any(finding["rule"] == "new_optional_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is False


def test_breaking_state_contract_is_major_version() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["version"] = "2.0.0"
    nxt["properties"]["state"] = {"type": "number"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER])
    assert report["status"] == "BREAKING_CHANGE"
    assert version_satisfies("2.0.0", ["1.x"]) is False
    assert compatibility_gate_should_fail(report) is True


def test_current_contract_remains_compatible_with_active_consumers() -> None:
    published = load_published_schema()
    current = load_current_schema()
    consumers = load_consumers()
    report = evaluate_compatibility(
        published,
        current,
        consumers,
        contract="machine-state-event",
    )
    assert current["version"] == "1.0.0"
    assert report["status"] == "COMPATIBLE"
    assert compatibility_gate_should_fail(report) is False
