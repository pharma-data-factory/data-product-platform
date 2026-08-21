from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.domain.models import (
    MachineStateEvent,
    PlannedDowntime,
    ProductionContext,
    ProductionCountEvent,
    QualityCountEvent,
)
from app.domain.windows import ensure_utc


def _parse_time(value: str) -> datetime:
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    return ensure_utc(datetime.fromisoformat(normalized))


def parse_mqtt_message(topic: str, payload: str) -> dict[str, Any]:
    body = json.loads(payload)
    if not isinstance(body, dict):
        raise TypeError("MQTT payload must be a JSON object")
    inner = body.get("payload") if isinstance(body.get("payload"), dict) else body
    source = body.get("source") if isinstance(body.get("source"), dict) else {}
    equipment = (
        inner.get("equipmentId")
        or body.get("equipmentId")
        or source.get("equipment")
    )
    event_id = inner.get("eventId") or body.get("eventId")
    timestamp = inner.get("timestamp") or body.get("timestamp")
    mapped = dict(inner)
    if equipment:
        mapped["equipmentId"] = equipment
    if event_id:
        mapped["eventId"] = event_id
    if timestamp:
        mapped["timestamp"] = timestamp
    if source:
        mapped["source"] = source
    mapped["_topic"] = topic
    return mapped


def to_state_event(payload: dict[str, Any]) -> MachineStateEvent:
    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    return MachineStateEvent(
        event_id=str(payload["eventId"]),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(str(payload["timestamp"])),
        state=payload["state"],
        reason=payload.get("reason"),
        envelope_equipment_id=source.get("equipment"),
    )


def to_production_count(payload: dict[str, Any]) -> ProductionCountEvent:
    return ProductionCountEvent(
        event_id=str(payload["eventId"]),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(str(payload["timestamp"])),
        total_count=int(payload["totalCount"]),
    )


def to_quality_count(payload: dict[str, Any]) -> QualityCountEvent:
    return QualityCountEvent(
        event_id=str(payload["eventId"]),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(str(payload["timestamp"])),
        good_count=int(payload["goodCount"]),
        reject_count=int(payload["rejectCount"]),
        total_count=payload.get("totalCount"),
    )


def to_context(payload: dict[str, Any]) -> ProductionContext:
    downtime = []
    for item in payload.get("plannedDowntime") or []:
        downtime.append(
            PlannedDowntime(
                start=_parse_time(item["start"]),
                end=_parse_time(item["end"]),
                kind=item.get("kind"),
            )
        )
    return ProductionContext(
        context_id=str(payload["contextId"]),
        equipment_id=str(payload["equipmentId"]),
        planned_start=_parse_time(str(payload["plannedStart"])),
        planned_end=_parse_time(str(payload["plannedEnd"])),
        ideal_cycle_time_seconds=float(payload["idealCycleTimeSeconds"]),
        timestamp=_parse_time(str(payload["timestamp"])),
        order_id=payload.get("orderId"),
        material_id=payload.get("materialId"),
        target_quantity=payload.get("targetQuantity"),
        site=payload.get("site"),
        area=payload.get("area"),
        line=payload.get("line"),
        shift_id=payload.get("shiftId"),
        planned_downtime=tuple(downtime),
    )


def classify_event(payload: dict[str, Any]) -> str | None:
    if "state" in payload:
        return "state"
    if "goodCount" in payload or "rejectCount" in payload:
        return "quality"
    if "totalCount" in payload:
        return "production"
    if "contextId" in payload:
        return "context"
    return None
