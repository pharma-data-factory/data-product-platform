SAMPLE_EVENT_ID = "11111111-1111-4111-8111-111111111111"
SAMPLE_TIMESTAMP = "2026-08-20T12:00:00Z"


def sample_event(**overrides):
    body = {
        "eventId": SAMPLE_EVENT_ID,
        "timestamp": SAMPLE_TIMESTAMP,
        "source": {
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
        },
        "type": "machine-state",
        "contract": {"name": "machine-state-event", "version": "1.0.0"},
        "payload": {"state": "RUNNING", "reason": None},
    }
    body.update(overrides)
    return body
