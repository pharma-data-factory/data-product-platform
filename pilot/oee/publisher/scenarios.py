"""Canonical OEE 1.0 machine events for the pilot publisher. No second event model."""

from __future__ import annotations

from typing import Any

EQUIPMENT = "filler-01"
WINDOW_FROM = "2026-08-20T08:00:00Z"
WINDOW_TO = "2026-08-20T09:00:00Z"
TOPIC_PREFIX = "pharma/oee/filler-01"

CONTEXT = {
    "contextId": "ctx-line-01-order-1001",
    "equipmentId": EQUIPMENT,
    "orderId": "1001",
    "materialId": "material-a",
    "plannedStart": WINDOW_FROM,
    "plannedEnd": WINDOW_TO,
    "idealCycleTimeSeconds": 1.0,
    "targetQuantity": 3600,
    "timestamp": "2026-08-20T07:55:00Z",
}


def state(event_id: str, timestamp: str, value: str) -> dict[str, Any]:
    return {
        "eventId": event_id,
        "equipmentId": EQUIPMENT,
        "timestamp": timestamp,
        "state": value,
    }


def production(event_id: str, timestamp: str, total: int) -> dict[str, Any]:
    return {
        "eventId": event_id,
        "equipmentId": EQUIPMENT,
        "timestamp": timestamp,
        "totalCount": total,
    }


def quality(event_id: str, timestamp: str, good: int, reject: int) -> dict[str, Any]:
    return {
        "eventId": event_id,
        "equipmentId": EQUIPMENT,
        "timestamp": timestamp,
        "goodCount": good,
        "rejectCount": reject,
    }


SCENARIOS: dict[str, dict[str, Any]] = {
    "PERFECT": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 3600)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3600, 0)],
        "expected": {
            "availability": 1.0,
            "performance": 1.0,
            "quality": 1.0,
            "oee": 1.0,
        },
    },
    "DOWNTIME": {
        "states": [
            state("s1", WINDOW_FROM, "RUNNING"),
            state("s2", "2026-08-20T08:55:00Z", "STOPPED"),
        ],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 3300)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3300, 0)],
        "expected": {"availability": 0.9167, "performance": 1.0, "quality": 1.0, "oee": 0.9167},
    },
    "SLOW": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 1800)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 1800, 0)],
        "expected": {"availability": 1.0, "performance": 0.5, "quality": 1.0, "oee": 0.5},
    },
    "QUALITY_LOSS": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 3600)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3240, 360)],
        "expected": {"availability": 1.0, "performance": 1.0, "quality": 0.9, "oee": 0.9},
    },
    "MIXED": {
        "states": [
            state("s1", WINDOW_FROM, "RUNNING"),
            state("s2", "2026-08-20T08:55:00Z", "STOPPED"),
        ],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 1650)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 1485, 165)],
        "expected": {
            "availability": 0.9167,
            "performance": 0.5,
            "quality": 0.9,
            "oee": 0.4125,
        },
    },
    "COUNTER_RESET": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [
            production("p0", WINDOW_FROM, 9000),
            production("p1", "2026-08-20T08:10:00Z", 9100),
            production("p2", "2026-08-20T08:20:00Z", 50),
            production("p3", "2026-08-20T08:59:59Z", 150),
        ],
        "quality": [
            quality("q0", WINDOW_FROM, 9000, 0),
            quality("q1", "2026-08-20T08:10:00Z", 9100, 0),
            quality("q2", "2026-08-20T08:20:00Z", 50, 0),
            quality("q3", "2026-08-20T08:59:59Z", 150, 0),
        ],
        "expected": {"totalCount": 250, "availability": 1.0, "oee": 0.0694},
    },
    "DUPLICATE_EVENT": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [
            production("p0", WINDOW_FROM, 0),
            production("p1", "2026-08-20T08:59:59Z", 3600),
            production("p1", "2026-08-20T08:59:59Z", 9999),
        ],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3600, 0)],
        "expected": {"totalCount": 3600, "oee": 1.0},
    },
    "LATE_EVENT": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 3300)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3300, 0)],
        "late": [state("s-late", "2026-08-20T08:55:00Z", "STOPPED")],
        "expected_before": {"availability": 1.0, "oee": 0.9167},
        "expected_after": {"availability": 0.9167, "oee": 0.9167},
    },
    "OUT_OF_ORDER": {
        "states": [
            state("s2", "2026-08-20T08:55:00Z", "STOPPED"),
            state("s1", WINDOW_FROM, "RUNNING"),
        ],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 3300)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3300, 0)],
        "expected": {"availability": 0.9167, "oee": 0.9167},
    },
    "INVALID_EVENT": {
        "states": [state("s1", WINDOW_FROM, "RUNNING")],
        "counts": [production("p0", WINDOW_FROM, 0), production("p1", "2026-08-20T08:59:59Z", 3600)],
        "quality": [quality("q0", WINDOW_FROM, 0, 0), quality("q1", "2026-08-20T08:59:59Z", 3600, 0)],
        "invalid": [
            state("bad-state", WINDOW_FROM, "BROKEN"),
            production("neg", "2026-08-20T08:10:00Z", -1),
            {
                "eventId": "bad-ts",
                "equipmentId": EQUIPMENT,
                "timestamp": "not-a-timestamp",
                "totalCount": 1,
            },
            {
                "eventId": "wrong-eq",
                "equipmentId": "other-line",
                "timestamp": WINDOW_FROM,
                "state": "RUNNING",
            },
        ],
        "expected": {"oee": 1.0},
    },
}


def iter_mqtt_messages(name: str) -> list[tuple[str, dict[str, Any]]]:
    scenario = SCENARIOS[name]
    messages: list[tuple[str, dict[str, Any]]] = []
    for item in scenario.get("states", []):
        messages.append((f"{TOPIC_PREFIX}/state", item))
    for item in scenario.get("counts", []):
        messages.append((f"{TOPIC_PREFIX}/count", item))
    for item in scenario.get("quality", []):
        messages.append((f"{TOPIC_PREFIX}/quality", item))
    for item in scenario.get("invalid", []):
        topic = f"{TOPIC_PREFIX}/state" if "state" in item else f"{TOPIC_PREFIX}/count"
        messages.append((topic, item))
    for item in scenario.get("late", []):
        messages.append((f"{TOPIC_PREFIX}/state", item))
    return messages
