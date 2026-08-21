from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

QUANT = Decimal("0.0001")


def publish_ratio(value: Decimal | float | None) -> float | None:
    """Round published A/P/Q/OEE to 4 decimal places, ROUND_HALF_UP."""
    if value is None:
        return None
    decimal_value = value if isinstance(value, Decimal) else Decimal(str(value))
    return float(decimal_value.quantize(QUANT, rounding=ROUND_HALF_UP))
