from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Literal

from pydantic import BaseModel

HealthStatus = Literal["UP", "DOWN"]


class HealthCheckResult(BaseModel):
    name: str
    status: HealthStatus
    detail: str | None = None


class HealthPayload(BaseModel):
    status: HealthStatus
    service: str
    version: str
    checks: list[HealthCheckResult] | None = None


HealthChecker = Callable[[], HealthCheckResult]


def run_checks(checkers: Sequence[HealthChecker]) -> list[HealthCheckResult]:
    results: list[HealthCheckResult] = []
    for checker in checkers:
        try:
            results.append(checker())
        except Exception as error:  # noqa: BLE001 - dependency health must not crash liveness
            results.append(
                HealthCheckResult(name="check", status="DOWN", detail=str(error)),
            )
    return results


def overall_status(results: Sequence[HealthCheckResult]) -> HealthStatus:
    if any(item.status == "DOWN" for item in results):
        return "DOWN"
    return "UP"


def liveness_payload(service: str, version: str) -> HealthPayload:
    """Process is up. Does not include product-specific dependency checks."""
    return HealthPayload(status="UP", service=service, version=version)


def readiness_payload(
    service: str,
    version: str,
    checkers: Sequence[HealthChecker] = (),
) -> HealthPayload:
    checks = run_checks(checkers)
    return HealthPayload(
        status=overall_status(checks) if checks else "UP",
        service=service,
        version=version,
        checks=checks or None,
    )
