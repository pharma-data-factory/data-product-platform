from __future__ import annotations

from decimal import Decimal


def quality(good_count: int | None, total_count: int | None) -> Decimal | None:
    """good count / total count. Zero total and missing inputs stay explicit."""
    if good_count is None or total_count is None:
        return None
    if total_count == 0:
        return None
    return Decimal(good_count) / Decimal(total_count)
