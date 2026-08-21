from __future__ import annotations

from collections.abc import Sequence

from fastapi import APIRouter

from pdf_health.models import HealthChecker, HealthPayload, liveness_payload, readiness_payload


def create_health_router(
    service: str,
    version: str,
    *,
    checkers: Sequence[HealthChecker] = (),
) -> APIRouter:
    """Liveness at GET /health. Readiness at GET /health/ready.

    Product-specific dependency checkers are injected by the Data Product.
    This component does not know about MQTT, REST sources, or domain stores.
    """
    router = APIRouter(tags=["health"])

    @router.get("/health", response_model=HealthPayload, response_model_exclude_none=True)
    def health() -> HealthPayload:
        return liveness_payload(service, version)

    @router.get("/health/ready", response_model=HealthPayload, response_model_exclude_none=True)
    def ready() -> HealthPayload:
        return readiness_payload(service, version, checkers)

    return router
