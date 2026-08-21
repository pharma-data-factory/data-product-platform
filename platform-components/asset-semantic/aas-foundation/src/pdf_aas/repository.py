from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

from pdf_aas.models import (
    AssetAdministrationShell,
    AssetContext,
    AssetCreate,
    AssetInformation,
    AssetRelationship,
    AssetUpdate,
    AuditRecord,
    DEFAULT_SUBMODEL_SHORTS,
    PropertyDefinition,
    SpecificAssetId,
    Submodel,
)


class DuplicateIdError(ValueError):
    pass


class NotFoundError(ValueError):
    pass


class AasRepository(Protocol):
    def list_assets(self, *, include_inactive: bool = False) -> list[AssetAdministrationShell]: ...
    def get_asset(self, asset_id: str) -> AssetAdministrationShell: ...
    def create_asset(self, payload: AssetCreate, actor: str) -> AssetAdministrationShell: ...
    def update_asset(self, asset_id: str, payload: AssetUpdate, actor: str) -> AssetAdministrationShell: ...
    def deactivate_asset(self, asset_id: str, actor: str) -> AssetAdministrationShell: ...
    def add_property(self, asset_id: str, prop: PropertyDefinition, actor: str) -> PropertyDefinition: ...
    def get_property(self, asset_id: str, property_id: str) -> PropertyDefinition: ...
    def add_relationship(self, asset_id: str, rel: AssetRelationship, actor: str) -> AssetRelationship: ...
    def list_audit(self, asset_id: str | None = None) -> list[AuditRecord]: ...


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _specific(name: str, value: str | None, existing: list[SpecificAssetId]) -> list[SpecificAssetId]:
    items = [item for item in existing if item.name != name]
    if value:
        items.append(SpecificAssetId(name=name, value=value))
    return items


