import pytest
from jsonschema.exceptions import ValidationError

from app.contract import DATA_CONTRACT_VERSION, contract_file
from app.quality import load_contract_schema, validate_against_contract

VALID = {
    "equipmentId": "EQ-1001",
    "name": "Bioreactor 01",
    "site": "SITE-A",
    "status": "ACTIVE",
    "updatedAt": "2026-08-17T06:30:00Z",
}


def test_contract_version_is_1_0_0() -> None:
    schema = load_contract_schema()
    assert DATA_CONTRACT_VERSION == "1.0.0"
    assert schema["version"] == "1.0.0"
    assert contract_file().as_posix().endswith("contracts/equipment-event.schema.json")


def test_valid_record_matches_contract() -> None:
    validate_against_contract(VALID)
    validate_against_contract({**VALID, "status": "MAINTENANCE", "equipmentId": "EQ-1002"})


def test_schema_requires_canonical_fields() -> None:
    schema = load_contract_schema()
    assert schema["required"] == ["equipmentId", "name", "site", "status", "updatedAt"]
    assert schema["properties"]["equipmentId"]["minLength"] == 1
    assert schema["properties"]["status"]["enum"] == ["ACTIVE", "INACTIVE", "MAINTENANCE"]
    assert schema["properties"]["updatedAt"]["format"] == "date-time"
    assert schema["additionalProperties"] is False


def test_empty_equipment_id_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID, "equipmentId": ""})


def test_missing_name_fails_contract() -> None:
    payload = {key: value for key, value in VALID.items() if key != "name"}
    with pytest.raises(ValidationError):
        validate_against_contract(payload)


def test_invalid_status_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID, "status": "UNKNOWN"})


def test_invalid_updated_at_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID, "updatedAt": "not-a-datetime"})


def test_unknown_fields_fail_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID, "sapId": "x"})
