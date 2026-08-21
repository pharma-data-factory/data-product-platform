import json
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.ingest import EventValidationError
from app.mqtt_ingest import MqttIngest
from app.store import MachineStateStore
from tests.sample_event import sample_event


def test_mqtt_ingest_uses_same_validation_as_rest(tmp_path) -> None:
    store = MachineStateStore(str(tmp_path / "machines.db"))
    store.initialize()
    ingest = MqttIngest(Settings(mqtt_host=""), store)
    record, outcome = ingest.ingest_payload(json.dumps(sample_event()))
    assert outcome == "created"
    assert record.state == "RUNNING"
    assert store.get_machine("filler-01") is not None


def test_mqtt_message_handler_persists_valid_event(tmp_path) -> None:
    store = MachineStateStore(str(tmp_path / "machines.db"))
    store.initialize()
    ingest = MqttIngest(Settings(mqtt_host=""), store)
    message = SimpleNamespace(
        payload=json.dumps(sample_event()).encode("utf-8"),
        topic="pharma/site-a/packaging/line-01/filler-01/machine/state",
    )
    ingest._handle_message(None, None, message)
    stored = store.get_machine("filler-01")
    assert stored is not None
    assert stored.state == "RUNNING"


def test_mqtt_message_handler_rejects_malformed_event(tmp_path) -> None:
    store = MachineStateStore(str(tmp_path / "machines.db"))
    store.initialize()
    ingest = MqttIngest(Settings(mqtt_host=""), store)
    message = SimpleNamespace(
        payload=b'{"eventId":"not-valid"}',
        topic="pharma/site-a/packaging/line-01/filler-01/machine/state",
    )
    ingest._handle_message(None, None, message)
    assert store.list_machines() == []
    with pytest.raises(EventValidationError):
        ingest.ingest_payload('{"eventId":"not-valid"}')


def test_mqtt_stays_disconnected_when_host_empty() -> None:
    ingest = MqttIngest(Settings(mqtt_host=""), MachineStateStore(":memory:"))
    ingest.start()
    assert ingest._client is None
    ingest.stop()