class SqliteAasRepository:
    def __init__(self, path: str | Path) -> None:
        self._path = str(path)
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS assets (
              id TEXT PRIMARY KEY,
              document TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              at TEXT NOT NULL,
              actor TEXT NOT NULL,
              action TEXT NOT NULL,
              asset_id TEXT,
              detail TEXT
            )
            """
        )
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def list_assets(self, *, include_inactive: bool = False) -> list[AssetAdministrationShell]:
        sql = "SELECT document FROM assets" if include_inactive else "SELECT document FROM assets WHERE active = 1"
        rows = self._conn.execute(sql).fetchall()
        return [AssetAdministrationShell.model_validate_json(row["document"]) for row in rows]

    def get_asset(self, asset_id: str) -> AssetAdministrationShell:
        row = self._conn.execute("SELECT document FROM assets WHERE id = ?", (asset_id,)).fetchone()
        if not row:
            raise NotFoundError(f"Asset {asset_id} was not found")
        return AssetAdministrationShell.model_validate_json(row["document"])

    def create_asset(self, payload: AssetCreate, actor: str) -> AssetAdministrationShell:
        if self._exists(payload.id):
            raise DuplicateIdError(f"Asset {payload.id} already exists")
        specifics = _specific(
            "manufacturer",
            payload.manufacturer,
            _specific("model", payload.model, _specific("serialNumber", payload.serialNumber, [])),
        )
        shell = AssetAdministrationShell(
            id=payload.id,
            idShort=payload.id.replace("-", ""),
            displayName=payload.displayName,
            description=payload.description,
            assetInformation=AssetInformation(
                globalAssetId=payload.globalAssetId or f"urn:pdf:asset:{payload.id}",
                assetType=payload.assetType,
                specificAssetIds=specifics,
            ),
            context=AssetContext(site=payload.site, area=payload.area, line=payload.line),
            submodels=[
                Submodel(id=f"urn:pdf:submodel:{payload.id}:{short.lower()}", idShort=short)
                for short in DEFAULT_SUBMODEL_SHORTS
            ],
        )
        self._write(shell)
        self._audit(actor, "asset.created", payload.id, payload.displayName)
        return shell

    def update_asset(self, asset_id: str, payload: AssetUpdate, actor: str) -> AssetAdministrationShell:
        shell = self.get_asset(asset_id)
        data = shell.model_dump()
        info = shell.assetInformation
        specifics = list(info.specificAssetIds)
        if payload.manufacturer is not None:
            specifics = _specific("manufacturer", payload.manufacturer, specifics)
        if payload.model is not None:
            specifics = _specific("model", payload.model, specifics)
        if payload.serialNumber is not None:
            specifics = _specific("serialNumber", payload.serialNumber, specifics)
        updated = shell.model_copy(
            update={
                "displayName": payload.displayName or shell.displayName,
                "description": payload.description if payload.description is not None else shell.description,
                "revision": shell.revision + 1,
                "active": payload.active if payload.active is not None else shell.active,
                "assetInformation": info.model_copy(
                    update={
                        "globalAssetId": payload.globalAssetId or info.globalAssetId,
                        "assetType": payload.assetType if payload.assetType is not None else info.assetType,
                        "specificAssetIds": specifics,
                    }
                ),
                "context": AssetContext(
                    site=payload.site if payload.site is not None else shell.context.site,
                    area=payload.area if payload.area is not None else shell.context.area,
                    line=payload.line if payload.line is not None else shell.context.line,
                ),
            }
        )
        self._write(updated)
        self._audit(actor, "asset.updated", asset_id, json.dumps(data["id"]))
        return updated

    def deactivate_asset(self, asset_id: str, actor: str) -> AssetAdministrationShell:
        return self.update_asset(asset_id, AssetUpdate(active=False), actor)

    def add_property(self, asset_id: str, prop: PropertyDefinition, actor: str) -> PropertyDefinition:
        shell = self.get_asset(asset_id)
        if any(item.id == prop.id for item in shell.properties):
            raise DuplicateIdError(f"Property {prop.id} already exists on {asset_id}")
        if prop.connectivity and any(
            marker in json.dumps(prop.connectivity.model_dump()).lower()
            for marker in ("password", "token", "secret", "apikey", "begin ")
        ):
            raise ValueError("Connectivity metadata must not contain secrets")
        updated = shell.model_copy(
            update={"properties": [*shell.properties, prop], "revision": shell.revision + 1}
        )
        self._write(updated)
        self._audit(actor, "property.added", asset_id, prop.id)
        if prop.connectivity:
            self._audit(actor, "endpoint.changed", asset_id, prop.id)
        return prop

    def get_property(self, asset_id: str, property_id: str) -> PropertyDefinition:
        shell = self.get_asset(asset_id)
        for prop in shell.properties:
            if prop.id == property_id:
                return prop
        raise NotFoundError(f"Property {property_id} was not found on {asset_id}")

    def add_relationship(self, asset_id: str, rel: AssetRelationship, actor: str) -> AssetRelationship:
        shell = self.get_asset(asset_id)
        if rel.secondAssetId != asset_id and rel.firstAssetId != asset_id:
            raise ValueError("Relationship must include the current asset")
        if any(item.id == rel.id for item in shell.relationships):
            raise DuplicateIdError(f"Relationship {rel.id} already exists")
        updated = shell.model_copy(
            update={"relationships": [*shell.relationships, rel], "revision": shell.revision + 1}
        )
        self._write(updated)
        self._audit(actor, "relationship.added", asset_id, rel.id)
        return rel

    def list_audit(self, asset_id: str | None = None) -> list[AuditRecord]:
        if asset_id:
            rows = self._conn.execute(
                "SELECT id, at, actor, action, asset_id, detail FROM audit WHERE asset_id = ? ORDER BY id",
                (asset_id,),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT id, at, actor, action, asset_id, detail FROM audit ORDER BY id"
            ).fetchall()
        return [
            AuditRecord(
                id=row["id"],
                at=row["at"],
                actor=row["actor"],
                action=row["action"],
                assetId=row["asset_id"],
                detail=row["detail"],
            )
            for row in rows
        ]

    def put_shell(self, shell: AssetAdministrationShell, actor: str, action: str = "asset.imported") -> None:
        if self._exists(shell.id):
            raise DuplicateIdError(f"Asset {shell.id} already exists")
        self._write(shell)
        self._audit(actor, action, shell.id, shell.displayName)

    def _exists(self, asset_id: str) -> bool:
        row = self._conn.execute("SELECT 1 FROM assets WHERE id = ?", (asset_id,)).fetchone()
        return row is not None

    def _write(self, shell: AssetAdministrationShell) -> None:
        self._conn.execute(
            """
            INSERT INTO assets (id, document, active) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET document = excluded.document, active = excluded.active
            """,
            (shell.id, shell.model_dump_json(), 1 if shell.active else 0),
        )
        self._conn.commit()

    def _audit(self, actor: str, action: str, asset_id: str, detail: str | None) -> None:
        self._conn.execute(
            "INSERT INTO audit (at, actor, action, asset_id, detail) VALUES (?, ?, ?, ?, ?)",
            (_now(), actor, action, asset_id, detail),
        )
        self._conn.commit()
