from app.contract import contract_file
from dataprod.contracts import load_json_schema, validate_against_schema

VALID_COUNT = {
    "eventId": "8c1e0b2a-4d3f-4a1e-9c0b-1f2e3d4c5b6a",
    "equipmentId": "filler-01",
    "timestamp": "2026-08-21T08:15:00Z",
    "totalCount": 1000,
}

VALID_QUALITY = {
    "eventId": "9d2f1c3b-5e40-4b2f-8d1c-2a3b4c5d6e7f",
    "equipmentId": "filler-01",
    "timestamp": "2026-08-21T08:15:00Z",
    "goodCount": 980,
    "rejectCount": 20,
}

VALID_CONTEXT = {
    "contextId": "ctx-1",
    "equipmentId": "filler-01",
    "plannedStart": "2026-08-21T08:00:00Z",
    "plannedEnd": "2026-08-21T09:00:00Z",
    "idealCycleTimeSeconds": 1.0,
    "timestamp": "2026-08-21T07:55:00Z",
}


def test_contract_versions_are_1_0_0() -> None:
    for name in (
        "production-context.schema.json",
        "production-count-event.schema.json",
        "quality-count-event.schema.json",
        "oee-result.schema.json",
        "machine-state-event.schema.json",
    ):
        schema = load_json_schema(contract_file(name))
        assert schema["version"] == "1.0.0"


def test_valid_inputs_match_contracts() -> None:
    validate_against_schema(VALID_COUNT, load_json_schema(contract_file("production-count-event.schema.json")))
    validate_against_schema(VALID_QUALITY, load_json_schema(contract_file("quality-count-event.schema.json")))
    validate_against_schema(VALID_CONTEXT, load_json_schema(contract_file("production-context.schema.json")))
    validate_against_schema({"state": "RUNNING", "reason": None}, load_json_schema(contract_file("machine-state-event.schema.json")))
