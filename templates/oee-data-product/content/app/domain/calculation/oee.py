from __future__ import annotations

from decimal import Decimal


def oee(
    availability: Decimal | None,
    performance: Decimal | None,
    quality: Decimal | None,
) -> Decimal | None:
    """Availability × Performance × Quality. Any missing component yields null."""
    if availability is None or performance is None or quality is None:
        return None
    return availability * performance * quality
