from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock

from app.models import Equipment


class EquipmentStore:
    def __init__(self, sqlite_path: str) -> None:
        self._path = Path(sqlite_path)
        self._lock = Lock()
        self._connection: sqlite3.Connection | None = None

    def initialize(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        connection = self._connect()
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS equipment (
                equipment_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                site TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                stored_at TEXT NOT NULL
            )
            """
        )
        connection.commit()

    def upsert(self, record: Equipment) -> tuple[Equipment, bool]:
        with self._lock:
            connection = self._connect()
            existing = self._find(connection, record.equipmentId)
            stored_at = datetime.now(UTC).isoformat()
            connection.execute(
                """
                INSERT INTO equipment (
                    equipment_id, name, site, status, updated_at, stored_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(equipment_id) DO UPDATE SET
                    name = excluded.name,
                    site = excluded.site,
                    status = excluded.status,
                    updated_at = excluded.updated_at,
                    stored_at = excluded.stored_at
                """,
                (
                    record.equipmentId,
                    record.name,
                    record.site,
                    record.status,
                    record.updatedAt.isoformat(),
                    stored_at,
                ),
            )
            connection.commit()
            return record, existing is None

    def list_recent(self, limit: int = 100) -> list[Equipment]:
        with self._lock:
            connection = self._connect()
            rows = connection.execute(
                """
                SELECT equipment_id, name, site, status, updated_at
                FROM equipment
                ORDER BY stored_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [self._to_record(row) for row in rows]

    def count(self) -> int:
        with self._lock:
            connection = self._connect()
            row = connection.execute("SELECT COUNT(*) FROM equipment").fetchone()
        return int(row[0]) if row else 0

    def clear(self) -> None:
        with self._lock:
            connection = self._connect()
            connection.execute("DELETE FROM equipment")
            connection.commit()

    def close(self) -> None:
        with self._lock:
            if self._connection is not None:
                self._connection.close()
                self._connection = None

    def _find(self, connection: sqlite3.Connection, equipment_id: str) -> Equipment | None:
        row = connection.execute(
            """
            SELECT equipment_id, name, site, status, updated_at
            FROM equipment
            WHERE equipment_id = ?
            """,
            (equipment_id,),
        ).fetchone()
        return self._to_record(row) if row else None

    def _to_record(self, row: tuple) -> Equipment:
        return Equipment(
            equipmentId=row[0],
            name=row[1],
            site=row[2],
            status=row[3],
            updatedAt=datetime.fromisoformat(row[4]),
        )

    def _connect(self) -> sqlite3.Connection:
        if self._connection is None:
            self._connection = sqlite3.connect(self._path, check_same_thread=False)
        return self._connection
