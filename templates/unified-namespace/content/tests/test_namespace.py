from uuid import uuid4

import pytest

from app.namespace import NamespaceError, build_topic, parse_topic, validate_topic

FIELDS = ["site", "area", "line", "equipment", "domain", "event"]


def test_build_and_parse_round_trip():
    topic = build_topic(
        root="pharma",
        field_names=FIELDS,
        values={
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
            "domain": "oee",
            "event": "cycle",
        },
    )
    assert topic == "pharma/site-a/packaging/line-01/filler-01/oee/cycle"
    parsed = parse_topic(topic, root="pharma", field_names=FIELDS)
    assert parsed.fields["site"] == "site-a"
    assert parsed.fields["event"] == "cycle"


def test_rejects_hard_coded_case_and_empty_segments():
    with pytest.raises(NamespaceError):
        validate_topic("Pharma/Basel/packaging/line-01/filler-01/oee/cycle", root="pharma", field_names=FIELDS)
    with pytest.raises(NamespaceError):
        validate_topic("pharma//packaging/line-01/filler-01/oee/cycle", root="pharma", field_names=FIELDS)


def test_root_is_configurable():
    topic = build_topic(
        root="acme",
        field_names=FIELDS,
        values={
            "site": "plant-1",
            "area": "qc",
            "line": "line-02",
            "equipment": "sensor-1",
            "domain": "temperature",
            "event": "value",
        },
    )
    assert topic.startswith("acme/")
    assert "basel" not in topic
    assert "kaiseraugst" not in topic
    _ = uuid4()
