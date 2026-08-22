from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from app.domain.losses import CAPTURE_STATE_ALIASES
from app.domain.models import VALID_STATES
from app.domain.windows import ensure_utc


def _parse_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return ensure_utc(parsed)


def event_quality_failures(
    payload: dict[str, Any],
    *,
    calculated_at: datetime,
    expected_equipment_id: str | None = None,
) -> list[str]:
    """Return MANDATORY failure names. Empty means the event may be stored."""
    failures: list[str] = []
    timestamp = _parse_time(payload.get("timestamp") or payload.get("start"))
    if timestamp is None:
        failures.append("timestamp_valid")
    elif timestamp > ensure_utc(calculated_at) + timedelta(minutes=5):
        failures.append("future_timestamp")
    end_time = _parse_time(payload.get("end"))
    if end_time is not None and timestamp is not None and end_time <= timestamp:
        failures.append("timestamp_valid")
    raw_state = payload.get("state")
    state = CAPTURE_STATE_ALIASES.get(raw_state, raw_state) if isinstance(raw_state, str) else raw_state
    if "state" in payload and state not in VALID_STATES:
        failures.append("machine_state_valid")
    equipment_id = payload.get("equipmentId")
    envelope = None
    source = payload.get("source")
    if isinstance(source, dict):
        envelope = source.get("equipment")
    if envelope and equipment_id and envelope != equipment_id:
        failures.append("equipment_ids_align")
    if expected_equipment_id:
        identity = equipment_id or envelope
        if identity and identity != expected_equipment_id:
            failures.append("equipment_ids_align")
    for field in ("totalCount", "goodCount", "rejectCount", "reworkCount"):
        if field in payload:
            value = payload[field]
            if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                failures.append("counts_non_negative")
                break
    if ("goodCount" in payload) != ("rejectCount" in payload):
        failures.append("quality_counts_paired")
    total = payload.get("totalCount")
    if isinstance(total, int) and not isinstance(total, bool):
        good = payload.get("goodCount")
        reject = payload.get("rejectCount")
        if isinstance(good, int) and good > total:
            failures.append("good_count_lte_total")
        if isinstance(reject, int) and reject > total:
            failures.append("reject_count_lte_total")
    if payload.get("contextId") == "":
        failures.append("context_id_present")
    return failures


def context_quality_failures(payload: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if not payload.get("equipmentId") and not payload.get("contextId"):
        failures.append("context_id_present")
    if payload.get("plannedStart") or payload.get("plannedEnd"):
        start = _parse_time(payload.get("plannedStart"))
        end = _parse_time(payload.get("plannedEnd"))
        if start is None or end is None or end <= start:
            failures.append("planned_window_valid")
    cycle = payload.get("idealCycleTimeSeconds")
    if cycle is None:
        cycle = payload.get("idealCycleSeconds")
    if cycle is not None and (
        not isinstance(cycle, (int, float)) or isinstance(cycle, bool) or cycle <= 0
    ):
        failures.append("ideal_cycle_time")
    return failures


def window_is_valid(start: datetime | None, end: datetime | None) -> bool:
    if start is None or end is None:
        return False
    return ensure_utc(start) < ensure_utc(end)


def now_utc() -> datetime:
    return datetime.now(UTC)
