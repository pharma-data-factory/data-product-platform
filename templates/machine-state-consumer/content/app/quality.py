from __future__ import annotations

from typing import Any

from app.config import Settings
from app.contract import DATA_CONTRACT_VERSION, contract_file
from dataprod.contracts import (
    is_iso8601,
    load_json_schema,
    payload_matches_schema,
)
from dataprod.quality import QualityReport, quality_report, run_check, unique_field_check

ALLOWED_STATES = {"RUNNING", "STOPPED", "IDLE", "MAINTENANCE"}


def evaluate(payloads: list[dict[str, Any]], _settings: Settings) -> QualityReport:
    schema = load_json_schema(contract_file())
    checks = [
        run_check(
            "eventId_not_empty",
            payloads,
            lambda item: isinstance(item.get("eventId"), str) and bool(str(item["eventId"]).strip()),
            "eventId must be a non-empty UUID",
        ),
        run_check(
            "timestamp_iso8601",
            payloads,
            lambda item: is_iso8601(item.get("timestamp")),
            "timestamp must be a valid ISO-8601 datetime",
        ),
        run_check(
            "source_metadata_required",
            payloads,
            _valid_source,
            "site, area, line, and equipmentId are required",
        ),
        run_check(
            "state_enum",
            payloads,
            lambda item: item.get("state") in ALLOWED_STATES,
            "state must be RUNNING, STOPPED, IDLE, or MAINTENANCE",
        ),
        run_check(
            "contract_schema",
            payloads,
            lambda item: payload_matches_schema(
                {"state": item.get("state"), "reason": item.get("reason")},
                schema,
            ),
            "payload must match contracts/machine-state-event.schema.json",
        ),
        unique_field_check(
            payloads,
            "eventId",
            name="eventId_unique",
            message="eventId must not be processed twice in stored latest state",
        ),
    ]
    return quality_report(checks, DATA_CONTRACT_VERSION)


def _valid_source(item: dict[str, Any]) -> bool:
    return all(
        isinstance(item.get(field), str) and bool(item[field].strip())
        for field in ("site", "area", "line", "equipmentId")
    )
