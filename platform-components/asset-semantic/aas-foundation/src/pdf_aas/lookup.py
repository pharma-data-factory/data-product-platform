from __future__ import annotations

from pdf_aas.models import ResolvedProperty
from pdf_aas.repository import SqliteAasRepository


def resolve_asset(repo: SqliteAasRepository, asset_id: str):
    """Data Product lookup. Callers must not depend on SQLite tables."""
    return repo.get_asset(asset_id)


def resolve_property(repo: SqliteAasRepository, asset_id: str, property_id: str) -> ResolvedProperty:
    prop = repo.get_property(asset_id, property_id)
    return ResolvedProperty(
        assetId=asset_id,
        propertyId=prop.id,
        semanticId=prop.semanticId.value if prop.semanticId else None,
        dataType=prop.dataType,
        unit=prop.unit,
        connectivity=prop.connectivity,
    )


def resolve_endpoint(repo: SqliteAasRepository, asset_id: str, property_id: str):
    return resolve_property(repo, asset_id, property_id).connectivity
