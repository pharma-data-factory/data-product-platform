from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import paho.mqtt.client as mqtt

from app.config import Settings
from app.registry import ContractRegistry
from app.store import EventStore
from app.validation import EventValidationError, validate_inbound_event

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ["site", "area", "line", "equipment", "domain", "event"]
ROOT_TOPIC = Settings().uns_root_topic
TOPIC = f"{ROOT_TOPIC}/site-a/packaging/line-01/filler-01/production/cycle"


def test_in_memory_publish_consume_round_trip():
    registry = ContractRegistry.load(ROOT / "contracts" / "registry.yaml", ROOT / "contracts")
    store = EventStore()
    payload = {
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
        "payload": {"cycleId": "c-9", "durationMs": 800, "result": "good"},
    }

    def consume(topic: str, raw: dict) -> None:
        canonical, event, contract = validate_inbound_event(
            topic=topic,
            raw=raw,
            root=ROOT_TOPIC,
            field_names=FIELDS,
            registry=registry,
        )
        store.insert(canonical, event, contract)

    consume(TOPIC, payload)
    assert store.accepted == 1
    assert store.topics_seen() == [TOPIC]
    _ = mqtt
    _ = Settings
    try:
        validate_inbound_event(
            topic=TOPIC,
            raw={**payload, "payload": {}},
            root=ROOT_TOPIC,
            field_names=FIELDS,
            registry=registry,
        )
        raise AssertionError("invalid payload should fail")
    except EventValidationError:
        store.reject()
    assert store.rejected == 1
