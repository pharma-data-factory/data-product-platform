"""Publish demonstration UNS events. Requires the service or MQTT broker."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import httpx

SERVICE = "http://localhost:8080"
ROOT = "${{ values.rootNamespace }}"

EVENTS = [
    (
        f"{ROOT}/site-a/packaging/line-01/filler-01/production/cycle",
        "cycle",
        "production-cycle",
        {"cycleId": "c-100", "durationMs": 1250, "result": "good"},
        {
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
        },
    ),
    (
        f"{ROOT}/site-a/packaging/line-01/filler-01/production/state",
        "state",
        "machine-state",
        {"state": "running", "mode": "automatic"},
        {
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
        },
    ),
    (
        f"{ROOT}/site-b/cold-chain/chamber-07/sensor-07/temperature/value",
        "value",
        "temperature-value",
        {"value": 4.2, "unit": "C"},
        {
            "site": "site-b",
            "area": "cold-chain",
            "line": "chamber-07",
            "equipment": "sensor-07",
        },
    ),
    (
        f"{ROOT}/site-a/packaging/line-01/filler-01/equipment/status",
        "status",
        "equipment-status",
        {"status": "ok", "alarm": False},
        {
            "site": "site-a",
            "area": "packaging",
            "line": "line-01",
            "equipment": "filler-01",
        },
    ),
]


def envelope(event_type: str, contract: str, payload: dict, source: dict) -> dict:
    return {
        "eventId": str(uuid4()),
        "timestamp": datetime.now(tz=UTC).isoformat(),
        "source": source,
        "type": event_type,
        "contract": {"name": contract, "version": "1.0.0"},
        "payload": payload,
    }


def main() -> None:
    for topic, event_type, contract, payload, source in EVENTS:
        body = {"topic": topic, "event": envelope(event_type, contract, payload, source)}
        response = httpx.post(f"{SERVICE}/api/v1/events", json=body, timeout=10.0)
        print(topic, response.status_code, json.dumps(response.json())[:180])


if __name__ == "__main__":
    main()
