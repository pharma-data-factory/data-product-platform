from __future__ import annotations

import sys
from pathlib import Path

import pytest

PC = Path(__file__).resolve().parents[3]
for rel in (
    "operations/health/src",
    "operations/observability/src",
    "integration/rest-api/src",
    "asset-semantic/aas-foundation/src",
):
    sys.path.insert(0, str(PC / rel))

from pdf_aas.main import create_app
from pdf_aas.models import AssetCreate, PropertyDefinition
from pdf_aas.repository import SqliteAasRepository
from pdf_aas.seed import seed_reference_assets
from pdf_aas.lookup import resolve_endpoint, resolve_property


@pytest.fixture
def repo(tmp_path: Path) -> SqliteAasRepository:
    store = SqliteAasRepository(tmp_path / "aas.sqlite")
    seed_reference_assets(store)
    return store


def test_seed_filler_and_lookup(repo: SqliteAasRepository) -> None:
    resolved = resolve_property(repo, "filler-01", "speed")
    assert resolved.unit == "rpm"
    assert resolved.dataType == "number"
    mapping = resolve_endpoint(repo, "filler-01", "speed")
    assert mapping is not None
    assert mapping.protocol == "MQTT"
    assert mapping.topic == "pharma/basel/packaging/line-01/filler-01/speed/value"
    assert mapping.contract == "speed-value"


def test_duplicate_asset_rejected(repo: SqliteAasRepository) -> None:
    from pdf_aas.repository import DuplicateIdError

    with pytest.raises(DuplicateIdError):
        repo.create_asset(AssetCreate(id="filler-01", displayName="Dup"), "tester")


def test_invalid_property_and_secrets(repo: SqliteAasRepository) -> None:
    with pytest.raises(ValueError):
        repo.add_property(
            "filler-01",
            PropertyDefinition(
                id="secret-speed",
                idShort="SecretSpeed",
                name="Secret",
                dataType="number",
                connectivity={
                    "protocol": "MQTT",
                    "topic": "pharma/x",
                    "endpoint": "mqtt://user:password@broker",
                },
            ),
            "tester",
        )


def test_count_reset_not_in_aas(repo: SqliteAasRepository) -> None:
    shell = repo.get_asset("filler-01")
    dumped = shell.model_dump()
    assert "value" not in dumped["properties"][0]
    assert all("time-series" not in str(item).lower() for item in dumped["properties"])
