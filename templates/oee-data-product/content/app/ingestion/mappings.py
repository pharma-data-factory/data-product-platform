from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.domain.losses import canonicalize_state
from app.domain.models import (
    CounterEvent,
    MachineStateEvent,
    PlannedDowntime,
    ProductionContext,
    ProductionCountEvent,
    QualityCountEvent,
)
from app.domain.quality import now_utc
from app.domain.windows import ensure_utc, to_iso


def _parse_time(value: str) -> datetime:
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    return ensure_utc(datetime.fromisoformat(normalized))


def _optional_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    return _parse_time(value)


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
    timestamp = payload.get("timestamp") or payload.get("start")
    end_value = payload.get("end")
    reason_code = payload.get("reasonCode") or payload.get("reason")
    return MachineStateEvent(
        event_id=str(payload.get("eventId") or f"{payload.get('equipmentId')}:{timestamp}:state"),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(str(timestamp)),
        state=canonicalize_state(str(payload["state"])),  # type: ignore[arg-type]
        reason=reason_code,
        reason_code=reason_code,
        envelope_equipment_id=source.get("equipment"),
        end_timestamp=_parse_time(str(end_value)) if end_value else None,
        signal=payload.get("signal"),
        equipment_type=payload.get("equipmentType"),
        site=payload.get("site"),
        area=payload.get("area"),
        line=payload.get("line"),
        order_id=payload.get("orderId"),
        batch_id=payload.get("batchId"),
        material_id=payload.get("materialId") or payload.get("productId"),
        shift_id=payload.get("shiftId"),
        recipe_id=payload.get("recipeId"),
    )


def to_production_count(payload: dict[str, Any]) -> ProductionCountEvent:
    timestamp = str(payload["timestamp"])
    return ProductionCountEvent(
        event_id=str(payload.get("eventId") or f"{payload.get('equipmentId')}:{timestamp}:count"),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(timestamp),
        total_count=int(payload["totalCount"]),
    )


def to_quality_count(payload: dict[str, Any]) -> QualityCountEvent:
    timestamp = str(payload["timestamp"])
    return QualityCountEvent(
        event_id=str(payload.get("eventId") or f"{payload.get('equipmentId')}:{timestamp}:quality"),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(timestamp),
        good_count=int(payload["goodCount"]),
        reject_count=int(payload.get("rejectCount") or 0),
        total_count=payload.get("totalCount"),
        rework_count=int(payload.get("reworkCount") or 0),
    )


def to_counter_event(payload: dict[str, Any]) -> CounterEvent:
    timestamp = str(payload["timestamp"])
    return CounterEvent(
        event_id=str(payload.get("eventId") or f"{payload.get('equipmentId')}:{timestamp}:counter"),
        equipment_id=str(payload["equipmentId"]),
        timestamp=_parse_time(timestamp),
        total_count=int(payload["totalCount"]),
        good_count=int(payload["goodCount"]),
        reject_count=int(payload.get("rejectCount") or 0),
    )


def to_context(payload: dict[str, Any]) -> ProductionContext:
    downtime = []
    for item in payload.get("plannedDowntime") or []:
        downtime.append(
            PlannedDowntime(
                start=_parse_time(item["start"]),
                end=_parse_time(item["end"]),
                kind=item.get("kind") or item.get("type"),
                downtime_type=item.get("type") or item.get("kind"),
            )
        )
    equipment = str(payload["equipmentId"])
    timestamp = _optional_time(payload.get("timestamp")) or _optional_time(
        payload.get("plannedStart")
    ) or now_utc()
    cycle = payload.get("idealCycleTimeSeconds")
    if cycle is None:
        cycle = payload.get("idealCycleSeconds")
    return ProductionContext(
        context_id=str(payload.get("contextId") or f"ctx:{equipment}:{to_iso(timestamp)}"),
        equipment_id=equipment,
        planned_start=_optional_time(payload.get("plannedStart")),
        planned_end=_optional_time(payload.get("plannedEnd")),
        ideal_cycle_time_seconds=float(cycle) if cycle is not None else None,
        timestamp=timestamp,
        order_id=payload.get("orderId"),
        material_id=payload.get("materialId"),
        product_id=payload.get("productId") or payload.get("materialId"),
        target_quantity=payload.get("targetQuantity"),
        site=payload.get("site"),
        area=payload.get("area"),
        line=payload.get("line"),
        shift_id=payload.get("shiftId"),
        batch_id=payload.get("batchId"),
        recipe_id=payload.get("recipeId"),
        planned_downtime=tuple(downtime),
    )


def classify_event(payload: dict[str, Any]) -> str | None:
    if "state" in payload:
        return "state"
    if "totalCount" in payload and "goodCount" in payload and "rejectCount" in payload:
        return "counter"
    if "goodCount" in payload or "rejectCount" in payload:
        return "quality"
    if "totalCount" in payload:
        return "production"
    if "contextId" in payload or "idealCycleTimeSeconds" in payload or "idealCycleSeconds" in payload:
        return "context"
    if "plannedDowntime" in payload:
        return "context"
    return None
