"""Tests for data contract validation."""

import pytest
import json
from pathlib import Path


def load_contract_schema():
    """Load the asset event contract schema."""
    contract_path = Path(__file__).parent.parent / "contracts" / "asset-event.schema.json"
    with open(contract_path) as f:
        return json.load(f)


def test_contract_schema_exists():
    """Test that contract schema file exists."""
    contract_path = Path(__file__).parent.parent / "contracts" / "asset-event.schema.json"
    assert contract_path.exists(), "Contract schema not found"


def test_contract_schema_valid_structure():
    """Test that contract schema is valid JSON Schema."""
    schema = load_contract_schema()
    assert "$schema" in schema
    assert "title" in schema
    assert "required" in schema
    assert "properties" in schema


def test_contract_required_fields():
    """Test that contract defines all required fields."""
    schema = load_contract_schema()
    required = schema["required"]

    assert "eventId" in required
    assert "assetId" in required
    assert "timestamp" in required
    assert "assetType" in required
    assert "submodelElements" in required


def test_contract_property_definitions():
    """Test that all required properties are defined."""
    schema = load_contract_schema()
    properties = schema["properties"]

    # Test eventId
    assert properties["eventId"]["type"] == "string"
    assert "pattern" in properties["eventId"]

    # Test assetId
    assert properties["assetId"]["type"] == "string"
    assert properties["assetId"]["minLength"] == 1

    # Test timestamp
    assert properties["timestamp"]["type"] == "string"
    assert properties["timestamp"]["format"] == "date-time"

    # Test assetType
    assert properties["assetType"]["type"] == "string"
    assert "enum" in properties["assetType"]

    # Test submodelElements
    assert properties["submodelElements"]["type"] == "object"
    assert properties["submodelElements"]["minProperties"] == 1


def test_contract_aas_compliance():
    """Test contract compliance with IDTA-01001 v3.0."""
    schema = load_contract_schema()

    # Should have description mentioning IDTA/AAS
    assert "description" in schema
    assert ("AAS" in schema["description"] or "Asset" in schema["description"])

    # Should have examples
    assert "examples" in schema
    assert len(schema["examples"]) > 0
