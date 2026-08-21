from copy import deepcopy

from dataprod.compatibility import (
    compatibility_gate_should_fail,
    evaluate_compatibility,
    load_compatibility_policy,
    version_satisfies,
)

BASE_SCHEMA = {
    "version": "1.0.0",
    "required": ["id", "name"],
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
    },
}

CONSUMER = {
    "name": "sample-consumer",
    "consumesContract": "sample-event",
    "compatibleVersions": ["1.x"],
    "active": True,
}


def test_removed_required_property_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["required"] = ["id"]
    del nxt["properties"]["name"]
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER], contract="sample-event")
    assert report["status"] == "BREAKING_CHANGE"
    assert any(finding["rule"] == "removed_required_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is True


def test_changed_field_type_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["properties"]["id"] = {"type": "number"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER], contract="sample-event")
    assert report["status"] == "BREAKING_CHANGE"
    assert any(finding["rule"] == "changed_field_type" for finding in report["findings"])


def test_new_optional_property_is_compatible() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["properties"]["label"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER], contract="sample-event")
    assert report["status"] == "COMPATIBLE"
    assert any(finding["rule"] == "new_optional_field" for finding in report["findings"])
    assert compatibility_gate_should_fail(report) is False


def test_new_required_property_is_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["required"] = [*nxt["required"], "site"]
    nxt["properties"]["site"] = {"type": "string"}
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER], contract="sample-event")
    assert report["status"] == "BREAKING_CHANGE"
    assert any(finding["rule"] == "new_required_field" for finding in report["findings"])


def test_major_version_change_is_potentially_breaking() -> None:
    nxt = deepcopy(BASE_SCHEMA)
    nxt["version"] = "2.0.0"
    report = evaluate_compatibility(BASE_SCHEMA, nxt, [CONSUMER], contract="sample-event")
    assert version_satisfies("1.0.0", ["1.x"]) is True
    assert version_satisfies("2.0.0", ["1.x"]) is False
    assert report["status"] == "BREAKING_CHANGE"
    assert any(finding["rule"] == "major_version_change" for finding in report["findings"])


def test_no_consumers_without_breaking_change_is_unknown() -> None:
    report = evaluate_compatibility(BASE_SCHEMA, deepcopy(BASE_SCHEMA), [], contract="sample-event")
    assert report["status"] == "UNKNOWN"


def test_policy_defines_required_schema_rules() -> None:
    ids = {rule["id"] for rule in load_compatibility_policy()["rules"]}
    assert ids == {
        "removed_required_field",
        "changed_field_type",
        "new_optional_field",
        "new_required_field",
        "major_version_change",
        "minor_or_patch_version_change",
        "consumer_version_mismatch",
    }
