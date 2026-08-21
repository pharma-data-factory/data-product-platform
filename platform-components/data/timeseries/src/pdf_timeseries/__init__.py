from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any, Protocol

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class TimeSeriesSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TIMESERIES_", extra="ignore")

    sqlite_path: str = "data/metrics.db"


class MetricPoint(BaseModel):
    timestamp: datetime
    entity_id: str = Field(alias="entityId")
    metric: str
    value: float
    unit: str
    tags: dict[str, str] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class TimeSeriesStore(Protocol):
    """Adapter seam. SQLite today; TimescaleDB / InfluxDB / Timestream later."""

    def initialize(self) -> None: ...
    def write_point(self, point: MetricPoint) -> MetricPoint: ...
    def query_range(
        self,
        *,
        entity_id: str | None = None,
        metric: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        limit: int = 100,
    ) -> list[MetricPoint]: ...
    def latest(
        self,
        *,
        entity_id: str | None = None,
        metric: str | None = None,
    ) -> MetricPoint | None: ...
    def delete_before(self, cutoff: datetime) -> int: ...
    def close(self) -> None: ...


class SqliteTimeSeriesStore:
    def __init__(
        self,
        sqlite_path: str | None = None,
        observability: Any | None = None,
    ) -> None:
        self._path = Path(sqlite_path or TimeSeriesSettings().sqlite_path)
        self._observability = observability
        self._lock = Lock()
        self._connection: sqlite3.Connection | None = None

    def initialize(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        connection = self._connect()
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS metric_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                metric TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                tags TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_metric_points_lookup ON metric_points (entity_id, metric, ts)",
        )
        connection.commit()

    def write_point(self, point: MetricPoint) -> MetricPoint:
        with self._lock:
            connection = self._connect()
            connection.execute(
                """
                INSERT INTO metric_points (ts, entity_id, metric, value, unit, tags)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    point.timestamp.isoformat(),
                    point.entity_id,
                    point.metric,
                    point.value,
                    point.unit,
                    json.dumps(point.tags),
                ),
            )
            connection.commit()
        if self._observability is not None:
            self._observability.metrics.incr("timeseries_writes")
        return point

    def query_range(
        self,
        *,
        entity_id: str | None = None,
        metric: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        limit: int = 100,
    ) -> list[MetricPoint]:
        clauses = ["1=1"]
        params: list[Any] = []
        if entity_id:
            clauses.append("entity_id = ?")
            params.append(entity_id)
        if metric:
            clauses.append("metric = ?")
            params.append(metric)
        if start:
            clauses.append("ts >= ?")
            params.append(start.isoformat())
        if end:
            clauses.append("ts <= ?")
            params.append(end.isoformat())
        params.append(limit)
        with self._lock:
            connection = self._connect()
            rows = connection.execute(
                f"""
                SELECT ts, entity_id, metric, value, unit, tags
                FROM metric_points
                WHERE {' AND '.join(clauses)}
                ORDER BY ts DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
        return [self._to_point(row) for row in rows]

    def latest(
        self,
        *,
        entity_id: str | None = None,
        metric: str | None = None,
    ) -> MetricPoint | None:
        points = self.query_range(entity_id=entity_id, metric=metric, limit=1)
        return points[0] if points else None

    def delete_before(self, cutoff: datetime) -> int:
        """Retention seam. Callers choose the cutoff; this store only deletes."""
        with self._lock:
            connection = self._connect()
            cursor = connection.execute(
                "DELETE FROM metric_points WHERE ts < ?",
                (cutoff.isoformat(),),
            )
            connection.commit()
            return int(cursor.rowcount)

    def close(self) -> None:
        with self._lock:
            if self._connection is not None:
                self._connection.close()
                self._connection = None

    def _to_point(self, row: tuple[Any, ...]) -> MetricPoint:
        return MetricPoint(
            timestamp=datetime.fromisoformat(row[0]),
            entity_id=row[1],
            metric=row[2],
            value=row[3],
            unit=row[4],
            tags=json.loads(row[5] or "{}"),
        )

    def _connect(self) -> sqlite3.Connection:
        if self._connection is None:
            self._connection = sqlite3.connect(self._path, check_same_thread=False)
        return self._connection


def utc_now() -> datetime:
    return datetime.now(UTC)


class TimescaleTimeSeriesStore:
    """Planned TimescaleDB adapter. Do not add the dependency in this wave."""

    def __init__(self, *_args: Any, **_kwargs: Any) -> None:
        raise NotImplementedError(
            "TimescaleDB adapter is planned. Use SqliteTimeSeriesStore.",
        )


class InfluxTimeSeriesStore:
    """Planned InfluxDB adapter. Do not add the dependency in this wave."""

    def __init__(self, *_args: Any, **_kwargs: Any) -> None:
        raise NotImplementedError(
            "InfluxDB adapter is planned. Use SqliteTimeSeriesStore.",
        )


class TimestreamTimeSeriesStore:
    """Planned AWS Timestream adapter. Do not add the dependency in this wave."""

    def __init__(self, *_args: Any, **_kwargs: Any) -> None:
        raise NotImplementedError(
            "AWS Timestream adapter is planned. Use SqliteTimeSeriesStore.",
        )
