from __future__ import annotations

from typing import Any

from app.contract import contract_file
from app.domain.quality import context_quality_failures, event_quality_failures, now_utc
from dataprod.contracts import load_json_schema, payload_matches_schema
from dataprod.quality import QualityReport, quality_report, run_check


def evaluate(
    payloads: list[dict[str, Any]],
    contract_version: str,
    *,
    last_reconciliation: str | None = None,
) -> QualityReport:
    state_schema = load_json_schema(contract_file("machine-state-event.schema.json"))
    count_schema = load_json_schema(contract_file("production-count-event.schema.json"))
    quality_schema = load_json_schema(contract_file("quality-count-event.schema.json"))
    context_schema = load_json_schema(contract_file("production-context.schema.json"))
    events = [item for item in payloads if item.get("kind") != "context"]
    contexts = [item for item in payloads if item.get("kind") == "context"]
    calculated_at = now_utc()

    def without_kind(item: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in item.items() if key != "kind"}

    checks = [
        run_check(
            "machine_state_valid",
            [item for item in events if "state" in item],
            lambda item: item.get("state") in {"RUNNING", "STOPPED", "IDLE", "MAINTENANCE"},
            "state must be RUNNING, STOPPED, IDLE, or MAINTENANCE",
        ),
        run_check(
            "timestamp_valid",
            events,
            lambda item: "timestamp_valid" not in event_quality_failures(item, calculated_at=calculated_at),
            "timestamp must be timezone-aware ISO-8601",
        ),
        run_check(
            "counts_non_negative",
            [item for item in events if "totalCount" in item or "goodCount" in item],
            lambda item: "counts_non_negative" not in event_quality_failures(item, calculated_at=calculated_at),
            "counts must be non-negative integers",
        ),
        run_check(
            "ideal_cycle_time",
            contexts,
            lambda item: "ideal_cycle_time" not in context_quality_failures(item),
            "idealCycleTimeSeconds must be > 0",
            mandatory=True,
        ),
        run_check(
            "window_bounds",
            contexts,
            lambda item: "planned_window_valid" not in context_quality_failures(item),
            "plannedEnd must be after plannedStart",
        ),
        run_check(
            "production_count_schema",
            [item for item in events if item.get("kind") == "production"],
            lambda item: payload_matches_schema(without_kind(item), count_schema),
            "payload must match production-count-event 1.0.0",
        ),
        run_check(
            "quality_count_schema",
            [item for item in events if item.get("kind") == "quality"],
            lambda item: payload_matches_schema(without_kind(item), quality_schema),
            "payload must match quality-count-event 1.0.0",
        ),
        run_check(
            "context_schema",
            contexts,
            lambda item: payload_matches_schema(without_kind(item), context_schema)
            if "contextId" in item
            else True,
            "payload must match production-context 1.0.0",
        ),
        run_check(
            "counter_reset",
            events,
            lambda item: True,
            "counter reset is a warning; deltas still apply",
            mandatory=False,
        ),
        run_check(
            "machine_state_payload",
            [item for item in events if item.get("kind") == "state"],
            lambda item: payload_matches_schema(without_kind(item), state_schema),
            "payload must match machine-state-event 1.0.0",
        ),
        run_check(
            "production_context_present",
            contexts or [{}],
            lambda item: bool(item.get("contextId")),
            "production context must be present for Performance",
        ),
        run_check(
            "count_mismatch",
            [{"status": last_reconciliation or "ALIGNED"}],
            lambda item: item.get("status") != "COUNT_MISMATCH",
            "quality and production window counts should align",
            mandatory=False,
        ),
    ]
    return quality_report(checks, contract_version)
