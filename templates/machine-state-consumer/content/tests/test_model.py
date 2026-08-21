from app.ingest import EventValidationError, validate_event
from app.models import UnsEvent
from tests.sample_event import sample_event


def test_uns_envelope_accepts_required_fields() -> None:
    event = UnsEvent.model_validate(sample_event())
    assert event.source.equipment == "filler-01"
    assert event.contract.name == "machine-state-event"


def test_validate_event_accepts_sample() -> None:
    event = validate_event(sample_event())
    assert event.payload["state"] == "RUNNING"


def test_missing_source_is_rejected() -> None:
    body = sample_event()
    del body["source"]
    try:
        validate_event(body)
        raise AssertionError("expected rejection")
    except EventValidationError:
        pass
