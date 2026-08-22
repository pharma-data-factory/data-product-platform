from __future__ import annotations

from datetime import datetime

from app.domain.calculation.availability import availability as availability_ratio
from app.domain.calculation.calculation_status import resolve_calculation_status
from app.domain.calculation.oee import oee as oee_product
from app.domain.calculation.performance import performance as performance_ratio
from app.domain.calculation.quality import quality as quality_ratio
from app.domain.counters import cumulative_produced, first_accepted
from app.domain.models import (
    CalculationStatus,
    Completeness,
    OeeInputs,
    OeeResult,
    ReconciliationStatus,
)
from app.domain.rounding import publish_ratio
from app.domain.timeline import build_timeline, union_intervals, unobserved_seconds
from app.domain.windows import ensure_utc, window_seconds


def calculate_oee(inputs: OeeInputs) -> OeeResult:
    window_start = ensure_utc(inputs.window_start)
    window_end = ensure_utc(inputs.window_end)
    calculated_at = ensure_utc(inputs.calculated_at)

    if inputs.invalid_input or window_end <= window_start:
        return _empty(
            inputs,
            window_start,
            window_end,
            calculated_at,
            status=CalculationStatus.INSUFFICIENT_OBSERVATION,
        )

    states = [item for item in inputs.states if item.equipment_id == inputs.equipment_id]
    production = first_accepted(
        [item for item in inputs.production_counts if item.equipment_id == inputs.equipment_id],
        lambda item: item.event_id,
    )
    production = sorted(production, key=lambda item: (item.timestamp, item.event_id))
    quality_events = first_accepted(
        [item for item in inputs.quality_counts if item.equipment_id == inputs.equipment_id],
        lambda item: item.event_id,
    )
    quality_events = sorted(quality_events, key=lambda item: (item.timestamp, item.event_id))

    intervals, unobserved_gaps = build_timeline(states, window_start, window_end)
    unobserved = unobserved_seconds(unobserved_gaps)
    excluded = union_intervals(
        [
            *[(start, end) for start, end, state in intervals if state == "MAINTENANCE"],
            *[
                (ensure_utc(item.start), ensure_utc(item.end))
                for item in (inputs.context.planned_downtime if inputs.context else ())
            ],
            *unobserved_gaps,
        ]
    )

    planned = _duration(window_start, window_end, excluded)
    runtime = 0.0
    downtime = 0.0
    for start, end, state in intervals:
        seconds = _duration(start, end, excluded)
        if state == "RUNNING":
            runtime += seconds
        elif state in {"STOPPED", "IDLE"}:
            downtime += seconds

    total_from_production, _ = cumulative_produced(
        [(item.timestamp, item.total_count) for item in production],
        window_start,
        window_end,
    )
    good_delta, _ = cumulative_produced(
        [(item.timestamp, item.good_count) for item in quality_events],
        window_start,
        window_end,
    )
    reject_delta, _ = cumulative_produced(
        [(item.timestamp, item.reject_count) for item in quality_events],
        window_start,
        window_end,
    )

    has_production = bool(production)
    has_quality = bool(quality_events)
    total_count: int | None
    if has_production:
        total_count = total_from_production
    elif has_quality:
        total_count = good_delta + reject_delta
    else:
        total_count = None

    good: int | None
    reject: int | None
    if has_quality:
        good = good_delta
        reject = reject_delta
        if has_production and good_delta + reject_delta == total_from_production:
            reconciliation = ReconciliationStatus.ALIGNED
        elif has_production:
            reconciliation = ReconciliationStatus.COUNT_MISMATCH
        else:
            reconciliation = ReconciliationStatus.ALIGNED
    else:
        good = None
        reject = None
        reconciliation = ReconciliationStatus.COUNTS_UNAVAILABLE

    cycle = (
        float(inputs.context.ideal_cycle_time_seconds)
        if inputs.context
        and inputs.context.ideal_cycle_time_seconds is not None
        and inputs.context.ideal_cycle_time_seconds > 0
        else None
    )

    availability = availability_ratio(runtime, planned)
    performance = performance_ratio(cycle, total_count, runtime)
    quality = quality_ratio(good, total_count)
    oee = oee_product(availability, performance, quality)

    completeness = Completeness.COMPLETE
    if not intervals:
        completeness = Completeness.INCOMPLETE
        availability = None
        oee = None
    elif unobserved > 0:
        completeness = Completeness.PARTIAL

    status = resolve_calculation_status(
        invalid_input=False,
        has_machine_state=bool(intervals),
        has_context=inputs.context is not None,
        has_ideal_cycle=cycle is not None,
        has_counter_data=has_production or (has_quality and total_count is not None),
        has_quality_data=has_quality,
        planned_production_seconds=planned,
        total_count=total_count,
        availability=availability,
        oee=oee,
        quality=quality,
    )

    context = inputs.context
    return OeeResult(
        equipment_id=inputs.equipment_id,
        window_kind=inputs.window_kind,
        window_start=window_start,
        window_end=window_end,
        availability=publish_ratio(availability),
        performance=publish_ratio(performance),
        quality=publish_ratio(quality),
        oee=publish_ratio(oee),
        total_count=total_count,
        good_count=good,
        reject_count=reject,
        runtime_seconds=runtime,
        downtime_seconds=downtime,
        planned_production_seconds=planned,
        completeness=completeness,
        calculation_status=status,
        reconciliation_status=reconciliation,
        calculated_at=calculated_at,
        order_id=context.order_id if context else None,
        ideal_cycle_time_seconds=cycle,
        site=context.site if context else None,
        area=context.area if context else None,
        line=context.line if context else None,
        batch_id=context.batch_id if context else None,
        product_id=(context.product_id or context.material_id) if context else None,
        shift_id=context.shift_id if context else None,
    )


def _duration(
    start: datetime,
    end: datetime,
    excluded: list[tuple[datetime, datetime]],
) -> float:
    if end <= start:
        return 0.0
    total = window_seconds(start, end)
    removed = 0.0
    for ex_start, ex_end in excluded:
        left = max(start, ex_start)
        right = min(end, ex_end)
        if right > left:
            removed += (right - left).total_seconds()
    return max(total - removed, 0.0)


def _empty(
    inputs: OeeInputs,
    window_start: datetime,
    window_end: datetime,
    calculated_at: datetime,
    *,
    status: CalculationStatus,
) -> OeeResult:

    context = inputs.context
    return OeeResult(
        equipment_id=inputs.equipment_id,
        window_kind=inputs.window_kind,
        window_start=window_start,
        window_end=window_end,
        availability=None,
        performance=None,
        quality=None,
        oee=None,
        total_count=None,
        good_count=None,
        reject_count=None,
        runtime_seconds=None,
        downtime_seconds=None,
        planned_production_seconds=None,
        completeness=Completeness.INCOMPLETE,
        calculation_status=status,
        reconciliation_status=ReconciliationStatus.COUNTS_UNAVAILABLE,
        calculated_at=calculated_at,
        order_id=context.order_id if context else None,
        ideal_cycle_time_seconds=None,
        site=context.site if context else None,
        area=context.area if context else None,
        line=context.line if context else None,
        batch_id=context.batch_id if context else None,
        product_id=(context.product_id or context.material_id) if context else None,
        shift_id=context.shift_id if context else None,
    )
