from __future__ import annotations

from collections.abc import Callable, Sequence
from contextlib import AbstractAsyncContextManager
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pdf_health import HealthChecker, create_health_router
from pdf_observability import (
    Observability,
    ObservabilityMiddleware,
    configure_logging,
    health_check,
)


def create_rest_app(
    *,
    service: str,
    version: str,
    title: str | None = None,
    description: str = "",
    api_prefix: str = "/api/v1",
    routers: Sequence[APIRouter] = (),
    checkers: Sequence[HealthChecker] = (),
    observability: Observability | None = None,
    lifespan: Callable[[FastAPI], AbstractAsyncContextManager[Any]] | None = None,
) -> FastAPI:
    """Generic FastAPI host. Domain routes are passed in; this component has none."""
    configure_logging()
    obs = observability or Observability(service)
    app = FastAPI(
        title=title or service,
        version=version,
        description=description,
        lifespan=lifespan,
    )
    app.add_middleware(ObservabilityMiddleware, observability=obs)
    app.include_router(
        create_health_router(
            service,
            version,
            checkers=[*checkers, health_check(obs)],
        ),
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        obs.metrics.incr("http_validation_errors")
        obs.warning("request_validation_failed", errors=str(exc.errors()))
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code >= 500:
            obs.error("http_error", status=exc.status_code, detail=str(exc.detail))
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_error(_request: Request, exc: Exception) -> JSONResponse:
        obs.error("unhandled_error", error=str(exc))
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

    for router in routers:
        app.include_router(router, prefix=api_prefix)

    app.state.observability = obs
    app.state.api_prefix = api_prefix
    return app
