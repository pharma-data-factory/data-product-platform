from __future__ import annotations

from typing import Any

from app.contract import DATA_CONTRACT_VERSION, contract_file
from app.models import Equipment
from dataprod.contracts import (
    is_iso8601,
    load_json_schema,
    payload_matches_schema,
    validate_against_schema,
)
from dataprod.quality import QualityReport, quality_report, run_check, unique_field_check

ALLOWED_STATUSES = {"ACTIVE", "INACTIVE", "MAINTENANCE"}


def load_contract_schema() -> dict[str, Any]:
    return load_json_schema(contract_file())


def validate_against_contract(payload: dict[str, Any]) -> None:
    validate_against_schema(payload, load_contract_schema())


def evaluate(payloads: list[dict[str, Any]]) -> QualityReport:
    schema = load_contract_schema()
    checks = [
        run_check(
            "equipmentId_not_empty",
            payloads,
            lambda item: isinstance(item.get("equipmentId"), str) and bool(item["equipmentId"].strip()),
            "equipmentId must be a non-empty string",
        ),
        unique_field_check(payloads, "equipmentId"),
        run_check(
            "name_not_empty",
            payloads,
            lambda item: isinstance(item.get("name"), str) and bool(item["name"].strip()),
            "name must be a non-empty string",
        ),
        run_check(
            "site_not_empty",
            payloads,
            lambda item: isinstance(item.get("site"), str) and bool(item["site"].strip()),
            "site must be a non-empty string",
        ),
        run_check(
            "status_allowed",
            payloads,
            lambda item: item.get("status") in ALLOWED_STATUSES,
            "status must be ACTIVE, INACTIVE, or MAINTENANCE",
        ),
        run_check(
            "updatedAt_iso8601",
            payloads,
            _valid_timestamp,
            "updatedAt must be a valid ISO-8601 datetime",
        ),
        run_check(
            "contract_schema",
            payloads,
            lambda item: payload_matches_schema(item, schema),
            "payload must match contracts/equipment-event.schema.json",
        ),
    ]
    return quality_report(checks, DATA_CONTRACT_VERSION)


def evaluate_records(records: list[Equipment]) -> QualityReport:
    return evaluate([record.model_dump(mode="json") for record in records])


def _valid_timestamp(item: dict[str, Any]) -> bool:
    return is_iso8601(item.get("updatedAt"))
