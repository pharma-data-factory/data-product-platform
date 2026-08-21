from app.domain import calculate_oee
from app.domain.models import CalculationStatus, OeeInputs
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
        "window_kind": "custom",
        "calculated_at": CALCULATED_AT,
        "context": context(),
    }
    base.update(overrides)
    return OeeInputs(**base)


def test_scenario_a_perfect() -> None:
    result = calculate_oee(
        _inputs(
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
    assert result.performance == 1.0
    assert result.quality == 1.0
    assert result.oee == 1.0
    assert result.calculation_status == CalculationStatus.VALID
    assert result.runtime_seconds == 3600


def test_scenario_b_downtime() -> None:
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
    assert result.runtime_seconds == 3300
    assert result.downtime_seconds == 300
    assert result.availability == 0.9167
    assert result.performance == 1.0
    assert result.quality == 1.0
    assert result.oee == 0.9167
    assert result.calculation_status == CalculationStatus.VALID


def test_scenario_c_slow() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 1800, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 1800, 0, "q1"),
            ],
        )
    )
    assert result.availability == 1.0
    assert result.performance == 0.5
    assert result.quality == 1.0
    assert result.oee == 0.5


def test_scenario_d_quality() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 3600, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 3240, 360, "q1"),
            ],
        )
    )
    assert result.availability == 1.0
    assert result.performance == 1.0
    assert result.quality == 0.9
    assert result.oee == 0.9


def test_scenario_e_mixed() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START), stopped(ts(55), "stop")],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 1650, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 1485, 165, "q1"),
            ],
        )
    )
    assert result.availability == 0.9167
    assert result.performance == 0.5
    assert result.quality == 0.9
    assert result.oee == 0.4125
    assert result.calculation_status == CalculationStatus.VALID
