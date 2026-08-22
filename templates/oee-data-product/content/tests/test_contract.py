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
        "counter-event.schema.json",
        "loss-event.schema.json",
        "reason-code.schema.json",
    ):
        schema = load_json_schema(contract_file(name))
        assert schema["version"] == "1.0.0"


def test_valid_inputs_match_contracts() -> None:
    validate_against_schema(VALID_COUNT, load_json_schema(contract_file("production-count-event.schema.json")))
    validate_against_schema(VALID_QUALITY, load_json_schema(contract_file("quality-count-event.schema.json")))
    validate_against_schema(VALID_CONTEXT, load_json_schema(contract_file("production-context.schema.json")))
    validate_against_schema(
        {
            "equipmentId": "filler-01",
            "timestamp": "2026-08-21T10:14:23Z",
            "state": "STOPPED",
            "reasonCode": "MATERIAL_MISSING",
        },
        load_json_schema(contract_file("machine-state-event.schema.json")),
    )
    validate_against_schema(
        {
            "eventId": "c1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-21T10:15:00Z",
            "totalCount": 12034,
            "goodCount": 11991,
            "rejectCount": 43,
        },
        load_json_schema(contract_file("counter-event.schema.json")),
    )
    validate_against_schema(
        {
            "lossId": "loss:filler-01:2026-08-21T08:10:00Z:STOPPED",
            "equipmentId": "filler-01",
            "classification": "MICROSTOP",
            "start": "2026-08-21T08:10:00Z",
            "end": "2026-08-21T08:10:10Z",
            "durationSeconds": 10,
            "reasonCodeId": "UNKNOWN",
            "assignmentSource": "AUTOMATIC",
        },
        load_json_schema(contract_file("loss-event.schema.json")),
    )
    validate_against_schema(
        {
            "reasonCodeId": "JAM",
            "name": "Jam",
            "active": True,
            "parentReasonCodeId": "LABELER",
        },
        load_json_schema(contract_file("reason-code.schema.json")),
    )
