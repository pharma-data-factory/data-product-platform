"""Publish the deterministic sample event to the local consumer."""

import json

import httpx

EVENT = {
    "eventId": "11111111-1111-4111-8111-111111111111",
    "timestamp": "2026-08-20T12:00:00Z",
    "source": {
        "site": "site-a",
        "area": "packaging",
        "line": "line-01",
        "equipment": "filler-01",
    },
    "type": "machine-state",
    "contract": {"name": "machine-state-event", "version": "1.0.0"},
    "payload": {"state": "RUNNING", "reason": None},
}

response = httpx.post("http://localhost:8080/api/v1/events", json=EVENT, timeout=10.0)
print(response.status_code, json.dumps(response.json(), indent=2))
lookup = httpx.get("http://localhost:8080/api/v1/machines/filler-01", timeout=10.0)
print(lookup.status_code, json.dumps(lookup.json(), indent=2))
