import pytest
from jsonschema.exceptions import ValidationError

from app.contract import DATA_CONTRACT_VERSION, contract_file
from app.ingest import EventValidationError, validate_event, validate_payload
from tests.sample_event import sample_event


def test_contract_version_is_1_0_0() -> None:
    assert DATA_CONTRACT_VERSION == "1.0.0"
    assert contract_file().as_posix().endswith("contracts/machine-state-event.schema.json")


def test_valid_payload_matches_contract() -> None:
    validate_payload({"state": "RUNNING", "reason": None})
    validate_payload({"state": "MAINTENANCE"})


def test_invalid_state_fails_contract() -> None:
    with pytest.raises((ValidationError, EventValidationError)):
        validate_payload({"state": "DOWN"})


def test_envelope_requires_contract_reference() -> None:
    event = sample_event()
    event["contract"] = {"name": "other-event", "version": "1.0.0"}
    with pytest.raises(EventValidationError, match="Contract"):
        validate_event(event)


def test_naive_timestamp_is_rejected() -> None:
    event = sample_event(timestamp="2026-08-20T12:00:00")
    with pytest.raises(EventValidationError):
        validate_event(event)
