from __future__ import annotations

from typing import Any

from app.config import Settings
from app.contract import DATA_CONTRACT_VERSION, contract_file
from app.models import TemperatureEvent
from dataprod.contracts import (
    is_iso8601,
    load_json_schema,
    payload_matches_schema,
    validate_against_schema,
)
from dataprod.quality import QualityReport, quality_report, run_check

ALLOWED_UNITS = {"C", "F"}


def load_contract_schema() -> dict[str, Any]:
    return load_json_schema(contract_file())


def validate_against_contract(payload: dict[str, Any]) -> None:
    validate_against_schema(payload, load_contract_schema())


def evaluate(payloads: list[dict[str, Any]], settings: Settings) -> QualityReport:
    schema = load_contract_schema()
    checks = [
        run_check(
            "deviceId_not_empty",
            payloads,
            lambda item: isinstance(item.get("deviceId"), str) and bool(item["deviceId"].strip()),
            "deviceId must be a non-empty string",
        ),
        run_check(
            "eventId_not_empty",
            payloads,
            lambda item: isinstance(item.get("eventId"), str) and bool(item["eventId"].strip()),
            "eventId must be a non-empty string",
        ),
        run_check(
            "timestamp_iso8601",
            payloads,
            _valid_timestamp,
            "timestamp must be a valid ISO-8601 datetime",
        ),
        run_check(
            "temperature_within_limits",
            payloads,
            lambda item: _valid_temperature(item, settings),
            f"temperature must be between {settings.temperature_min} and {settings.temperature_max}",
        ),
        run_check(
            "unit_allowed",
            payloads,
            lambda item: item.get("unit") in ALLOWED_UNITS,
            "unit must be C or F",
        ),
        run_check(
            "contract_schema",
            payloads,
            lambda item: payload_matches_schema(item, schema),
            "payload must match contracts/temperature-event.schema.json",
        ),
    ]
    return quality_report(checks, DATA_CONTRACT_VERSION)


def evaluate_events(events: list[TemperatureEvent], settings: Settings) -> QualityReport:
    return evaluate([event.model_dump(mode="json") for event in events], settings)


def _valid_timestamp(item: dict[str, Any]) -> bool:
    return is_iso8601(item.get("timestamp"))


def _valid_temperature(item: dict[str, Any], settings: Settings) -> bool:
    value = item.get("temperature")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return settings.temperature_min <= float(value) <= settings.temperature_max
