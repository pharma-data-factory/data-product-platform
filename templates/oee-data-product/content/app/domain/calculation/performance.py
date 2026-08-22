from __future__ import annotations

from decimal import Decimal


def performance(
    ideal_cycle_seconds: float | None,
    total_count: int | None,
    runtime_seconds: float | None,
) -> Decimal | None:
    """(ideal cycle × total count) / runtime. Not capped at 1.0."""
    if ideal_cycle_seconds is None or total_count is None or runtime_seconds is None:
        return None
    if ideal_cycle_seconds <= 0 or runtime_seconds == 0:
        return None
    return (Decimal(str(ideal_cycle_seconds)) * Decimal(total_count)) / Decimal(
        str(runtime_seconds)
    )
