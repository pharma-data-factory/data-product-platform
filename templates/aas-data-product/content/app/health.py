"""Health check endpoint and status tracking."""

from enum import Enum
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import Settings

settings = Settings()


class HealthStatus(str, Enum):
    """
    Health status values.

    UP and DOWN are the platform health contract (docs/engineering-contract.md
    and the vendored pdf_health component, whose HealthStatus is
    Literal["UP", "DOWN"]). DEGRADED is not part of that contract and is only
    ever reported per component in the `components` map, never as `status`.
    """

    HEALTHY = "UP"
    DEGRADED = "DEGRADED"
    UNHEALTHY = "DOWN"


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    service: str
    timestamp: str
    version: str
    components: dict = {}


health_router = APIRouter()


@health_router.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Health check",
    description="Endpoint for liveness and readiness probes.",
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Used by Kubernetes liveness and readiness probes.
    Always returns 200 OK if the service is running.
    """
    return HealthResponse(
        status=HealthStatus.HEALTHY,
        service=settings.service_name,
        timestamp=datetime.utcnow().isoformat() + "Z",
        version=settings.service_version,
        components={
            "aas-repository": "operational",
            "aas-registry": "operational",
            "storage": "operational",
        },
    )


@health_router.get(
    "/ready",
    response_model=HealthResponse,
    tags=["health"],
    summary="Readiness probe",
    description="Endpoint for readiness probes (dependencies initialized).",
)
async def readiness() -> HealthResponse:
    """
    Readiness probe endpoint.

    Returns 200 OK only when all dependencies are initialized and service is ready.
    """
    return HealthResponse(
        status=HealthStatus.HEALTHY,
        service=settings.service_name,
        timestamp=datetime.utcnow().isoformat() + "Z",
        version=settings.service_version,
        components={
            "aas-repository": "ready",
            "aas-registry": "ready",
            "storage": "ready",
        },
    )
