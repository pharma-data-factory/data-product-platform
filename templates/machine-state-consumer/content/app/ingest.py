from __future__ import annotations

from pydantic import ValidationError

from app.contract import DATA_CONTRACT_VERSION, contract_file
from app.models import UnsEvent
from dataprod.contracts import load_json_schema, validate_against_schema

CONTRACT_NAME = "machine-state-event"
EVENT_TYPE = "machine-state"


class EventValidationError(ValueError):
    """Raised when an inbound UNS machine-state event is malformed."""


def validate_envelope(document: dict) -> UnsEvent:
    try:
        event = UnsEvent.model_validate(document)
    except ValidationError as error:
        raise EventValidationError(error.errors()[0]["msg"]) from error
    if event.contract.name != CONTRACT_NAME:
        raise EventValidationError(
            f"Contract '{event.contract.name}' is not '{CONTRACT_NAME}'",
        )
    if event.contract.version != DATA_CONTRACT_VERSION:
        raise EventValidationError(
            f"Contract version '{event.contract.version}' is not '{DATA_CONTRACT_VERSION}'",
        )
    if event.type != EVENT_TYPE:
        raise EventValidationError(
            f"Event type '{event.type}' is not '{EVENT_TYPE}'",
        )
    return event


def validate_payload(payload: dict) -> None:
    try:
        validate_against_schema(payload, load_json_schema(contract_file()))
    except Exception as error:
        raise EventValidationError(str(error)) from error


def validate_event(document: dict) -> UnsEvent:
    event = validate_envelope(document)
    validate_payload(event.payload)
    return event
