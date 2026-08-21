from __future__ import annotations

import logging
from contextvars import ContextVar
from time import perf_counter
from typing import Any, Protocol
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_ID_HEADER = "X-Request-ID"
_correlation_id: ContextVar[str] = ContextVar("correlation_id", default="-")
_SECRET_MARKERS = ("password", "token", "secret", "authorization", "api_key", "apikey")


def redact_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Mask credential-like keys so tokens and passwords are never logged."""
    redacted: dict[str, Any] = {}
    for key, value in fields.items():
        normalized = key.lower().replace("-", "_")
        if any(marker in normalized for marker in _SECRET_MARKERS):
            redacted[key] = "***"
        else:
            redacted[key] = value
    return redacted


class MetricsBackend(Protocol):
    """Seam for Prometheus, OpenTelemetry, or Grafana-backed exporters.

    The MVP keeps counters in process. Do not deploy a monitoring backend yet.
    """

    def incr(self, name: str, value: int = 1) -> None: ...
    def observe(self, name: str, seconds: float) -> None: ...
    def snapshot(self) -> dict[str, Any]: ...


class InMemoryMetrics:
    """Process-local counters and timings.

    Future adapters: Prometheus scrape, OpenTelemetry Meter, Grafana remote write.
    """

    def __init__(self) -> None:
        self.counters: dict[str, int] = {}
        self.timings: dict[str, list[float]] = {}

    def incr(self, name: str, value: int = 1) -> None:
        self.counters[name] = self.counters.get(name, 0) + value

    def observe(self, name: str, seconds: float) -> None:
        self.timings.setdefault(name, []).append(seconds)

    def snapshot(self) -> dict[str, Any]:
        timing_summary = {
            name: {
                "count": len(values),
                "total_seconds": round(sum(values), 6),
            }
            for name, values in self.timings.items()
        }
        return {"counters": dict(self.counters), "timings": timing_summary}


class Observability:
    def __init__(self, service: str, metrics: MetricsBackend | None = None) -> None:
        self.service = service
        self.metrics = metrics or InMemoryMetrics()
        self.logger = logging.getLogger(service)

    def correlation_id(self) -> str:
        return _correlation_id.get()

    def info(self, event: str, **fields: Any) -> None:
        self.logger.info(
            event,
            extra={"correlation_id": self.correlation_id(), **redact_fields(fields)},
        )

    def warning(self, event: str, **fields: Any) -> None:
        self.logger.warning(
            event,
            extra={"correlation_id": self.correlation_id(), **redact_fields(fields)},
        )

    def error(self, event: str, **fields: Any) -> None:
        self.metrics.incr("errors")
        self.logger.error(
            event,
            extra={"correlation_id": self.correlation_id(), **redact_fields(fields)},
        )


class CorrelationIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "correlation_id"):
            record.correlation_id = _correlation_id.get()
        return True


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s correlation_id=%(correlation_id)s %(message)s",
        ),
    )
    handler.addFilter(CorrelationIdFilter())
    root = logging.getLogger()
    if not any(isinstance(existing, logging.StreamHandler) for existing in root.handlers):
        root.addHandler(handler)
    root.setLevel(level)


class ObservabilityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, observability: Observability) -> None:  # type: ignore[no-untyped-def]
        super().__init__(app)
        self._observability = observability

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid4())
        token = _correlation_id.set(correlation_id)
        started = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            self._observability.metrics.incr("http_errors")
            self._observability.error("http_unhandled_error", path=request.url.path)
            raise
        else:
            elapsed = perf_counter() - started
            self._observability.metrics.incr("http_requests")
            self._observability.metrics.observe("http_request_duration_seconds", elapsed)
            if response.status_code >= 500:
                self._observability.metrics.incr("http_errors")
            response.headers[CORRELATION_ID_HEADER] = correlation_id
            return response
        finally:
            _correlation_id.reset(token)


def health_check(observability: Observability):
    """Optional Health checker: observability subsystem is process-local and always UP."""

    def _check():
        from pdf_health import HealthCheckResult

        snapshot = observability.metrics.snapshot()
        return HealthCheckResult(
            name="observability",
            status="UP",
            detail=f"requests={snapshot['counters'].get('http_requests', 0)}",
        )

    return _check
