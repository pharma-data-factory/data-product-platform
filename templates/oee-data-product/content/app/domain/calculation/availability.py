from __future__ import annotations

from decimal import Decimal


def availability(
    runtime_seconds: float | None,
    planned_production_seconds: float | None,
) -> Decimal | None:
    """runtime / planned production time. Never coerce missing or zero planned time."""
    if runtime_seconds is None or planned_production_seconds is None:
        return None
    if planned_production_seconds == 0:
        return None
    return Decimal(str(runtime_seconds)) / Decimal(str(planned_production_seconds))
