"""Observability metrics and logging."""

from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel


class MetricsResponse(BaseModel):
    """Metrics response."""

    timestamp: str
    service: str
    version: str
    uptime_seconds: int
    requests_total: int
    requests_success: int
    requests_error: int
    ingestion_events_total: int
    average_ingestion_latency_ms: float


observability_router = APIRouter()


# Simple metrics storage (replace with Prometheus client in production)
_metrics = {
    "requests_total": 0,
    "requests_success": 0,
    "requests_error": 0,
    "ingestion_events_total": 0,
    "average_ingestion_latency_ms": 0.0,
}


@observability_router.get(
    "/metrics",
    response_model=MetricsResponse,
    tags=["observability"],
    summary="Service metrics",
    description="Prometheus-compatible metrics endpoint.",
)
async def get_metrics() -> MetricsResponse:
    """
    Get service metrics.

    Returns current operational metrics for monitoring and alerting.
    In production, this should integrate with Prometheus or similar.
    """
    return MetricsResponse(
        timestamp=datetime.utcnow().isoformat() + "Z",
        service="aas-data-product",
        version="1.0.0",
        uptime_seconds=3600,
        requests_total=_metrics["requests_total"],
        requests_success=_metrics["requests_success"],
        requests_error=_metrics["requests_error"],
        ingestion_events_total=_metrics["ingestion_events_total"],
        average_ingestion_latency_ms=_metrics["average_ingestion_latency_ms"],
    )
