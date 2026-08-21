from datetime import UTC, datetime

import pytest
from pdf_observability import Observability
from pdf_timeseries import (
    InfluxTimeSeriesStore,
    MetricPoint,
    SqliteTimeSeriesStore,
    TimescaleTimeSeriesStore,
    TimestreamTimeSeriesStore,
)


def test_write_query_latest_and_retention(tmp_path) -> None:
    obs = Observability("timeseries")
    store = SqliteTimeSeriesStore(str(tmp_path / "metrics.db"), observability=obs)
    store.initialize()
    older = MetricPoint(
        timestamp=datetime(2026, 1, 1, tzinfo=UTC),
        entityId="machine-01",
        metric="cycle-time",
        value=10.0,
        unit="seconds",
    )
    newer = MetricPoint(
        timestamp=datetime(2026, 8, 20, tzinfo=UTC),
        entityId="machine-01",
        metric="cycle-time",
        value=12.4,
        unit="seconds",
        tags={"line": "packaging"},
    )
    store.write_point(older)
    store.write_point(newer)
    latest = store.latest(entity_id="machine-01", metric="cycle-time")
    assert latest is not None
    assert latest.value == 12.4
    ranged = store.query_range(
        entity_id="machine-01",
        metric="cycle-time",
        start=datetime(2026, 8, 1, tzinfo=UTC),
    )
    assert len(ranged) == 1
    deleted = store.delete_before(datetime(2026, 6, 1, tzinfo=UTC))
    assert deleted == 1
    assert store.latest(entity_id="machine-01", metric="cycle-time") is not None
    assert obs.metrics.snapshot()["counters"]["timeseries_writes"] == 2
    store.close()


def test_initialize_fails_when_path_cannot_be_created(tmp_path) -> None:
    blocker = tmp_path / "not-a-directory"
    blocker.write_text("x", encoding="utf-8")
    store = SqliteTimeSeriesStore(str(blocker / "metrics.db"))
    with pytest.raises(OSError):
        store.initialize()


def test_future_adapters_are_interfaces_only() -> None:
    for adapter in (TimescaleTimeSeriesStore, InfluxTimeSeriesStore, TimestreamTimeSeriesStore):
        with pytest.raises(NotImplementedError):
            adapter()
