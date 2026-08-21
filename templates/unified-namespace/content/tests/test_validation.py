from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest

from app.config import Settings
from app.registry import ContractRegistry
from app.store import EventStore
from app.validation import EventValidationError, validate_inbound_event

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ["site", "area", "line", "equipment", "domain", "event"]
ROOT_TOPIC = Settings().uns_root_topic
TOPIC = f"{ROOT_TOPIC}/site-a/packaging/line-01/filler-01/production/cycle"


def registry() -> ContractRegistry:
    return ContractRegistry.load(ROOT / "contracts" / "registry.yaml", ROOT / "contracts")


def event_doc(**overrides):
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
        "payload": {"cycleId": "c-1", "durationMs": 900, "result": "good"},
    }
    body.update(overrides)
    return body


def test_accepts_registered_contract_and_schema():
    topic, event, contract = validate_inbound_event(
        topic=TOPIC,
        raw=event_doc(),
        root=ROOT_TOPIC,
        field_names=FIELDS,
        registry=registry(),
    )
    assert topic == TOPIC
    assert contract.contract == "production-cycle"
    assert event.payload["result"] == "good"


def test_rejects_unknown_topic():
    with pytest.raises(EventValidationError, match="No topic contract"):
        validate_inbound_event(
            topic=f"{ROOT_TOPIC}/site-a/packaging/line-01/filler-01/unknown/event",
            raw=event_doc(),
            root=ROOT_TOPIC,
            field_names=FIELDS,
            registry=registry(),
        )


def test_rejects_payload_schema_failure():
    with pytest.raises(EventValidationError):
        validate_inbound_event(
            topic=TOPIC,
            raw=event_doc(payload={"cycleId": "c-1"}),
            root=ROOT_TOPIC,
            field_names=FIELDS,
            registry=registry(),
        )


def test_rejects_source_topic_mismatch():
    with pytest.raises(EventValidationError, match="source.site"):
        validate_inbound_event(
            topic=TOPIC,
            raw=event_doc(source={
                "site": "other-site",
                "area": "packaging",
                "line": "line-01",
                "equipment": "filler-01",
            }),
            root=ROOT_TOPIC,
            field_names=FIELDS,
            registry=registry(),
        )


def test_duplicate_event_id_is_not_stored_twice():
    store = EventStore()
    topic, event, contract = validate_inbound_event(
        topic=TOPIC,
        raw=event_doc(eventId="11111111-1111-4111-8111-111111111111"),
        root=ROOT_TOPIC,
        field_names=FIELDS,
        registry=registry(),
    )
    first, created = store.insert(topic, event, contract)
    second, created_again = store.insert(topic, event, contract)
    assert created is True
    assert created_again is False
    assert first.event.eventId == second.event.eventId
    assert store.duplicates == 1
    assert store.accepted == 1
