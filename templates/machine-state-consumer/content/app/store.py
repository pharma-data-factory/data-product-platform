from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Literal

from app.models import MachineStateRecord, UnsEvent

Outcome = Literal["created", "duplicate", "ignored_out_of_order"]


class MachineStateStore:
    def __init__(self, sqlite_path: str) -> None:
        self._path = Path(sqlite_path)
        self._lock = Lock()
        self._connection: sqlite3.Connection | None = None

    def initialize(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        connection = self._connect()
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS processed_events (
                event_id TEXT PRIMARY KEY,
                equipment_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                outcome TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS machine_states (
                equipment_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                reason TEXT,
                event_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                site TEXT NOT NULL,
                area TEXT NOT NULL,
                line TEXT NOT NULL
            )
            """
        )
        connection.commit()

    def apply(self, event: UnsEvent) -> tuple[MachineStateRecord, Outcome]:
        record = self._to_record(event)
        with self._lock:
            connection = self._connect()
            existing_event = connection.execute(
                "SELECT equipment_id, outcome FROM processed_events WHERE event_id = ?",
                (record.eventId,),
            ).fetchone()
            if existing_event is not None:
                current = self._get(connection, existing_event[0]) or record
                return current, "duplicate"

            current = self._get(connection, record.equipmentId)
            outcome: Outcome = "created"
            # Latest timestamp wins. Older events are recorded but ignored.
            if current is not None and record.timestamp <= current.timestamp:
                outcome = "ignored_out_of_order"
            else:
                connection.execute(
                    """
                    INSERT INTO machine_states (
                        equipment_id, state, reason, event_id, timestamp, site, area, line
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(equipment_id) DO UPDATE SET
                        state = excluded.state,
                        reason = excluded.reason,
                        event_id = excluded.event_id,
                        timestamp = excluded.timestamp,
                        site = excluded.site,
                        area = excluded.area,
                        line = excluded.line
                    """,
                    (
                        record.equipmentId,
                        record.state,
                        record.reason,
                        record.eventId,
                        record.timestamp.isoformat(),
                        record.site,
                        record.area,
                        record.line,
                    ),
                )
            connection.execute(
                """
                INSERT INTO processed_events (event_id, equipment_id, timestamp, outcome)
                VALUES (?, ?, ?, ?)
                """,
                (
                    record.eventId,
                    record.equipmentId,
                    record.timestamp.isoformat(),
                    outcome,
                ),
            )
            connection.commit()
            stored = self._get(connection, record.equipmentId) or record
            return stored, outcome

    def list_machines(self) -> list[MachineStateRecord]:
        with self._lock:
            connection = self._connect()
            rows = connection.execute(
                """
                SELECT equipment_id, state, reason, event_id, timestamp, site, area, line
                FROM machine_states
                ORDER BY equipment_id
                """
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def get_machine(self, equipment_id: str) -> MachineStateRecord | None:
        with self._lock:
            return self._get(self._connect(), equipment_id)

    def list_recent_events(self, limit: int = 100) -> list[dict[str, str]]:
        with self._lock:
            connection = self._connect()
            rows = connection.execute(
                """
                SELECT event_id, equipment_id, timestamp, outcome
                FROM processed_events
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [
            {
                "eventId": row[0],
                "equipmentId": row[1],
                "timestamp": row[2],
                "outcome": row[3],
            }
            for row in rows
        ]

    def quality_payloads(self) -> list[dict]:
        return [item.model_dump(mode="json") for item in self.list_machines()]

    def clear(self) -> None:
        with self._lock:
            connection = self._connect()
            connection.execute("DELETE FROM processed_events")
            connection.execute("DELETE FROM machine_states")
            connection.commit()

    def close(self) -> None:
        with self._lock:
            if self._connection is not None:
                self._connection.close()
                self._connection = None

    def _get(self, connection: sqlite3.Connection, equipment_id: str) -> MachineStateRecord | None:
        row = connection.execute(
            """
            SELECT equipment_id, state, reason, event_id, timestamp, site, area, line
            FROM machine_states
            WHERE equipment_id = ?
            """,
            (equipment_id,),
        ).fetchone()
        return self._row_to_record(row) if row else None

    def _to_record(self, event: UnsEvent) -> MachineStateRecord:
        payload = event.payload
        return MachineStateRecord(
            equipmentId=event.source.equipment,
            state=payload["state"],
            reason=payload.get("reason"),
            eventId=event.eventId,
            timestamp=event.timestamp,
            site=event.source.site,
            area=event.source.area,
            line=event.source.line,
        )

    def _row_to_record(self, row: tuple) -> MachineStateRecord:
        return MachineStateRecord(
            equipmentId=row[0],
            state=row[1],
            reason=row[2],
            eventId=row[3],
            timestamp=datetime.fromisoformat(row[4]),
            site=row[5],
            area=row[6],
            line=row[7],
        )

    def _connect(self) -> sqlite3.Connection:
        if self._connection is None:
            self._connection = sqlite3.connect(self._path, check_same_thread=False)
        return self._connection
