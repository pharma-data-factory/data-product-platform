from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from pdf_timeseries import MetricPoint, SqliteTimeSeriesStore

from app.domain.losses import MicrostopConfig
from app.domain.models import (
    CounterEvent,
    MachineStateEvent,
    ProductionContext,
    ProductionCountEvent,
    QualityCountEvent,
)
from app.domain.reason_codes import (
    DEFAULT_REASON_CODES,
    AssignmentSource,
    ReasonAssignment,
    ReasonCode,
    reason_code_from_payload,
)
from app.domain.windows import ensure_utc, to_iso
from app.ingestion.mappings import to_context

STATE_VALUES = {"RUNNING": 1, "STOPPED": 2, "IDLE": 3, "MAINTENANCE": 4}
QUERY_LIMIT = 10_000
REASON_METRIC = "oee.catalog.reason_code"
CONFIG_METRIC = "oee.config.loss"
ASSIGNMENT_METRIC = "oee.loss.assignment"
GLOBAL_ENTITY = "_global"


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
            self.ensure_default_catalog()
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
                "payload": json.dumps(_state_payload(event), separators=(",", ":")),
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
                "reworkCount": str(event.rework_count),
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

    def save_counter(self, event: CounterEvent) -> bool:
        if self.has_event(event.event_id):
            return False
        self.write_raw(
            "oee.raw.total_count",
            event.equipment_id,
            event.timestamp,
            float(event.total_count),
            {"eventId": event.event_id, "kind": "counter"},
        )
        self.write_raw(
            "oee.raw.good_count",
            event.equipment_id,
            event.timestamp,
            float(event.good_count),
            {
                "eventId": event.event_id,
                "kind": "counter",
                "rejectCount": str(event.reject_count),
                "reworkCount": "0",
            },
        )
        self.write_raw(
            "oee.raw.reject_count",
            event.equipment_id,
            event.timestamp,
            float(event.reject_count),
            {"eventId": event.event_id, "kind": "counter"},
        )
        self._event_ids.add(event.event_id)
        return True

    def save_result(self, payload: dict[str, Any]) -> None:
        window = payload.get("window") or {}
        start_raw = window.get("start") or payload.get("windowStart")
        if not isinstance(start_raw, str):
            return
        window_start = datetime.fromisoformat(
            start_raw[:-1] + "+00:00" if start_raw.endswith("Z") else start_raw
        )
        value = payload["oee"] if payload["oee"] is not None else -1.0
        self.write_raw(
            "oee.oee",
            payload["equipmentId"],
            window_start,
            float(value),
            {
                "windowKind": window.get("type") or payload.get("windowKind", ""),
                "windowEnd": window.get("end") or payload.get("windowEnd", ""),
                "calculationStatus": payload["calculationStatus"],
                "contractVersion": payload.get("contract", {}).get("version", "1.0.0"),
                "calculatedAt": payload.get("calculatedAt") or start_raw,
                "payload": json.dumps(payload, separators=(",", ":")),
            },
        )

    def load_states(self, equipment_id: str | None = None) -> list[MachineStateEvent]:
        points = self.store.query_range(
            entity_id=equipment_id, metric="oee.raw.machine_state", limit=QUERY_LIMIT
        )
        reverse = {value: name for name, value in STATE_VALUES.items()}
        events = []
        for point in reversed(points):
            state = reverse.get(int(point.value))
            if state is None:
                continue
            extra = json.loads(point.tags.get("payload") or "{}")
            end_raw = extra.get("end")
            events.append(
                MachineStateEvent(
                    event_id=point.tags["eventId"],
                    equipment_id=point.entity_id,
                    timestamp=point.timestamp,
                    state=state,  # type: ignore[arg-type]
                    reason=extra.get("reasonCode") or extra.get("reason") or None,
                    reason_code=extra.get("reasonCode") or extra.get("reason") or None,
                    end_timestamp=_parse_optional_time(end_raw),
                    signal=extra.get("signal"),
                    equipment_type=extra.get("equipmentType"),
                    site=extra.get("site"),
                    area=extra.get("area"),
                    line=extra.get("line"),
                    order_id=extra.get("orderId"),
                    batch_id=extra.get("batchId"),
                    material_id=extra.get("materialId"),
                    shift_id=extra.get("shiftId"),
                    recipe_id=extra.get("recipeId"),
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
                    rework_count=int(point.tags.get("reworkCount", "0")),
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

    def equipment_ids(self) -> list[str]:
        seen: set[str] = set()
        for point in self.store.query_range(metric="oee.raw.machine_state", limit=QUERY_LIMIT):
            seen.add(point.entity_id)
        for point in self.store.query_range(metric="oee.raw.context", limit=QUERY_LIMIT):
            seen.add(point.entity_id)
        return sorted(seen)

    def ensure_default_catalog(self) -> None:
        existing = {item.reason_code_id for item in self.load_reason_codes(include_inactive=True)}
        for code in DEFAULT_REASON_CODES:
            if code.reason_code_id not in existing:
                self.save_reason_code(code)

    def save_reason_code(self, code: ReasonCode) -> None:
        self.write_raw(
            REASON_METRIC,
            code.reason_code_id,
            datetime.now(UTC),
            1.0 if code.active else 0.0,
            {"kind": "reason-code", "payload": json.dumps(code.as_payload(), separators=(",", ":"))},
        )

    def load_reason_codes(self, include_inactive: bool = True) -> list[ReasonCode]:
        points = self.store.query_range(metric=REASON_METRIC, limit=QUERY_LIMIT)
        latest: dict[str, dict] = {}
        for point in points:
            if point.entity_id in latest:
                continue
            payload = json.loads(point.tags.get("payload") or "{}")
            if payload:
                latest[point.entity_id] = payload
        codes = [reason_code_from_payload(item) for item in latest.values()]
        if not include_inactive:
            codes = [item for item in codes if item.active]
        codes.sort(key=lambda item: item.reason_code_id)
        return codes

    def load_reason_code(self, reason_code_id: str) -> ReasonCode | None:
        for item in self.load_reason_codes(include_inactive=True):
            if item.reason_code_id == reason_code_id:
                return item
        return None

    def save_assignment(self, assignment: ReasonAssignment) -> None:
        self.write_raw(
            ASSIGNMENT_METRIC,
            assignment.loss_id,
            assignment.assigned_at or datetime.now(UTC),
            1.0,
            {
                "kind": "reason-assignment",
                "payload": json.dumps(assignment.as_payload(), separators=(",", ":")),
            },
        )

    def load_assignments(self) -> dict[str, ReasonAssignment]:
        points = self.store.query_range(metric=ASSIGNMENT_METRIC, limit=QUERY_LIMIT)
        latest: dict[str, ReasonAssignment] = {}
        for point in points:
            if point.entity_id in latest:
                continue
            payload = json.loads(point.tags.get("payload") or "{}")
            if not payload:
                continue
            latest[point.entity_id] = ReasonAssignment(
                loss_id=payload["lossId"],
                reason_code_id=payload["reasonCodeId"],
                source=AssignmentSource(payload["assignmentSource"]),
                original_reason_code_id=payload["originalReasonCodeId"],
                previous_reason_code_id=payload.get("previousReasonCodeId"),
                assigned_by=payload.get("assignedBy"),
                assigned_at=_parse_optional_time(payload.get("assignedAt")),
            )
        return latest

    def save_loss_config(self, config: MicrostopConfig) -> None:
        entity = config.equipment_id or config.equipment_type or GLOBAL_ENTITY
        self.write_raw(
            CONFIG_METRIC,
            entity,
            datetime.now(UTC),
            config.max_seconds,
            {"kind": "loss-config", "payload": json.dumps(config.as_payload(), separators=(",", ":"))},
        )

    def load_loss_configs(self) -> list[MicrostopConfig]:
        points = self.store.query_range(metric=CONFIG_METRIC, limit=QUERY_LIMIT)
        latest: dict[str, dict] = {}
        for point in points:
            if point.entity_id in latest:
                continue
            payload = json.loads(point.tags.get("payload") or "{}")
            if payload:
                latest[point.entity_id] = payload
        configs = []
        for payload in latest.values():
            configs.append(
                MicrostopConfig(
                    min_seconds=float(payload.get("microstopMinSeconds", 3)),
                    max_seconds=float(payload.get("microstopMaxSeconds", 60)),
                    equipment_id=payload.get("equipmentId"),
                    equipment_type=payload.get("equipmentType"),
                    microstop_states=tuple(payload.get("microstopStates") or ("STOPPED",)),
                    rules=tuple(payload.get("rules") or ()),
                )
            )
        return configs


def _state_payload(event: MachineStateEvent) -> dict[str, Any]:
    return {
        "reason": event.reason_code or event.reason,
        "reasonCode": event.reason_code or event.reason,
        "end": to_iso(event.end_timestamp) if event.end_timestamp else None,
        "signal": event.signal,
        "equipmentType": event.equipment_type,
        "site": event.site,
        "area": event.area,
        "line": event.line,
        "orderId": event.order_id,
        "batchId": event.batch_id,
        "materialId": event.material_id,
        "shiftId": event.shift_id,
        "recipeId": event.recipe_id,
    }


def _parse_optional_time(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    return ensure_utc(datetime.fromisoformat(normalized))
