from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

WarehouseProfile = Literal["file", "snowflake", "databricks"]


class WarehouseSinkSettings(BaseSettings):
    """
    Opt-in warehouse landing for Product Publish Bus envelopes (Phase C / ADR-011).

    Default profile is local file staging. Snowflake and Databricks profiles
    prepare dataset DDL + staging artifacts; they do NOT open live warehouse
    connections in this DEVELOPMENT component (no GxP / production claim).
    """

    model_config = SettingsConfigDict(env_prefix="WAREHOUSE_", extra="ignore")

    enabled: bool = False
    profile: WarehouseProfile = "file"
    staging_dir: str = "data/warehouse-staging"
    dataset: str = ""
    # Optional Snowflake metadata for DDL generation only (no live connect)
    snowflake_database: str = "NEXORA"
    snowflake_schema: str = "PRODUCTS"
    snowflake_account: str = ""
    # Optional Databricks metadata for path naming only
    databricks_catalog: str = "nexora"
    databricks_schema: str = "products"


def dataset_from_parts(
    domain: str,
    product: str,
    contract: str,
    major: int | str = 1,
) -> str:
    """Build `{domain}.{product}_{contract}_v{major}` dataset id."""
    d = _slug(domain) or "unknown"
    p = _slug(product).replace("-", "_") or "product"
    c = _slug(contract).replace("-", "_") or "contract"
    m = str(major).lstrip("vV") or "1"
    return f"{d}.{p}_{c}_v{m}"


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


class WarehouseSink:
    """
    Lands Nexora StreamEvent envelopes into a staging area.

    Profiles:
    - file: JSONL under staging_dir/dataset/
    - snowflake: same JSONL + CREATE TABLE DDL stub (no live Snowflake)
    - databricks: same JSONL under delta-like path naming (no live Databricks)
    """

    def __init__(self, settings: WarehouseSinkSettings | None = None) -> None:
        self.settings = settings or WarehouseSinkSettings()
        self.last_error: str | None = None
        self.landed_count = 0

    @property
    def enabled(self) -> bool:
        return bool(self.settings.enabled)

    def land(self, envelope: dict[str, Any], *, dataset: str | None = None) -> Path | None:
        """
        Persist one StreamEvent-shaped envelope. Returns staging file path or None
        when disabled. Never opens a live warehouse connection.
        """
        if not self.enabled:
            return None
        target = (dataset or self.settings.dataset or "default.landing_v1").strip()
        if not target:
            self.last_error = "warehouse dataset is empty"
            return None
        try:
            self._validate_envelope(envelope)
            root = self._dataset_dir(target)
            root.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            event_id = str(envelope.get("eventId") or "event")
            path = root / f"{stamp}_{_slug(event_id)}.jsonl"
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(envelope, default=str) + "\n")
            if self.settings.profile == "snowflake":
                self._write_snowflake_ddl(root, target, envelope)
            elif self.settings.profile == "databricks":
                self._write_databricks_marker(root, target)
            self.landed_count += 1
            self.last_error = None
            return path
        except Exception as error:  # noqa: BLE001
            self.last_error = str(error)
            return None

    def land_payload(
        self,
        *,
        event_id: str,
        timestamp: str,
        source: str,
        payload: dict[str, Any],
        dataset: str | None = None,
        data_quality: str = "PASS",
    ) -> Path | None:
        return self.land(
            {
                "eventId": event_id,
                "timestamp": timestamp,
                "source": source,
                "dataQuality": data_quality,
                "payload": payload,
            },
            dataset=dataset,
        )

    def _validate_envelope(self, envelope: dict[str, Any]) -> None:
        if "payload" not in envelope or not isinstance(envelope["payload"], dict):
            raise ValueError("StreamEvent envelope requires object field 'payload'")
        if not envelope.get("eventId"):
            raise ValueError("StreamEvent envelope requires 'eventId'")

    def _dataset_dir(self, dataset: str) -> Path:
        safe = dataset.replace(".", "/").replace("-", "_")
        base = Path(self.settings.staging_dir)
        if self.settings.profile == "databricks":
            return (
                base
                / "databricks"
                / self.settings.databricks_catalog
                / self.settings.databricks_schema
                / safe
            )
        if self.settings.profile == "snowflake":
            return (
                base
                / "snowflake"
                / self.settings.snowflake_database.lower()
                / self.settings.snowflake_schema.lower()
                / safe
            )
        return base / "file" / safe

    def _write_snowflake_ddl(
        self,
        root: Path,
        dataset: str,
        envelope: dict[str, Any],
    ) -> None:
        """
        Emit a non-executed DDL stub for operators. Live APPLY is out of scope
        for this DEVELOPMENT component (no Snowflake driver dependency).
        """
        table = dataset.split(".")[-1].upper()
        payload = envelope.get("payload") or {}
        columns = ["EVENT_ID VARCHAR", "EVENT_TS TIMESTAMP_TZ", "SOURCE VARCHAR", "DATA_QUALITY VARCHAR"]
        for key, value in payload.items():
            col = re.sub(r"[^A-Z0-9_]", "_", str(key).upper())
            sql_type = "FLOAT" if isinstance(value, (int, float)) and not isinstance(value, bool) else "VARIANT"
            if isinstance(value, bool):
                sql_type = "BOOLEAN"
            elif isinstance(value, str):
                sql_type = "VARCHAR"
            columns.append(f"{col} {sql_type}")
        ddl = (
            f"-- DEVELOPMENT stub only. Not applied to Snowflake.\n"
            f"-- account={self.settings.snowflake_account or 'NOT_CONFIGURED'}\n"
            f"CREATE TABLE IF NOT EXISTS "
            f"{self.settings.snowflake_database}.{self.settings.snowflake_schema}.{table} (\n  "
            + ",\n  ".join(columns)
            + "\n);\n"
        )
        (root / "CREATE_TABLE.sql").write_text(ddl, encoding="utf-8")
        if not self.settings.snowflake_account:
            (root / "NOT_CONNECTED.txt").write_text(
                "WAREHOUSE_SNOWFLAKE_ACCOUNT is empty. "
                "Staging JSONL is written locally; no live Snowflake session.\n",
                encoding="utf-8",
            )

    def _write_databricks_marker(self, root: Path, dataset: str) -> None:
        marker = {
            "profile": "databricks",
            "catalog": self.settings.databricks_catalog,
            "schema": self.settings.databricks_schema,
            "dataset": dataset,
            "note": "DEVELOPMENT staging only — no live Databricks / Unity Catalog write",
        }
        (root / "_delta_log_stub.json").write_text(
            json.dumps(marker, indent=2) + "\n",
            encoding="utf-8",
        )
