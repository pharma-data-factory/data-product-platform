from app.domain.models import VALID_STATES, CalculationStatus


def test_states_and_status_enums() -> None:
    assert VALID_STATES == {"RUNNING", "STOPPED", "IDLE", "MAINTENANCE"}
    assert {item.value for item in CalculationStatus} == {
        "COMPLETE",
        "MISSING_PRODUCTION_CONTEXT",
        "MISSING_MACHINE_STATE",
        "MISSING_IDEAL_CYCLE",
        "MISSING_COUNTER_DATA",
        "MISSING_QUALITY_DATA",
        "INSUFFICIENT_OBSERVATION",
    }
