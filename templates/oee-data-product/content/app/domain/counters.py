from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from typing import TypeVar

from app.domain.windows import ensure_utc

T = TypeVar("T")


def first_accepted(events: list[T], event_id: Callable[[T], str]) -> list[T]:  # noqa: UP047
    seen: set[str] = set()
    unique: list[T] = []
    for event in events:
        key = event_id(event)
        if key in seen:
            continue
        seen.add(key)
        unique.append(event)
    return unique


def cumulative_produced(
    readings: list[tuple[datetime, int]],
    window_start: datetime,
    window_end: datetime,
) -> tuple[int, bool]:
    """Window production from cumulative readings. Returns (produced, reset_detected).

    The last reading at or before windowStart is the baseline, not production.
    Pre-window deltas are discarded. A decrease is a reset: produced += current.
    """
    window_start = ensure_utc(window_start)
    window_end = ensure_utc(window_end)
    ordered = sorted(
        ((ensure_utc(ts), value) for ts, value in readings if ensure_utc(ts) < window_end),
        key=lambda item: item[0],
    )
    if not ordered:
        return 0, False
    baseline_candidates = [(ts, value) for ts, value in ordered if ts <= window_start]
    in_window = [(ts, value) for ts, value in ordered if window_start < ts < window_end]
    previous: int | None = baseline_candidates[-1][1] if baseline_candidates else None
    produced = 0
    reset = False
    for _ts, value in in_window:
        if previous is None:
            previous = value
            continue
        if value >= previous:
            produced += value - previous
        else:
            produced += value
            reset = True
        previous = value
    return produced, reset
