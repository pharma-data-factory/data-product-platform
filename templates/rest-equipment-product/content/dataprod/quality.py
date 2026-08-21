from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal

from pydantic import BaseModel


class QualityCheck(BaseModel):
    name: str
    mandatory: bool
    passed: bool
    failedCount: int
    message: str


class QualityReport(BaseModel):
    status: Literal["PASS", "FAIL"]
    contractVersion: str
    checks: list[QualityCheck]


def quality_report(checks: list[QualityCheck], contract_version: str) -> QualityReport:
    failed_mandatory = [check for check in checks if check.mandatory and not check.passed]
    return QualityReport(
        status="FAIL" if failed_mandatory else "PASS",
        contractVersion=contract_version,
        checks=checks,
    )


def run_check(
    name: str,
    payloads: list[dict[str, Any]],
    predicate: Callable[[dict[str, Any]], bool],
    message: str,
    *,
    mandatory: bool = True,
) -> QualityCheck:
    failed = sum(1 for item in payloads if not predicate(item))
    return QualityCheck(
        name=name,
        mandatory=mandatory,
        passed=failed == 0,
        failedCount=failed,
        message=message,
    )


def unique_field_check(
    payloads: list[dict[str, Any]],
    field: str,
    *,
    name: str | None = None,
    message: str | None = None,
    mandatory: bool = True,
) -> QualityCheck:
    values = [
        item[field]
        for item in payloads
        if isinstance(item.get(field), str) and item[field].strip()
    ]
    duplicates = len(values) - len(set(values))
    return QualityCheck(
        name=name or f"{field}_unique",
        mandatory=mandatory,
        passed=duplicates == 0,
        failedCount=duplicates,
        message=message or f"{field} must be unique",
    )
