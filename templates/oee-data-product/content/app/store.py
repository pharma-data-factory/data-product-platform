from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from pdf_timeseries import MetricPoint, SqliteTimeSeriesStore

from app.domain.models import (
    MachineStateEvent,
    ProductionContext,
    ProductionCountEvent,
    QualityCountEvent,
)
from app.ingestion.mappings import to_context

STATE_VALUES = {"RUNNING": 1, "STOPPED": 2, "IDLE": 3, "MAINTENANCE": 4}
QUERY_LIMIT = 10_000


class OeeEventStore:
    """Persists raw events and derived OEE via TimeSeriesStore. No second DB API."""

    def __init__(self, store: SqliteTimeSeriesStore) -> None:
        self.store = store
        self._event_ids: set[str] = set()
        self._event_ids_loaded = False
        self.storage_error: str | None = None

    def initialize(self) -> None:
        try:
            self.store.initialize()
            self.storage_error = None
        except Exception as error:
            self.storage_error = str(error)
            raise

    def forget_event_ids(self) -> None:
        self._event_ids.clear()
        self._event_ids_loaded = False

    def has_event(self, event_id: str) -> bool:
        if not self._event_ids_loaded:
            for point in self.store.query_range(limit=QUERY_LIMIT):
                found = point.tags.get("eventId")
                if found:
                    self._event_ids.add(found)
            self._event_ids_loaded = True
        return event_id in self._event_ids

    def write_raw(self, metric: str, entity_id: str, timestamp: datetime, value: float, tags: dict[str, str]) -> None:
        try:
            self.store.write_point(
                MetricPoint(
                    timestamp=timestamp,
                    entityId=entity_id,
                    metric=metric,
                    value=value,
                    unit="count",
                    tags=tags,
                )
            )
            self.storage_error = None
        except Exception as error:
            self.storage_error = str(error)
            raise

    def save_state(self, event: MachineStateEvent) -> bool:
        if self.has_event(event.event_id):
            return False
        self.write_raw(
            "oee.raw.machine_state",
            event.equipment_id,
            event.timestamp,
            float(STATE_VALUES[event.state]),
            {
                "eventId": event.event_id,
                "state": event.state,
                "kind": "state",
            },
        )
        self._event_ids.add(event.event_id)
        return True

    def save_production(self, event: ProductionCountEvent) -> bool:
        if self.has_event(event.event_id):
            return False
        self.write_raw(
            "oee.raw.total_count",
            event.equipment_id,
            event.timestamp,
            float(event.total_count),
            {"eventId": event.event_id, "kind": "production"},
        )
        self._event_ids.add(event.event_id)
        return True

    def save_quality(self, event: QualityCountEvent) -> bool:
        if self.has_event(event.event_id):
            return False
        self.write_raw(
            "oee.raw.good_count",
            event.equipment_id,
            event.timestamp,
            float(event.good_count),
            {
                "eventId": event.event_id,
                "kind": "quality",
                "rejectCount": str(event.reject_count),
            },
        )
        self.write_raw(
            "oee.raw.reject_count",
            event.equipment_id,
            event.timestamp,
            float(event.reject_count),
            {"eventId": event.event_id, "kind": "quality"},
        )
        self._event_ids.add(event.event_id)
        return True

    def save_context(self, context: ProductionContext, payload: dict[str, Any]) -> None:
        self.write_raw(
            "oee.raw.context",
            context.equipment_id,
            context.timestamp,
            1.0,
            {
                "eventId": context.context_id,
                "kind": "context",
                "payload": json.dumps(payload, separators=(",", ":")),
            },
        )

    def save_result(self, payload: dict[str, Any]) -> None:
        window_start = datetime.fromisoformat(payload["windowStart"])
        value = payload["oee"] if payload["oee"] is not None else -1.0
        self.write_raw(
            "oee.oee",
            payload["equipmentId"],
            window_start,
            float(value),
            {
                "windowKind": payload["windowKind"],
                "windowEnd": payload["windowEnd"],
                "calculationStatus": payload["calculationStatus"],
                "contractVersion": payload["contract"]["version"],
                "calculatedAt": payload["calculatedAt"],
                "payload": json.dumps(payload, separators=(",", ":")),
            },
        )

    def load_states(self, equipment_id: str) -> list[MachineStateEvent]:
        points = self.store.query_range(
            entity_id=equipment_id, metric="oee.raw.machine_state", limit=QUERY_LIMIT
        )
        reverse = {value: name for name, value in STATE_VALUES.items()}
        events = []
        for point in reversed(points):
            state = reverse.get(int(point.value))
            if state is None:
                continue
            events.append(
                MachineStateEvent(
                    event_id=point.tags["eventId"],
                    equipment_id=point.entity_id,
                    timestamp=point.timestamp,
                    state=state,  # type: ignore[arg-type]
                )
            )
        return events

    def load_production(self, equipment_id: str) -> list[ProductionCountEvent]:
        points = self.store.query_range(
            entity_id=equipment_id, metric="oee.raw.total_count", limit=QUERY_LIMIT
        )
        return [
            ProductionCountEvent(
                event_id=point.tags["eventId"],
                equipment_id=point.entity_id,
                timestamp=point.timestamp,
                total_count=int(point.value),
            )
            for point in reversed(points)
        ]

    def load_quality(self, equipment_id: str) -> list[QualityCountEvent]:
        goods = self.store.query_range(
            entity_id=equipment_id, metric="oee.raw.good_count", limit=QUERY_LIMIT
        )
        events = []
        for point in reversed(goods):
            events.append(
                QualityCountEvent(
                    event_id=point.tags["eventId"],
                    equipment_id=point.entity_id,
                    timestamp=point.timestamp,
                    good_count=int(point.value),
                    reject_count=int(point.tags.get("rejectCount", "0")),
                )
            )
        return events

    def load_context(self, equipment_id: str) -> ProductionContext | None:
        points = self.store.query_range(
            entity_id=equipment_id, metric="oee.raw.context", limit=1
        )
        if not points:
            return None
        payload = json.loads(points[0].tags.get("payload") or "{}")
        if not payload:
            return None
        return to_context(payload)

    def load_results(self, equipment_id: str | None = None) -> list[dict[str, Any]]:
        points = self.store.query_range(
            entity_id=equipment_id, metric="oee.oee", limit=QUERY_LIMIT
        )
        results = []
        for point in points:
            raw = point.tags.get("payload")
            if raw:
                results.append(json.loads(raw))
        return results
