from __future__ import annotations

import json
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from helpers import DB_PATH, get_oee, rss_bytes
from scenarios import CONTEXT

PILOT_DIR = Path(__file__).resolve().parents[1]
VOLUME_EVENTS = 10_000
SOAK_HOURS = 8


def test_accelerated_soak_eight_hours_event_time(oee_client: TestClient) -> None:
    """Accelerated soak: 8 hours of event time, not 2 hours wall clock."""
    start = datetime(2026, 8, 19, 0, 0, tzinfo=UTC)
    published = 0
    for hour in range(SOAK_HOURS):
        window_start = start + timedelta(hours=hour)
        ts = window_start.isoformat().replace("+00:00", "Z")
        end_ts = (window_start + timedelta(hours=1) - timedelta(seconds=1)).isoformat().replace(
            "+00:00", "Z"
        )
        context = {
            **CONTEXT,
            "contextId": f"ctx-soak-{hour}",
            "plannedStart": ts,
            "plannedEnd": (window_start + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
            "timestamp": ts,
        }
        assert oee_client.post("/api/v1/ingest", json=context).status_code == 200
        for payload in (
            {
                "eventId": f"soak-s-{hour}",
                "equipmentId": "filler-01",
                "timestamp": ts,
                "state": "RUNNING",
            },
            {
                "eventId": f"soak-p0-{hour}",
                "equipmentId": "filler-01",
                "timestamp": ts,
                "totalCount": hour * 3600,
            },
            {
                "eventId": f"soak-p1-{hour}",
                "equipmentId": "filler-01",
                "timestamp": end_ts,
                "totalCount": (hour + 1) * 3600,
            },
            {
                "eventId": f"soak-q0-{hour}",
                "equipmentId": "filler-01",
                "timestamp": ts,
                "goodCount": hour * 3600,
                "rejectCount": 0,
            },
            {
                "eventId": f"soak-q1-{hour}",
                "equipmentId": "filler-01",
                "timestamp": end_ts,
                "goodCount": (hour + 1) * 3600,
                "rejectCount": 0,
            },
        ):
            assert oee_client.post("/api/v1/ingest", json=payload).status_code == 200
            published += 1
        result = oee_client.get(
            "/api/v1/oee/filler-01",
            params={
                "window": "custom",
                "from": ts,
                "to": (window_start + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
            },
        )
        assert result.status_code == 200
        body = result.json()
        assert body["oee"] == 1.0
        assert body["calculationStatus"] == "COMPLETE"
    assert published == SOAK_HOURS * 5
    from app.main import ingest

    assert ingest.duplicate_count == 0
    assert oee_client.get("/health").status_code == 200


def test_volume_10k_events_pilot_suitability(oee_client: TestClient) -> None:
    oee_client.post("/api/v1/ingest", json=CONTEXT)
    oee_client.post(
        "/api/v1/ingest",
        json={
            "eventId": "vol-s1",
            "equipmentId": "filler-01",
            "timestamp": "2026-08-20T08:00:00Z",
            "state": "RUNNING",
        },
    )
    started = time.perf_counter()
    errors = 0
    for index in range(VOLUME_EVENTS):
        second = min(index, 3599)
        timestamp = f"2026-08-20T08:{second // 60:02d}:{second % 60:02d}Z"
        response = oee_client.post(
            "/api/v1/ingest",
            json={
                "eventId": f"vol-p-{index}",
                "equipmentId": "filler-01",
                "timestamp": timestamp,
                "totalCount": index,
            },
        )
        if response.status_code != 200:
            errors += 1
    duration = time.perf_counter() - started
    api_started = time.perf_counter()
    oee = get_oee(oee_client)
    api_ms = (time.perf_counter() - api_started) * 1000
    assert oee.status_code == 200
    health = oee_client.get("/health")
    assert health.status_code == 200
    storage_bytes = Path(DB_PATH).stat().st_size if Path(DB_PATH).exists() else 0
    memory = rss_bytes()
    assert errors == 0
    assert duration < 180
    assert api_ms < 5000
    report = PILOT_DIR.joinpath("results")
    report.mkdir(parents=True, exist_ok=True)
    report.joinpath("volume.json").write_text(
        json.dumps(
            {
                "events": VOLUME_EVENTS,
                "processingSeconds": round(duration, 3),
                "apiGetOeeMs": round(api_ms, 3),
                "storageBytes": storage_bytes,
                "errors": errors,
                "rssBytes": memory,
                "purpose": "pilot suitability, not production sizing",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
