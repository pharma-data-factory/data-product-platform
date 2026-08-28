"""Data models for AAS Data Product."""

from typing import Any, Dict, Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator


class AssetTypeEnum(str, Enum):
    """Asset type classification (IDTA-01001)."""

    EQUIPMENT = "equipment"
    SENSOR = "sensor"
    COMPONENT = "component"
    PRODUCT = "product"
    FACILITY = "facility"
    OTHER = "other"


class AssetEvent(BaseModel):
    """Asset Administration Shell Event Schema (IDTA-01001 v3.0 compliant)."""

    event_id: str = Field(..., description="Unique event identifier (UUID v4 recommended)")
    asset_id: str = Field(..., description="Unique asset identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp in UTC")
    asset_type: AssetTypeEnum = Field(..., description="AAS asset type classification")
    submodel_elements: Dict[str, Any] = Field(
        ...,
        min_items=1,
        description="Submodel elements as key-value pairs (IDTA-01001 v3.0 compatible)",
    )
    source_system: str = Field(default="unknown", description="Source system identifier")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional event metadata"
    )
    context: Optional[Dict[str, str]] = Field(
        default=None, description="Optional business context"
    )

    @validator("timestamp")
    def validate_timestamp(cls, v):
        """Validate ISO 8601 timestamp format."""
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
            return v
        except ValueError:
            raise ValueError("Invalid ISO 8601 timestamp format")

    @validator("event_id")
    def validate_event_id(cls, v):
        """Validate event ID format."""
        if not v or len(v) < 1:
            raise ValueError("event_id cannot be empty")
        return v

    @validator("asset_id")
    def validate_asset_id(cls, v):
        """Validate asset ID format."""
        if not v or len(v) > 255:
            raise ValueError("asset_id must be between 1 and 255 characters")
        return v

    class Config:
        schema_extra = {
            "example": {
                "event_id": "550e8400-e29b-41d4-a716-446655440000",
                "asset_id": "pump-unit-001",
                "timestamp": "2026-08-24T14:30:00Z",
                "asset_type": "equipment",
                "source_system": "mqtt",
                "submodel_elements": {
                    "manufacturer": "Bosch Rexroth",
                    "serialNumber": "BR-2024-001",
                    "status": "operational",
                    "temperature": 45.2,
                    "pressure": 3.5,
                },
                "metadata": {"version": "1.0.0", "contentType": "application/json"},
                "context": {
                    "plantId": "PLANT-DE-01",
                    "productionLine": "LINE-A",
                    "batch": "BATCH-2024-0815",
                },
            }
        }


class AssetResponse(BaseModel):
    """Response after asset ingestion."""

    event_id: str = Field(..., description="Original event ID")
    asset_id: str = Field(..., description="Asset identifier")
    asset_ref: str = Field(..., description="AAS reference path in registry")
    status: str = Field(..., description="Storage status (stored, updated, error)")
    timestamp: str = Field(..., description="Processing timestamp")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Overall health status (healthy, degraded, unhealthy)")
    timestamp: str = Field(..., description="Check timestamp")
    components: Dict[str, str] = Field(
        default_factory=dict, description="Component health status"
    )
    version: str = Field(..., description="Service version")


class QualityReport(BaseModel):
    """Quality validation report for assets."""

    event_id: str
    asset_id: str
    passed: bool
    checks: Dict[str, bool] = Field(
        default_factory=dict, description="Individual quality check results"
    )
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    timestamp: str
    contract_version: str = "1.0.0"


class AssetMetadata(BaseModel):
    """Asset metadata for indexing and discovery."""

    asset_id: str
    asset_type: AssetTypeEnum
    source_system: str
    ingestion_timestamp: str
    last_updated: str
    event_count: int = Field(default=1, description="Number of events for this asset")
    quality_score: float = Field(default=100.0, ge=0, le=100)


class Pagination(BaseModel):
    """Pagination metadata."""

    total: int = Field(..., description="Total number of results")
    limit: int = Field(..., description="Results per page")
    offset: int = Field(..., description="Number of skipped results")
    returned: int = Field(..., description="Number of returned results")
