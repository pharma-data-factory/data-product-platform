from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import ValidationError


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_json_schema(path: Path) -> dict[str, Any]:
    payload = load_json(path)
    if not isinstance(payload, dict):
        raise TypeError(f"JSON Schema at {path} must be an object")
    return payload


def schema_version(schema: dict[str, Any], default: str = "") -> str:
    return str(schema.get("version", default))


def validate_against_schema(payload: dict[str, Any], schema: dict[str, Any]) -> None:
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(payload)


def payload_matches_schema(payload: dict[str, Any], schema: dict[str, Any]) -> bool:
    try:
        validate_against_schema(payload, schema)
        return True
    except ValidationError:
        return False


def normalize_iso8601(value: str) -> str:
    if value.endswith("Z"):
        return f"{value[:-1]}+00:00"
    return value


def is_iso8601(value: object) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        datetime.fromisoformat(normalize_iso8601(value))
        return True
    except ValueError:
        return False
