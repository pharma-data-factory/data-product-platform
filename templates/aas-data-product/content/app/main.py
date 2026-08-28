"""
AAS Asset Administration Shell Data Product.

IDTA-01001 v3.0 compliant asset registry and data ingestion service.
Built on FastAPI and Eclipse BaSyx Python SDK.

Domain: manufacturing, asset management, semantic integration
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import Settings
from app.health import health_router, HealthStatus
from app.observability import observability_router
from app.aas_service import AASService
from app.models import AssetEvent, AssetResponse, HealthResponse

logger = logging.getLogger(__name__)
settings = Settings()

# Initialize AAS Service
aas_service = AASService(
    repository_url=settings.aas_repository_url,
    registry_url=settings.aas_registry_url,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    logger.info("AAS Data Product starting up...")
    await aas_service.initialize()
    yield
    logger.info("AAS Data Product shutting down...")
    await aas_service.cleanup()


# Initialize FastAPI application
app = FastAPI(
    title="AAS Asset Administration Shell Data Product",
    description="IDTA-01001 v3.0 compliant asset registry, ingest, and query service.",
    version=settings.service_version,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api/v1", tags=["health"])
app.include_router(observability_router, prefix="/api/v1", tags=["observability"])


# ============================================================================
# AAS Asset Management Endpoints
# ============================================================================


@app.post(
    "/api/v1/assets",
    response_model=AssetResponse,
    status_code=201,
    tags=["asset-management"],
    summary="Ingest asset event",
    description="Accept and register a new asset event into the AAS registry.",
)
async def ingest_asset(event: AssetEvent) -> AssetResponse:
    """
    Ingest a new asset event into the Asset Administration Shell registry.

    The event is validated against the asset-event.schema.json contract.
    If valid, it is stored in the AAS repository and indexed.

    Args:
        event: AssetEvent object containing asset data and submodel elements.

    Returns:
        AssetResponse with stored asset reference and registration details.

    Raises:
        HTTPException: 400 if validation fails, 500 on internal errors.
    """
    try:
        # Validate event against schema
        await aas_service.validate_asset_event(event)

        # Store in AAS repository
        asset_ref = await aas_service.store_asset(event)

        # Index for discovery
        await aas_service.index_asset(asset_ref, event)

        logger.info(f"Asset ingested: {event.asset_id} → {asset_ref}")

        return AssetResponse(
            event_id=event.event_id,
            asset_id=event.asset_id,
            asset_ref=asset_ref,
            status="stored",
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Asset ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get(
    "/api/v1/assets/{asset_id}",
    response_model=dict,
    tags=["asset-management"],
    summary="Retrieve asset by ID",
    description="Fetch a registered asset from the AAS repository by its identifier.",
)
async def get_asset(asset_id: str) -> dict:
    """
    Retrieve a single asset from the AAS repository.

    Args:
        asset_id: Asset identifier (idShort or full AAS path).

    Returns:
        Asset object with all submodel elements.

    Raises:
        HTTPException: 404 if asset not found, 500 on errors.
    """
    try:
        asset = await aas_service.get_asset(asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
        return asset
    except Exception as e:
        logger.error(f"Asset retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get(
    "/api/v1/assets",
    response_model=dict,
    tags=["asset-management"],
    summary="List assets",
    description="Query assets from the AAS registry with optional filtering.",
)
async def list_assets(
    asset_type: str = Query(None, description="Filter by asset type"),
    source_system: str = Query(None, description="Filter by source system"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> dict:
    """
    List assets with optional filtering and pagination.

    Args:
        asset_type: Optional asset type filter (equipment, sensor, component, etc.).
        source_system: Optional source system filter (mqtt, rest, sap, etc.).
        limit: Number of results to return (default 100, max 1000).
        offset: Number of results to skip (default 0).

    Returns:
        Paginated list of assets.

    Raises:
        HTTPException: 500 on errors.
    """
    try:
        filters = {}
        if asset_type:
            filters["asset_type"] = asset_type
        if source_system:
            filters["source_system"] = source_system

        assets, total = await aas_service.list_assets(filters, limit, offset)

        return {
            "data": assets,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "returned": len(assets),
            },
        }
    except Exception as e:
        logger.error(f"Asset listing failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get(
    "/api/v1/assets/{asset_id}/submodels",
    response_model=dict,
    tags=["asset-management"],
    summary="Retrieve asset submodels",
    description="Fetch submodel elements for a specific asset.",
)
async def get_asset_submodels(asset_id: str) -> dict:
    """
    Retrieve submodel elements (IDTA-01001) for an asset.

    Submodels are semantic containers for asset properties, relationships, and behaviors.

    Args:
        asset_id: Asset identifier.

    Returns:
        Dictionary of submodel elements keyed by name.

    Raises:
        HTTPException: 404 if asset not found, 500 on errors.
    """
    try:
        submodels = await aas_service.get_asset_submodels(asset_id)
        if submodels is None:
            raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
        return {"asset_id": asset_id, "submodels": submodels}
    except Exception as e:
        logger.error(f"Submodel retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Quality and Validation Endpoints
# ============================================================================


@app.post(
    "/api/v1/quality",
    response_model=dict,
    tags=["quality"],
    summary="Validate asset against contract",
    description="Perform quality checks on an asset event before ingestion.",
)
async def validate_asset_quality(event: AssetEvent) -> dict:
    """
    Validate an asset event against the data contract.

    Returns detailed quality check results including schema validation,
    required fields, type checks, and constraints.

    Args:
        event: AssetEvent to validate.

    Returns:
        Quality report with pass/fail status and detailed findings.
    """
    try:
        quality_report = await aas_service.quality_check(event)
        return quality_report
    except Exception as e:
        logger.error(f"Quality check failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get(
    "/api/v1/quality",
    response_model=dict,
    tags=["quality"],
    summary="Asset quality metrics",
    description="Retrieve platform-level quality metrics for all ingested assets.",
)
async def get_quality_metrics() -> dict:
    """
    Retrieve quality metrics for the data product.

    Includes schema compliance rate, ingestion success rate, validation errors, etc.

    Returns:
        Quality metrics and statistics.
    """
    try:
        metrics = await aas_service.get_quality_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Error Handlers
# ============================================================================


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


@app.get(
    "/",
    tags=["root"],
    summary="Root endpoint",
    description="Service information and links.",
)
async def root() -> dict:
    """Root endpoint returns service metadata."""
    return {
        "service": "AAS Asset Administration Shell Data Product",
        "version": settings.service_version,
        "docs": "/docs",
        "health": "/api/v1/health",
        "specification": "IDTA-01001 v3.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info",
    )
