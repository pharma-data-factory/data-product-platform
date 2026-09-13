import json
from pathlib import Path

from pdf_warehouse_sink import (
    WarehouseSink,
    WarehouseSinkSettings,
    dataset_from_parts,
)


def test_disabled_returns_none(tmp_path: Path) -> None:
    sink = WarehouseSink(
        WarehouseSinkSettings(enabled=False, staging_dir=str(tmp_path)),
    )
    assert sink.land({"eventId": "e1", "payload": {}}) is None


def test_file_profile_writes_jsonl(tmp_path: Path) -> None:
    sink = WarehouseSink(
        WarehouseSinkSettings(
            enabled=True,
            profile="file",
            staging_dir=str(tmp_path),
            dataset="manufacturing.demo_temperature_event_v1",
        ),
    )
    path = sink.land_payload(
        event_id="e1",
        timestamp="2026-09-11T10:00:00Z",
        source="component:default/demo",
        payload={"temperature": 21.5, "unit": "C"},
    )
    assert path is not None
    assert path.exists()
    row = json.loads(path.read_text(encoding="utf-8").strip())
    assert row["eventId"] == "e1"
    assert row["payload"]["temperature"] == 21.5


def test_snowflake_profile_writes_ddl_stub_without_account(tmp_path: Path) -> None:
    sink = WarehouseSink(
        WarehouseSinkSettings(
            enabled=True,
            profile="snowflake",
            staging_dir=str(tmp_path),
            dataset="manufacturing.demo_oee_result_v1",
            snowflake_account="",
        ),
    )
    path = sink.land(
        {
            "eventId": "e2",
            "timestamp": "2026-09-11T10:00:00Z",
            "source": "demo",
            "payload": {"oee": 0.8, "equipmentId": "F1"},
        },
    )
    assert path is not None
    ddl = path.parent / "CREATE_TABLE.sql"
    assert ddl.exists()
    text = ddl.read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS" in text
    assert "DEVELOPMENT stub" in text
    assert (path.parent / "NOT_CONNECTED.txt").exists()


def test_databricks_profile_marker(tmp_path: Path) -> None:
    sink = WarehouseSink(
        WarehouseSinkSettings(
            enabled=True,
            profile="databricks",
            staging_dir=str(tmp_path),
            dataset="manufacturing.demo_equipment_event_v1",
        ),
    )
    path = sink.land_payload(
        event_id="e3",
        timestamp="2026-09-11T10:00:00Z",
        source="demo",
        payload={"equipmentId": "CAPPER-01", "status": "ACTIVE"},
    )
    assert path is not None
    assert (path.parent / "_delta_log_stub.json").exists()


def test_dataset_from_parts() -> None:
    assert (
        dataset_from_parts("Manufacturing", "Line04-OEE", "oee-result", 1)
        == "manufacturing.line04_oee_oee_result_v1"
    )
