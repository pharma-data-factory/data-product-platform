from __future__ import annotations

import json
from importlib.resources import files

from pdf_aas.models import AssetAdministrationShell
from pdf_aas.repository import DuplicateIdError, SqliteAasRepository


def load_filler_01() -> AssetAdministrationShell:
    payload = files("pdf_aas.data").joinpath("filler-01.json").read_text(encoding="utf-8")
    return AssetAdministrationShell.model_validate_json(payload)


def seed_reference_assets(repo: SqliteAasRepository, actor: str = "system") -> None:
    parents = [
        ("basel", "Basel", "Site", None, None, None),
        ("packaging", "Packaging", "Area", "basel", None, None),
        ("line-01", "Line 01", "Line", "basel", "packaging", None),
    ]
    from pdf_aas.models import AssetCreate

    for asset_id, name, asset_type, site, area, line in parents:
        try:
            repo.create_asset(
                AssetCreate(
                    id=asset_id,
                    displayName=name,
                    assetType=asset_type,
                    site=site,
                    area=area,
                    line=line,
                ),
                actor,
            )
        except DuplicateIdError:
            pass
    filler = load_filler_01()
    try:
        repo.put_shell(filler, actor, "asset.seeded")
    except DuplicateIdError:
        pass
