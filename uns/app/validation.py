from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from pydantic import ValidationError

from app.envelope import UnsEvent
from app.namespace import NamespaceError, parse_topic
from app.registry import ContractRegistry, TopicContract


class EventValidationError(ValueError):
    """Raised when an inbound UNS event is malformed."""


def _schema_validator(schema_path: Path) -> Draft202012Validator:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    return Draft202012Validator(schema)


def parse_event_document(raw: str | bytes | dict[str, Any]) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    try:
        document = json.loads(raw)
    except json.JSONDecodeError as error:
        raise EventValidationError("Event payload must be JSON") from error
    if not isinstance(document, dict):
        raise EventValidationError("Event JSON must be an object")
    return document


def validate_envelope(document: dict[str, Any]) -> UnsEvent:
    try:
        return UnsEvent.model_validate(document)
    except ValidationError as error:
        raise EventValidationError(error.errors()[0]["msg"]) from error


def validate_against_contract(
    event: UnsEvent,
    contract: TopicContract,
    schema_path: Path,
) -> None:
    if event.contract.name != contract.contract:
        raise EventValidationError(
            f"Contract '{event.contract.name}' does not match topic contract '{contract.contract}'",
        )
    if event.contract.version != contract.contract_version:
        raise EventValidationError(
            f"Contract version '{event.contract.version}' does not match "
            f"'{contract.contract_version}'",
        )
    if event.type != contract.event_type:
        raise EventValidationError(
            f"Event type '{event.type}' does not match contract event '{contract.event_type}'",
        )
    errors = sorted(
        _schema_validator(schema_path).iter_errors(event.payload),
        key=lambda item: list(item.path),
    )
    if errors:
        raise EventValidationError(errors[0].message)


def validate_inbound_event(
    *,
    topic: str,
    raw: str | bytes | dict[str, Any],
    root: str,
    field_names: list[str],
    registry: ContractRegistry,
) -> tuple[str, UnsEvent, TopicContract]:
    try:
        parsed_topic = parse_topic(topic, root=root, field_names=field_names)
    except NamespaceError as error:
        raise EventValidationError(str(error)) from error
    canonical = topic
    contract = registry.for_topic(canonical)
    if contract is None:
        raise EventValidationError(f"No topic contract registered for '{canonical}'")
    event = validate_envelope(parse_event_document(raw))
    source = event.source.model_dump(exclude_none=True)
    expected = {
        "site": parsed_topic.fields["site"],
        "area": parsed_topic.fields["area"],
        "line": parsed_topic.fields["line"],
        "equipment": parsed_topic.fields["equipment"],
    }
    for key, value in expected.items():
        if source.get(key) != value:
            raise EventValidationError(
                f"source.{key} '{source.get(key)}' does not match topic segment '{value}'",
            )
    validate_against_contract(event, contract, registry.schema_path(contract))
    return canonical, event, contract
