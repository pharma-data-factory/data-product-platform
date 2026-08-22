from datetime import datetime

from app.contract import contract_file
from app.domain import calculate_oee
from app.domain.models import (
    CalculationStatus,
    MachineStateEvent,
    OeeInputs,
    PlannedDowntime,
    ProductionContext,
)
from dataprod.contracts import load_json_schema, validate_against_schema
from tests.fixtures import (
    CALCULATED_AT,
    EQUIPMENT,
    WINDOW_END,
    WINDOW_START,
    context,
    production,
    quality,
    running,
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


def _state(at: datetime, state: str, event_id: str, reason_code: str | None = None) -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state=state,  # type: ignore[arg-type]
        reason=reason_code,
        reason_code=reason_code,
    )


def test_running_stopped_idle_maintenance() -> None:
    for state in ("RUNNING", "STOPPED", "IDLE", "MAINTENANCE"):
        result = calculate_oee(
            _inputs(
                states=[_state(WINDOW_START, state, f"s-{state}")],
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
        if state == "RUNNING":
            assert result.runtime_seconds == 3600
            assert result.availability == 1.0
            assert result.oee is not None
        elif state == "MAINTENANCE":
            assert result.runtime_seconds == 0
            assert result.downtime_seconds == 0
            assert result.planned_production_seconds == 0
            assert result.availability is None
        else:
            assert result.runtime_seconds == 0
            assert result.availability == 0.0
            assert result.planned_production_seconds == 3600


def test_reason_code_does_not_change_oee() -> None:
    shared = {
        "production_counts": [
            production(WINDOW_START, 0, "p0"),
            production(ts(59, 59), 3300, "p1"),
        ],
        "quality_counts": [
            quality(WINDOW_START, 0, 0, "q0"),
            quality(ts(59, 59), 3300, 0, "q1"),
        ],
    }
    left = calculate_oee(
        _inputs(
            **shared,
            states=[
                running(WINDOW_START),
                _state(ts(55), "STOPPED", "stop", "MATERIAL_MISSING"),
            ],
        )
    )
    right = calculate_oee(
        _inputs(
            **shared,
            states=[
                running(WINDOW_START),
                _state(ts(55), "STOPPED", "stop", "JAM"),
            ],
        )
    )
    assert left.availability == right.availability
    assert left.performance == right.performance
    assert left.quality == right.quality
    assert left.oee == right.oee


def test_planned_downtime_reduces_planned_production_time() -> None:
    ctx = context()
    assert ctx is not None
    with_downtime = ProductionContext(
        context_id=ctx.context_id,
        equipment_id=ctx.equipment_id,
        timestamp=ctx.timestamp,
        planned_start=ctx.planned_start,
        planned_end=ctx.planned_end,
        ideal_cycle_time_seconds=ctx.ideal_cycle_time_seconds,
        order_id=ctx.order_id,
        planned_downtime=(
            PlannedDowntime(
                start=ts(30),
                end=ts(45),
                downtime_type="CHANGEOVER",
            ),
        ),
    )
    baseline = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 2700, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 2700, 0, "q1"),
            ],
        )
    )
    reduced = calculate_oee(
        _inputs(
            context=with_downtime,
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 2700, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 2700, 0, "q1"),
            ],
        )
    )
    assert baseline.planned_production_seconds == 3600
    assert reduced.planned_production_seconds == 2700
    assert reduced.planned_production_seconds < baseline.planned_production_seconds


def test_unobserved_time_is_not_stopped() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(ts(10))],
            production_counts=[
                production(ts(10), 0, "p0"),
                production(ts(59, 59), 3000, "p1"),
            ],
            quality_counts=[
                quality(ts(10), 0, 0, "q0"),
                quality(ts(59, 59), 3000, 0, "q1"),
            ],
        )
    )
    assert result.planned_production_seconds == 3000
    assert result.runtime_seconds == 3000
    assert result.downtime_seconds == 0
    assert result.availability == 1.0


def test_performance_not_capped() -> None:
    result = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[
                production(WINDOW_START, 0, "p0"),
                production(ts(59, 59), 7200, "p1"),
            ],
            quality_counts=[
                quality(WINDOW_START, 0, 0, "q0"),
                quality(ts(59, 59), 7200, 0, "q1"),
            ],
        )
    )
    assert result.performance == 2.0
    assert result.performance is not None and result.performance > 1.0
    assert result.oee == 2.0
    assert result.calculation_status == CalculationStatus.COMPLETE


def test_missing_inputs_are_explicit() -> None:
    missing_state = calculate_oee(_inputs(states=[], production_counts=[], quality_counts=[]))
    assert missing_state.oee is None
    assert missing_state.calculation_status == CalculationStatus.MISSING_MACHINE_STATE

    missing_cycle = calculate_oee(
        _inputs(
            context=ProductionContext(
                context_id="ctx-1",
                equipment_id=EQUIPMENT,
                timestamp=WINDOW_START,
                planned_start=WINDOW_START,
                planned_end=WINDOW_END,
                ideal_cycle_time_seconds=None,
            ),
            states=[running(WINDOW_START)],
            production_counts=[production(WINDOW_START, 0, "p0"), production(ts(59, 59), 100, "p1")],
            quality_counts=[quality(WINDOW_START, 0, 0, "q0"), quality(ts(59, 59), 100, 0, "q1")],
        )
    )
    assert missing_cycle.performance is None
    assert missing_cycle.oee is None
    assert missing_cycle.calculation_status == CalculationStatus.MISSING_IDEAL_CYCLE

    missing_quality = calculate_oee(
        _inputs(
            states=[running(WINDOW_START)],
            production_counts=[production(WINDOW_START, 0, "p0"), production(ts(59, 59), 100, "p1")],
            quality_counts=[],
        )
    )
    assert missing_quality.quality is None
    assert missing_quality.oee is None
    assert missing_quality.calculation_status == CalculationStatus.MISSING_QUALITY_DATA


def test_oee_result_contract() -> None:
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
    payload = result.as_payload()
    validate_against_schema(payload, load_json_schema(contract_file("oee-result.schema.json")))
    assert payload["window"]["type"] == "CUSTOM"
    assert payload["calculationStatus"] == "COMPLETE"
    assert "mtbfSeconds" not in payload
    assert "mttrSeconds" not in payload


def test_capabilities_registry_lifecycle() -> None:
    from pathlib import Path

    from app.capabilities import CAPABILITIES

    text = (Path(__file__).resolve().parents[1] / "capabilities.yaml").read_text(encoding="utf-8")
    assert 'status: included' in text
    assert 'status: foundation' in text
    assert 'status: planned' in text
    assert "microstops" in CAPABILITIES["capabilities"]
    assert CAPABILITIES["capabilities"]["microstops"]["status"] == "planned"
    assert CAPABILITIES["capabilities"]["quality-loss"]["status"] == "included"
    assert CAPABILITIES["capabilities"]["reason-codes"]["affectsCalculation"] is False
