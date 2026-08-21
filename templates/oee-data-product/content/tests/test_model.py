from app.domain.models import VALID_STATES, CalculationStatus


def test_states_and_status_enums() -> None:
    assert VALID_STATES == {"RUNNING", "STOPPED", "IDLE", "MAINTENANCE"}
    assert CalculationStatus.VALID.value == "VALID"
    assert CalculationStatus.NO_PRODUCTION.value == "NO_PRODUCTION"
    assert CalculationStatus.INCOMPLETE.value == "INCOMPLETE"
