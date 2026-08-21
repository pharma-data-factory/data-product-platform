import pytest
from pydantic import ValidationError

from app.models import TemperatureEvent

VALID = {
    "eventId": "evt-1",
    "deviceId": "probe-1",
    "timestamp": "2026-08-16T17:00:00Z",
    "temperature": 21.5,
    "unit": "C",
}


def test_valid_celsius_event() -> None:
    event = TemperatureEvent.model_validate(VALID)
    assert event.eventId == "evt-1"
    assert event.deviceId == "probe-1"
    assert event.temperature == 21.5
    assert event.unit == "C"


def test_valid_fahrenheit_event() -> None:
    event = TemperatureEvent.model_validate(
        {**VALID, "eventId": "evt-2", "deviceId": "probe-2", "unit": "F", "temperature": 70.0}
    )
    assert event.unit == "F"


@pytest.mark.parametrize(
    "payload",
    [
        {
            "deviceId": "probe-1",
            "timestamp": "2026-08-16T17:00:00Z",
            "temperature": 21.5,
            "unit": "C",
        },
        {
            "eventId": "",
            "deviceId": "probe-1",
            "timestamp": "2026-08-16T17:00:00Z",
            "temperature": 21.5,
            "unit": "C",
        },
        {
            "eventId": "evt-1",
            "timestamp": "2026-08-16T17:00:00Z",
            "temperature": 21.5,
            "unit": "C",
        },
        {
            "eventId": "evt-1",
            "deviceId": "probe-1",
            "temperature": 21.5,
            "unit": "C",
        },
        {
            "eventId": "evt-1",
            "deviceId": "probe-1",
            "timestamp": "2026-08-16T17:00:00Z",
            "temperature": "hot",
            "unit": "C",
        },
        {
            "eventId": "evt-1",
            "deviceId": "probe-1",
            "timestamp": "2026-08-16T17:00:00Z",
            "temperature": 21.5,
            "unit": "K",
        },
        {
            "eventId": "evt-1",
            "deviceId": "",
            "timestamp": "2026-08-16T17:00:00Z",
            "temperature": 21.5,
            "unit": "C",
        },
    ],
)
def test_invalid_events_are_rejected(payload: dict) -> None:
    with pytest.raises(ValidationError):
        TemperatureEvent.model_validate(payload)
