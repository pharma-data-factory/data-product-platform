from __future__ import annotations

from datetime import datetime

from app.domain.models import MachineState, MachineStateEvent
from app.domain.windows import ensure_utc

Interval = tuple[datetime, datetime, MachineState]


def first_accepted_by_event_id(events: list[MachineStateEvent]) -> list[MachineStateEvent]:
    seen: set[str] = set()
    unique: list[MachineStateEvent] = []
    for event in events:
        if event.event_id in seen:
            continue
        seen.add(event.event_id)
        unique.append(event)
    return unique


def _state_at_same_timestamp(events: list[MachineStateEvent]) -> list[MachineStateEvent]:
    by_ts: dict[datetime, MachineStateEvent] = {}
    for event in sorted(events, key=lambda item: (item.timestamp, item.event_id)):
        current = by_ts.get(event.timestamp)
        if current is None or event.event_id > current.event_id:
            by_ts[event.timestamp] = event
    return sorted(by_ts.values(), key=lambda item: (item.timestamp, item.event_id))


def union_intervals(intervals: list[tuple[datetime, datetime]]) -> list[tuple[datetime, datetime]]:
    ordered = sorted((start, end) for start, end in intervals if end > start)
    if not ordered:
        return []
    merged = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def overlap_seconds(
    start: datetime,
    end: datetime,
    excluded: list[tuple[datetime, datetime]],
) -> float:
    if end <= start:
        return 0.0
    total = (end - start).total_seconds()
    removed = 0.0
    for ex_start, ex_end in union_intervals(excluded):
        left = max(start, ex_start)
        right = min(end, ex_end)
        if right > left:
            removed += (right - left).total_seconds()
    return max(total - removed, 0.0)


def build_timeline(
    events: list[MachineStateEvent],
    window_start: datetime,
    window_end: datetime,
) -> tuple[list[Interval], float]:
    """Return clipped (start, end, state) intervals and unobserved seconds."""
    window_start = ensure_utc(window_start)
    window_end = ensure_utc(window_end)
    unique = _state_at_same_timestamp(first_accepted_by_event_id(events))
    unique = [item for item in unique if item.timestamp <= window_end]
    if not unique:
        return [], (window_end - window_start).total_seconds()

    before = [item for item in unique if item.timestamp <= window_start]
    inside = [item for item in unique if window_start < item.timestamp < window_end]
    ordered = ([before[-1]] if before else []) + inside

    unobserved = 0.0
    if not before:
        first_ts = ordered[0].timestamp if ordered else window_end
        unobserved = max((min(first_ts, window_end) - window_start).total_seconds(), 0.0)

    intervals: list[Interval] = []
    for index, event in enumerate(ordered):
        start = max(window_start, event.timestamp)
        if index + 1 < len(ordered):
            end = ordered[index + 1].timestamp
        else:
            end = window_end
        if end > start:
            intervals.append((start, end, event.state))
    return intervals, unobserved
