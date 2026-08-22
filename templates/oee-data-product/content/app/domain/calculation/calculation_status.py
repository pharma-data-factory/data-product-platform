from __future__ import annotations

from decimal import Decimal

from app.domain.models import CalculationStatus


def resolve_calculation_status(
    *,
    invalid_input: bool,
    window_open: bool = False,
    has_machine_state: bool,
    has_context: bool,
    has_ideal_cycle: bool,
    has_counter_data: bool,
    has_quality_data: bool,
    planned_production_seconds: float,
    total_count: int | None,
    availability: Decimal | None,
    oee: Decimal | None,
    quality: Decimal | None,
) -> CalculationStatus:
    """Map missing or invalid inputs to an explicit status. Never guess values."""
    del window_open, total_count
    if invalid_input:
        return CalculationStatus.INSUFFICIENT_OBSERVATION
    if not has_machine_state:
        return CalculationStatus.MISSING_MACHINE_STATE
    if planned_production_seconds == 0 and availability is None:
        return CalculationStatus.INSUFFICIENT_OBSERVATION
    if oee is not None:
        return CalculationStatus.COMPLETE
    if not has_context:
        return CalculationStatus.MISSING_PRODUCTION_CONTEXT
    if not has_ideal_cycle:
        return CalculationStatus.MISSING_IDEAL_CYCLE
    if not has_counter_data:
        return CalculationStatus.MISSING_COUNTER_DATA
    if not has_quality_data or quality is None:
        return CalculationStatus.MISSING_QUALITY_DATA
    return CalculationStatus.INSUFFICIENT_OBSERVATION
