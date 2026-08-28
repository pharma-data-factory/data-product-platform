"""Tests for asset ingestion and AAS service."""

import pytest
from datetime import datetime
from app.models import AssetEvent, AssetTypeEnum
from app.aas_service import AASService


@pytest.fixture
def aas_service():
    """Create AAS service for testing."""
    return AASService(
        repository_url="http://localhost:4000",
        registry_url="http://localhost:4001",
    )


@pytest.fixture
def sample_asset_event():
    """Create sample asset event for testing."""
    return AssetEvent(
        event_id="550e8400-e29b-41d4-a716-446655440000",
        asset_id="pump-unit-001",
        timestamp=datetime.utcnow().isoformat() + "Z",
        asset_type=AssetTypeEnum.EQUIPMENT,
        source_system="mqtt",
        submodel_elements={
            "manufacturer": "Bosch Rexroth",
            "serialNumber": "BR-2024-001",
            "status": "operational",
            "temperature": 45.2,
            "pressure": 3.5,
        },
    )


@pytest.mark.asyncio
async def test_validate_asset_event(aas_service, sample_asset_event):
    """Test asset event validation."""
    result = await aas_service.validate_asset_event(sample_asset_event)
    assert result is True


@pytest.mark.asyncio
async def test_store_asset(aas_service, sample_asset_event):
    """Test asset storage."""
    asset_ref = await aas_service.store_asset(sample_asset_event)
    assert asset_ref
    assert "pump-unit-001" in asset_ref


@pytest.mark.asyncio
async def test_get_asset(aas_service, sample_asset_event):
    """Test asset retrieval."""
    # Store first
    await aas_service.store_asset(sample_asset_event)

    # Retrieve
    asset = await aas_service.get_asset("pump-unit-001")
    assert asset is not None
    assert asset["asset_id"] == "pump-unit-001"
    assert asset["asset_type"] == "equipment"


@pytest.mark.asyncio
async def test_list_assets(aas_service, sample_asset_event):
    """Test asset listing with filters."""
    # Store multiple assets
    await aas_service.store_asset(sample_asset_event)

    event2 = AssetEvent(
        event_id="550e8400-e29b-41d4-a716-446655440001",
        asset_id="sensor-001",
        timestamp=datetime.utcnow().isoformat() + "Z",
        asset_type=AssetTypeEnum.SENSOR,
        source_system="rest",
        submodel_elements={"type": "temperature", "range": "0-100"},
    )
    await aas_service.store_asset(event2)

    # List all
    assets, total = await aas_service.list_assets({}, limit=100, offset=0)
    assert len(assets) == 2
    assert total == 2

    # List with filter
    assets, total = await aas_service.list_assets(
        {"asset_type": "sensor"}, limit=100, offset=0
    )
    assert len(assets) == 1
    assert assets[0]["asset_id"] == "sensor-001"


@pytest.mark.asyncio
async def test_quality_check(aas_service, sample_asset_event):
    """Test quality validation."""
    report = await aas_service.quality_check(sample_asset_event)
    assert report["passed"] is True
    assert "event_id_not_empty" in report["checks"]
    assert report["checks"]["asset_id_not_empty"] is True


@pytest.mark.asyncio
async def test_quality_check_invalid_event(aas_service):
    """Test quality check on invalid event."""
    invalid_event = AssetEvent(
        event_id="",  # Invalid: empty
        asset_id="test",
        timestamp=datetime.utcnow().isoformat() + "Z",
        asset_type=AssetTypeEnum.EQUIPMENT,
        submodel_elements={"test": "value"},
    )

    # Should fail validation due to empty event_id
    with pytest.raises(Exception):
        await aas_service.validate_asset_event(invalid_event)


def test_asset_event_model():
    """Test AssetEvent model validation."""
    # Valid event
    event = AssetEvent(
        event_id="test-123",
        asset_id="asset-1",
        timestamp="2026-08-24T14:30:00Z",
        asset_type=AssetTypeEnum.EQUIPMENT,
        submodel_elements={"key": "value"},
    )
    assert event.asset_id == "asset-1"

    # Invalid timestamp
    with pytest.raises(ValueError):
        AssetEvent(
            event_id="test-123",
            asset_id="asset-1",
            timestamp="invalid-date",
            asset_type=AssetTypeEnum.EQUIPMENT,
            submodel_elements={"key": "value"},
        )


def test_asset_type_enum():
    """Test AssetTypeEnum values."""
    assert AssetTypeEnum.EQUIPMENT.value == "equipment"
    assert AssetTypeEnum.SENSOR.value == "sensor"
    assert AssetTypeEnum.COMPONENT.value == "component"
    assert AssetTypeEnum.PRODUCT.value == "product"
    assert AssetTypeEnum.FACILITY.value == "facility"
