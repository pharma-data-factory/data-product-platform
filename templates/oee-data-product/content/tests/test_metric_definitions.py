"""URS-EPM-005: each metric records the definition and version it was computed under.

The OEE metrics (availability, performance, quality, OEE) are defined by the
versioned oee-result contract. Every result names that contract and version,
so a figure from today stays comparable with one from a later definition.
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.contract import contract_file
from tests.test_api import _load_perfect

# The URS requirements these tests verify (NXD-122).
pytestmark = pytest.mark.urs("URS-EPM-005")

METRICS = ("availability", "performance", "quality", "oee")


def test_every_result_names_the_versioned_definition_of_its_metrics(
    client: TestClient,
) -> None:
    _load_perfect(client)
    body = client.get(
        "/api/v1/oee/filler-01",
        params={
            "window": "custom",
            "from": "2026-08-20T08:00:00Z",
            "to": "2026-08-20T09:00:00Z",
        },
    ).json()

    assert body["contract"]["name"] == "oee-result"
    definition = json.loads(
        contract_file(f"{body['contract']['name']}.schema.json").read_text(
            encoding="utf-8"
        )
    )
    assert body["contract"]["version"] == definition["version"]
    for metric in METRICS:
        assert metric in body
        assert metric in definition["properties"], metric
