"""Emit deterministic OEE reference events. Not a plant simulator."""

from __future__ import annotations

import argparse
import json
from urllib.request import Request, urlopen

SCENARIOS = {
    "A": {
        "context": True,
        "states": [("s1", "2026-08-20T08:00:00Z", "RUNNING")],
        "counts": [(0, 0, 0), (3600, 3600, 0)],
    },
    "B": {
        "context": True,
        "states": [
            ("s1", "2026-08-20T08:00:00Z", "RUNNING"),
            ("s2", "2026-08-20T08:55:00Z", "STOPPED"),
        ],
        "counts": [(0, 0, 0), (3300, 3300, 0)],
    },
    "C": {
        "context": True,
        "states": [("s1", "2026-08-20T08:00:00Z", "RUNNING")],
        "counts": [(0, 0, 0), (1800, 1800, 0)],
    },
    "D": {
        "context": True,
        "states": [("s1", "2026-08-20T08:00:00Z", "RUNNING")],
        "counts": [(0, 0, 0), (3600, 3240, 360)],
    },
    "E": {
        "context": True,
        "states": [
            ("s1", "2026-08-20T08:00:00Z", "RUNNING"),
            ("s2", "2026-08-20T08:55:00Z", "STOPPED"),
        ],
        "counts": [(0, 0, 0), (1650, 1485, 165)],
    },
}

CONTEXT = {
    "contextId": "ctx-sim",
    "equipmentId": "filler-01",
    "plannedStart": "2026-08-20T08:00:00Z",
    "plannedEnd": "2026-08-20T09:00:00Z",
    "idealCycleTimeSeconds": 1.0,
    "timestamp": "2026-08-20T07:55:00Z",
}


def post(base: str, payload: dict) -> None:
    request = Request(
        f"{base}/api/v1/ingest",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request) as response:
        response.read()


def main() -> None:
    parser = argparse.ArgumentParser(description="OEE reference event simulator")
    parser.add_argument("--scenario", choices=sorted(SCENARIOS), default="A")
    parser.add_argument("--base-url", default="http://127.0.0.1:8080")
    args = parser.parse_args()
    spec = SCENARIOS[args.scenario]
    post(args.base_url, CONTEXT)
    for event_id, timestamp, state in spec["states"]:
        post(
            args.base_url,
            {
                "eventId": event_id,
                "equipmentId": "filler-01",
                "timestamp": timestamp,
                "state": state,
            },
        )
    stamps = ["2026-08-21T08:00:00Z", "2026-08-21T08:59:59Z"]
    for index, (total, good, reject) in enumerate(spec["counts"]):
        post(
            args.base_url,
            {
                "eventId": f"p{index}",
                "equipmentId": "filler-01",
                "timestamp": stamps[index],
                "totalCount": total,
            },
        )
        post(
            args.base_url,
            {
                "eventId": f"q{index}",
                "equipmentId": "filler-01",
                "timestamp": stamps[index],
                "goodCount": good,
                "rejectCount": reject,
            },
        )
    print(f"emitted scenario {args.scenario} to {args.base_url}")


if __name__ == "__main__":
    main()
