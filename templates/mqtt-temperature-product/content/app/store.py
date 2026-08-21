from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock

from app.models import TemperatureEvent


class TemperatureStore:
    def __init__(self, sqlite_path: str) -> None:
        self._path = Path(sqlite_path)
        self._lock = Lock()
        self._connection: sqlite3.Connection | None = None

    def initialize(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        connection = self._connect()
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS temperatures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                device_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                temperature REAL NOT NULL,
                unit TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()

    def insert(self, event: TemperatureEvent) -> tuple[TemperatureEvent, bool]:
        with self._lock:
            connection = self._connect()
            existing = self._find(connection, event.eventId)
            if existing is not None:
                return existing, False
            try:
                connection.execute(
                    """
                    INSERT INTO temperatures (
                        event_id, device_id, timestamp, temperature, unit, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event.eventId,
                        event.deviceId,
                        event.timestamp.isoformat(),
                        event.temperature,
                        event.unit,
                        datetime.now(UTC).isoformat(),
                    ),
                )
                connection.commit()
            except sqlite3.IntegrityError:
                connection.rollback()
                existing = self._find(connection, event.eventId)
                if existing is not None:
                    return existing, False
                raise
            return event, True

    def list_recent(self, limit: int = 100) -> list[TemperatureEvent]:
        with self._lock:
            connection = self._connect()
            rows = connection.execute(
                """
                SELECT event_id, device_id, timestamp, temperature, unit
                FROM temperatures
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [self._to_event(row) for row in rows]

    def count(self) -> int:
        with self._lock:
            connection = self._connect()
            row = connection.execute("SELECT COUNT(*) FROM temperatures").fetchone()
        return int(row[0]) if row else 0

    def clear(self) -> None:
        with self._lock:
            connection = self._connect()
            connection.execute("DELETE FROM temperatures")
            connection.commit()

    def close(self) -> None:
        with self._lock:
            if self._connection is not None:
                self._connection.close()
                self._connection = None

    def _find(self, connection: sqlite3.Connection, event_id: str) -> TemperatureEvent | None:
        row = connection.execute(
            """
            SELECT event_id, device_id, timestamp, temperature, unit
            FROM temperatures
            WHERE event_id = ?
            """,
            (event_id,),
        ).fetchone()
        return self._to_event(row) if row else None

    def _to_event(self, row: tuple) -> TemperatureEvent:
        return TemperatureEvent(
            eventId=row[0],
            deviceId=row[1],
            timestamp=datetime.fromisoformat(row[2]),
            temperature=row[3],
            unit=row[4],
        )

    def _connect(self) -> sqlite3.Connection:
        if self._connection is None:
            self._connection = sqlite3.connect(self._path, check_same_thread=False)
        return self._connection
