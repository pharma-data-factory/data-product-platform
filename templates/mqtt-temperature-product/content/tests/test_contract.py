import pytest
from jsonschema.exceptions import ValidationError

from app.contract import DATA_CONTRACT_VERSION, contract_file
from app.quality import load_contract_schema, validate_against_contract

VALID_EVENT = {
    "eventId": "evt-1",
    "deviceId": "probe-1",
    "timestamp": "2026-08-16T17:00:00Z",
    "temperature": 21.5,
    "unit": "C",
}


def test_contract_version_is_1_1_0() -> None:
    schema = load_contract_schema()
    assert DATA_CONTRACT_VERSION == "1.1.0"
    assert schema["version"] == "1.1.0"
    assert contract_file().as_posix().endswith("contracts/temperature-event.schema.json")


def test_valid_event_matches_contract() -> None:
    validate_against_contract(VALID_EVENT)
    validate_against_contract(
        {**VALID_EVENT, "eventId": "evt-2", "unit": "F", "temperature": 70.0}
    )


def test_schema_requires_canonical_fields() -> None:
    schema = load_contract_schema()
    assert schema["required"] == ["eventId", "deviceId", "timestamp", "temperature", "unit"]
    assert schema["properties"]["eventId"]["minLength"] == 1
    assert schema["properties"]["deviceId"]["minLength"] == 1
    assert schema["properties"]["timestamp"]["format"] == "date-time"
    assert schema["properties"]["temperature"]["type"] == "number"
    assert schema["properties"]["unit"]["enum"] == ["C", "F"]
    assert schema["additionalProperties"] is False


def test_empty_event_id_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID_EVENT, "eventId": ""})


def test_missing_event_id_fails_contract() -> None:
    payload = {key: value for key, value in VALID_EVENT.items() if key != "eventId"}
    with pytest.raises(ValidationError):
        validate_against_contract(payload)


def test_empty_device_id_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID_EVENT, "deviceId": ""})


def test_invalid_timestamp_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID_EVENT, "timestamp": "not-a-datetime"})


def test_non_numeric_temperature_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID_EVENT, "temperature": "hot"})


def test_disallowed_unit_fails_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID_EVENT, "unit": "K"})


def test_unknown_fields_fail_contract() -> None:
    with pytest.raises(ValidationError):
        validate_against_contract({**VALID_EVENT, "humidity": 40})
