from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from dataprod.contracts import load_json

CompatibilityStatus = Literal["COMPATIBLE", "BREAKING_CHANGE", "UNKNOWN"]
POLICY_PATH = Path(__file__).with_name("compatibility-policy.json")


@lru_cache(maxsize=1)
def load_compatibility_policy() -> dict[str, Any]:
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def load_consumers(path: Any) -> list[dict[str, Any]]:
    payload = load_json(path)
    if not isinstance(payload, dict):
        return []
    return list(payload.get("consumers", []))


def parse_semver(version: str) -> tuple[int, int, int] | None:
    parts = version.strip().split(".")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        return None
    return int(parts[0]), int(parts[1]), int(parts[2])


def version_satisfies(version: str, ranges: list[str]) -> bool:
    parsed = parse_semver(version)
    if parsed is None or not ranges:
        return False
    major, minor, patch = parsed
    for raw in ranges:
        trimmed = raw.strip()
        if trimmed == "*":
            return True
        if len(trimmed) > 2 and trimmed.lower().endswith(".x") and trimmed[:-2].isdigit():
            if major == int(trimmed[:-2]):
                return True
            continue
        exact = parse_semver(trimmed)
        if exact == (major, minor, patch):
            return True
    return False


def _property_type(property_schema: dict[str, Any] | None) -> str:
    if not property_schema or "type" not in property_schema:
        return "unknown"
    value = property_schema["type"]
    if isinstance(value, list):
        return ",".join(str(item) for item in value)
    return str(value)


def _rule(rule_id: str) -> dict[str, Any]:
    for item in load_compatibility_policy().get("rules", []):
        if item.get("id") == rule_id:
            return item
    raise KeyError(f"Unknown compatibility rule {rule_id}")


def _finding(rule_id: str, **values: str) -> dict[str, Any]:
    rule = _rule(rule_id)
    message = str(rule["message"])
    for key, value in values.items():
        message = message.replace("{" + key + "}", value)
    return {
        "rule": rule_id,
        "breaking": rule.get("result") == "BREAKING_CHANGE",
        "message": message,
    }


def compare_schemas(previous: dict[str, Any], nxt: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    previous_version = str(previous.get("version", ""))
    next_version = str(nxt.get("version", ""))
    previous_semver = parse_semver(previous_version)
    next_semver = parse_semver(next_version)

    if previous_semver and next_semver and next_semver[0] != previous_semver[0]:
        findings.append(
            _finding(
                "major_version_change",
                previousVersion=previous_version,
                nextVersion=next_version,
            )
        )
    elif previous_semver and next_semver and next_semver != previous_semver:
        findings.append(
            _finding(
                "minor_or_patch_version_change",
                previousVersion=previous_version,
                nextVersion=next_version,
            )
        )

    previous_required = list(previous.get("required", []))
    next_required = list(nxt.get("required", []))
    previous_properties = dict(previous.get("properties", {}))
    next_properties = dict(nxt.get("properties", {}))

    for field in previous_required:
        if field not in next_required or field not in next_properties:
            findings.append(_finding("removed_required_field", field=str(field)))

    for field, schema in previous_properties.items():
        if field in next_properties:
            previous_type = _property_type(schema)
            next_type = _property_type(next_properties[field])
            if previous_type != next_type:
                findings.append(
                    _finding(
                        "changed_field_type",
                        field=str(field),
                        previousType=previous_type,
                        nextType=next_type,
                    )
                )

    for field in next_properties:
        if field in previous_properties:
            continue
        if field in next_required:
            findings.append(_finding("new_required_field", field=str(field)))
        else:
            findings.append(_finding("new_optional_field", field=str(field)))

    return findings


def evaluate_compatibility(
    previous: dict[str, Any],
    nxt: dict[str, Any],
    consumers: list[dict[str, Any]] | None = None,
    contract: str = "unknown",
    default_version: str = "",
) -> dict[str, Any]:
    findings = compare_schemas(previous, nxt)
    next_version = str(nxt.get("version", default_version))
    relevant = [
        consumer
        for consumer in consumers or []
        if consumer.get("active", True)
        and consumer.get("consumesContract", contract) == contract
    ]
    blocked: list[str] = []
    has_breaking = any(finding["breaking"] for finding in findings)

    if not relevant:
        return {
            "status": "BREAKING_CHANGE" if has_breaking else "UNKNOWN",
            "contract": contract,
            "fromVersion": str(previous.get("version", "")),
            "toVersion": next_version,
            "findings": findings,
            "blockedConsumers": [],
        }

    for consumer in relevant:
        ranges = list(consumer.get("compatibleVersions", []))
        name = str(consumer.get("name", "unknown"))
        if not version_satisfies(next_version, ranges):
            findings.append(
                _finding(
                    "consumer_version_mismatch",
                    name=name,
                    ranges=", ".join(ranges),
                    nextVersion=next_version,
                )
            )
            blocked.append(name)
        elif has_breaking:
            blocked.append(name)

    return {
        "status": "BREAKING_CHANGE" if blocked else "COMPATIBLE",
        "contract": contract,
        "fromVersion": str(previous.get("version", "")),
        "toVersion": next_version,
        "findings": findings,
        "blockedConsumers": blocked,
    }


def compatibility_gate_should_fail(report: dict[str, Any]) -> bool:
    return report["status"] == "BREAKING_CHANGE" and bool(report["blockedConsumers"])
