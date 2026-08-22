from datetime import UTC, datetime

from app.domain import calculate_oee
from app.domain.models import CalculationStatus, OeeInputs
from app.domain.quality import event_quality_failures
from tests.fixtures import (
    CALCULATED_AT,
    EQUIPMENT,
    WINDOW_END,
    WINDOW_START,
    context,
    production,
    quality,
    running,
    stopped,
    ts,
)


def _inputs(**overrides) -> OeeInputs:
    base = {
        "equipment_id": EQUIPMENT,
        "window_start": WINDOW_START,
        "window_end": WINDOW_END,
        "window_kind": "CUSTOM",
        "calculated_at": CALCULATED_AT,
        "context": context(),
    }
    base.update(overrides)
    return OeeInputs(**base)


def test_zero_production() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[production(WINDOW_START, 0, "p0")],
            quality_counts=[quality(WINDOW_START, 0, 0, "q0")],
        )
    )
    assert result.availability == 1.0
    assert result.performance == 0.0
    assert result.quality is None
    assert result.oee is None
    assert result.calculation_status == CalculationStatus.MISSING_QUALITY_DATA


def test_hundred_percent_reject() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 3600, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 0, 3600, "q1"),
            ],
        )
    )
    assert result.quality == 0.0
    assert result.oee == 0.0
    assert result.calculation_status == CalculationStatus.COMPLETE


def test_late_event_uses_event_time() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START), stopped(ts(55), "stop")],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 3300, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 3300, 0, "q1"),
            ],
        )
    )
    assert result.availability == 0.9167
    assert result.oee == 0.9167


def test_out_of_order_state_events() -> None:
    result = calculate_oee(
        _inputs(
            states=[stopped(ts(55), "stop"), running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 3300, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 3300, 0, "q1"),
            ],
        )
    )
    assert result.runtime_seconds == 3300
    assert result.availability == 0.9167


def test_duplicate_event_id_first_wins() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 3600, "p1"),
                production(ts(59, 59), 9999, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 3600, 0, "q1"),
            ],
        )
    )
    assert result.total_count == 3600
    assert result.oee == 1.0


def test_counter_reset() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 9000, "p0"),
                production(ts(10), 9100, "p1"),
                production(ts(20), 50, "p2"),
                production(ts(59, 59), 150, "p3"),
            ],
            quality_counts=[
                quality(WINDOW_START, 9000, 0, "q0"),
                quality(ts(10), 9100, 0, "q1"),
                quality(ts(20), 50, 0, "q2"),
                quality(ts(59, 59), 150, 0, "q3"),
            ],
        )
    )
    assert result.total_count == 250
    assert result.availability == 1.0
    assert result.performance == 0.0694
    assert result.quality == 1.0
    assert result.oee == 0.0694


def test_missing_ideal_cycle() -> None:
    result = calculate_oee(
        _inputs(
            context=None,
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 3600, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 3600, 0, "q1"),
            ],
        )
    )
    assert result.availability == 1.0
    assert result.performance is None
    assert result.quality == 1.0
    assert result.oee is None
    assert result.calculation_status == CalculationStatus.MISSING_PRODUCTION_CONTEXT
    assert result.completeness.value == "COMPLETE"


def test_no_machine_states() -> None:
    result = calculate_oee(_inputs(states=[], production_counts=[], quality_counts=[]))
    assert result.availability is None
    assert result.oee is None
    assert result.calculation_status == CalculationStatus.MISSING_MACHINE_STATE


def test_invalid_window() -> None:
    result = calculate_oee(
        _inputs(window_start=WINDOW_END, window_end=WINDOW_START),
    )
    assert result.calculation_status == CalculationStatus.INSUFFICIENT_OBSERVATION
    assert result.oee is None


def test_pre_window_counts_are_baseline_only() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(ts(0, 0).replace(hour=7), 500, "p-before"),
                production(WINDOW_START, 800, "p0"),
                production(ts(59, 59), 1100, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 800, 0, "q0"),
                quality(ts(59, 59), 1100, 0, "q1"),
            ],
        )
    )
    assert result.total_count == 300
    assert result.oee is not None


def test_count_mismatch_does_not_rewrite() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 100, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 80, 30, "q1"),
            ],
        )
    )
    assert result.total_count == 100
    assert result.good_count == 80
    assert result.reject_count == 30
    assert result.reconciliation_status.value == "COUNT_MISMATCH"
    assert result.quality == 0.8


def test_open_window_is_not_a_special_status() -> None:
    result = calculate_oee(
        _inputs(
            calculated_at=datetime(2026, 8, 21, 8, 30, tzinfo=UTC),
            states=[running(WINDOW_START)],
            production_counts=[production(WINDOW_START, 0, "p0")],
        )
    )
    assert result.calculation_status == CalculationStatus.MISSING_QUALITY_DATA
    assert result.oee is None


def test_invalid_state_rejected() -> None:
    failures = event_quality_failures(
        {
            "eventId": "x",
            "equipmentId": EQUIPMENT,
            "timestamp": "2026-08-21T08:00:00Z",
            "state": "BROKEN",
        },
        calculated_at=CALCULATED_AT,
    )
    assert "machine_state_valid" in failures


def test_same_timestamp_greater_event_id_wins() -> None:
    result = calculate_oee(
        _inputs(
            states=[
                running(WINDOW_START, "a"),
                stopped(WINDOW_START, "z"),
            ],
            production_counts=[production(WINDOW_START, 0, "p0")],
        )
    )
    assert result.runtime_seconds == 0
    assert result.downtime_seconds == 3600
