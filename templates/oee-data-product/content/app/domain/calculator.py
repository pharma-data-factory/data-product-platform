from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from app.domain.counters import cumulative_produced, first_accepted
from app.domain.models import (
    CalculationStatus,
    Completeness,
    OeeInputs,
    OeeResult,
    ReconciliationStatus,
)
from app.domain.rounding import publish_ratio
from app.domain.timeline import build_timeline, union_intervals
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
            status=CalculationStatus.INVALID_INPUT,
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

    intervals, unobserved = build_timeline(states, window_start, window_end)
    excluded = union_intervals(
        [
            *[(start, end) for start, end, state in intervals if state == "MAINTENANCE"],
            *[
                (ensure_utc(item.start), ensure_utc(item.end))
                for item in (inputs.context.planned_downtime if inputs.context else ())
            ],
        ]
    )
    if unobserved > 0:
        first_observed = intervals[0][0] if intervals else window_end
        excluded = union_intervals([*excluded, (window_start, first_observed)])

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
    good, _ = cumulative_produced(
        [(item.timestamp, item.good_count) for item in quality_events],
        window_start,
        window_end,
    )
    reject, _ = cumulative_produced(
        [(item.timestamp, item.reject_count) for item in quality_events],
        window_start,
        window_end,
    )

    has_production = bool(production)
    has_quality = bool(quality_events)
    if has_production and has_quality:
        total_count = total_from_production
        reconciliation = (
            ReconciliationStatus.ALIGNED
            if good + reject == total_count
            else ReconciliationStatus.COUNT_MISMATCH
        )
        quality_den = good + reject
    elif has_quality:
        total_count = good + reject
        reconciliation = ReconciliationStatus.ALIGNED
        quality_den = total_count
    elif has_production:
        total_count = total_from_production
        good, reject = 0, 0
        reconciliation = ReconciliationStatus.COUNTS_UNAVAILABLE
        quality_den = 0
    else:
        total_count = 0
        good, reject = 0, 0
        reconciliation = ReconciliationStatus.COUNTS_UNAVAILABLE
        quality_den = 0

    cycle = (
        Decimal(str(inputs.context.ideal_cycle_time_seconds))
        if inputs.context and inputs.context.ideal_cycle_time_seconds > 0
        else None
    )

    availability = _ratio(runtime, planned)
    performance: Decimal | None
    if cycle is None or runtime == 0:
        performance = None
    else:
        performance = (cycle * Decimal(total_count)) / Decimal(str(runtime))

    quality: Decimal | None
    if quality_den <= 0:
        quality = None
    else:
        quality = Decimal(good) / Decimal(quality_den)

    oee = _oee(availability, performance, quality, total_count, runtime, planned)

    completeness = Completeness.COMPLETE
    if not intervals:
        completeness = Completeness.INCOMPLETE
        availability = None
        oee = None
    elif unobserved > 0:
        completeness = Completeness.PARTIAL
    if cycle is None and performance is None and completeness == Completeness.COMPLETE and oee is None:
        completeness = Completeness.INCOMPLETE

    status = _status(
        window_end=window_end,
        calculated_at=calculated_at,
        planned=planned,
        total_count=total_count,
        oee=oee,
        completeness=completeness,
        availability=availability,
    )

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
        order_id=inputs.context.order_id if inputs.context else None,
        ideal_cycle_time_seconds=(
            inputs.context.ideal_cycle_time_seconds if inputs.context else None
        ),
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


def _ratio(numerator: float, denominator: float) -> Decimal | None:
    if denominator == 0:
        return None
    return Decimal(str(numerator)) / Decimal(str(denominator))


def _oee(
    availability: Decimal | None,
    performance: Decimal | None,
    quality: Decimal | None,
    total_count: int,
    runtime: float,
    planned: float,
) -> Decimal | None:
    if runtime > 0 and total_count == 0 and availability is not None:
        return Decimal(0)
    if runtime == 0 and total_count == 0 and planned > 0 and availability == 0:
        return Decimal(0)
    if availability is None or performance is None or quality is None:
        return None
    return availability * performance * quality


def _status(
    *,
    window_end: datetime,
    calculated_at: datetime,
    planned: float,
    total_count: int,
    oee: Decimal | None,
    completeness: Completeness,
    availability: Decimal | None,
) -> CalculationStatus:
    if window_end > calculated_at:
        return CalculationStatus.PENDING_LATE_DATA
    if planned > 0 and total_count == 0 and oee is not None:
        return CalculationStatus.NO_PRODUCTION
    if oee is None or completeness == Completeness.INCOMPLETE or availability is None:
        return CalculationStatus.INCOMPLETE
    return CalculationStatus.VALID


def _empty(
    inputs: OeeInputs,
    window_start: datetime,
    window_end: datetime,
    calculated_at: datetime,
    *,
    status: CalculationStatus,
) -> OeeResult:
    return OeeResult(
        equipment_id=inputs.equipment_id,
        window_kind=inputs.window_kind,
        window_start=window_start,
        window_end=window_end,
        availability=None,
        performance=None,
        quality=None,
        oee=None,
        total_count=0,
        good_count=0,
        reject_count=0,
        runtime_seconds=0,
        downtime_seconds=0,
        planned_production_seconds=0,
        completeness=Completeness.INCOMPLETE,
        calculation_status=status,
        reconciliation_status=ReconciliationStatus.COUNTS_UNAVAILABLE,
        calculated_at=calculated_at,
        order_id=inputs.context.order_id if inputs.context else None,
        ideal_cycle_time_seconds=None,
    )
