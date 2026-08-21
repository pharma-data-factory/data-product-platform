from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.envelope import UnsEvent


def valid_event(**overrides):
    body = {
        "eventId": str(uuid4()),
        "timestamp": datetime.now(tz=UTC).isoformat(),
        "source": {
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
        },
        "type": "cycle",
        "contract": {"name": "production-cycle", "version": "1.0.0"},
        "payload": {"cycleId": "c-1", "durationMs": 1200, "result": "good"},
    }
    body.update(overrides)
    return body


def test_accepts_required_envelope():
    event = UnsEvent.model_validate(valid_event())
    assert event.contract.name == "production-cycle"


def test_rejects_missing_event_id():
    body = valid_event()
    del body["eventId"]
    with pytest.raises(ValidationError):
        UnsEvent.model_validate(body)


def test_rejects_naive_timestamp():
    with pytest.raises(ValidationError):
        UnsEvent.model_validate(valid_event(timestamp="2026-08-20T10:00:00"))


def test_rejects_non_uuid_event_id():
    with pytest.raises(ValidationError):
        UnsEvent.model_validate(valid_event(eventId="not-a-uuid"))
