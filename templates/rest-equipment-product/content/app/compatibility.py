from __future__ import annotations

from pathlib import Path
from typing import Any

from app.contract import DATA_CONTRACT_VERSION, contract_file
from dataprod import compatibility as shared_compatibility
from dataprod.compatibility import (
    CompatibilityStatus,
    compare_schemas,
    compatibility_gate_should_fail,
    parse_semver,
    version_satisfies,
)
from dataprod.contracts import load_json_schema

CONSUMERS_PATH = Path(__file__).resolve().parents[1] / "compat" / "consumers.json"
PUBLISHED_SCHEMA_PATH = Path(__file__).resolve().parents[1] / "compat" / "published.schema.json"


def load_published_schema() -> dict[str, Any]:
    return load_json_schema(PUBLISHED_SCHEMA_PATH)


def load_current_schema() -> dict[str, Any]:
    return load_json_schema(contract_file())


def load_consumers() -> list[dict[str, Any]]:
    return shared_compatibility.load_consumers(CONSUMERS_PATH)


def evaluate_compatibility(
    previous: dict[str, Any],
    nxt: dict[str, Any],
    consumers: list[dict[str, Any]] | None = None,
    contract: str = "equipment-event",
) -> dict[str, Any]:
    return shared_compatibility.evaluate_compatibility(
        previous,
        nxt,
        consumers,
        contract=contract,
        default_version=DATA_CONTRACT_VERSION,
    )


__all__ = [
    "CompatibilityStatus",
    "compare_schemas",
    "compatibility_gate_should_fail",
    "evaluate_compatibility",
    "load_consumers",
    "load_current_schema",
    "load_published_schema",
    "parse_semver",
    "version_satisfies",
]
