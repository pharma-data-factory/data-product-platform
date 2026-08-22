from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.domain.models import WINDOW_KIND_ALIASES, WindowKind


def parse_window_kind(value: str | None) -> WindowKind | None:
    if value is None:
        return None
    return WINDOW_KIND_ALIASES.get(value)  # type: ignore[return-value]


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def window_seconds(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds()


def to_iso(value: datetime) -> str:
    return ensure_utc(value).isoformat().replace("+00:00", "Z")


def default_window(
    kind: WindowKind,
    *,
    now: datetime,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    planned_start: datetime | None = None,
    planned_end: datetime | None = None,
) -> tuple[datetime, datetime] | None:
    now = ensure_utc(now)
    if from_time is not None and to_time is not None:
        start, end = ensure_utc(from_time), ensure_utc(to_time)
        if kind == "ORDER" and planned_start and planned_end:
            start = max(start, ensure_utc(planned_start))
            end = min(end, ensure_utc(planned_end))
        return start, end
    if kind == "SHIFT":
        return None
    if kind == "ORDER":
        if planned_start is None or planned_end is None:
            return None
        return ensure_utc(planned_start), ensure_utc(planned_end)
    if kind == "HOUR":
        start = now.replace(minute=0, second=0, microsecond=0)
        return start, start + timedelta(hours=1)
    return now - timedelta(hours=1), now
