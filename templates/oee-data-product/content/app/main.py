from __future__ import annotations

"""OEE Data Product runtime. Independent of the Control Plane.

Wave 1 REST API hosts GET "/health". Domain routes include
GET "/api/v1/quality" and GET "/api/v1/platform-metadata".
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pdf_health import HealthCheckResult
from pdf_mqtt_consumer import MqttConsumer, MqttConsumerSettings
from pdf_observability import Observability
from pdf_rest_api import create_rest_app
from pdf_rest_source import RestSource, RestSourceSettings
from pdf_timeseries import SqliteTimeSeriesStore, TimeSeriesSettings

from app.config import settings
from app.domain import calculate_oee
from app.domain.models import OeeInputs
from app.domain.quality import now_utc, window_is_valid
from app.domain.windows import default_window, ensure_utc, parse_window_kind
from app.ingest import IngestService
from app.quality import evaluate
from app.store import OeeEventStore
from dataprod.metadata import platform_metadata

obs = Observability(settings.service_name)
ts_store = SqliteTimeSeriesStore(
    sqlite_path=TimeSeriesSettings().sqlite_path,
    observability=obs,
)
events = OeeEventStore(ts_store)
rest_source = RestSource(RestSourceSettings(), observability=obs)
ingest = IngestService(events, rest_source, obs)
mqtt = MqttConsumer(
    MqttConsumerSettings(topic=settings.mqtt_topic, client_id=settings.service_name),
    on_message=ingest.ingest_mqtt,
    observability=obs,
)
router = APIRouter()


def _storage_health() -> HealthCheckResult:
    if events.storage_error:
        return HealthCheckResult(name="timeseries", status="DOWN", detail="unavailable")
    return HealthCheckResult(name="timeseries", status="UP")


def _rest_health() -> HealthCheckResult:
    if not rest_source.enabled():
        return HealthCheckResult(name="rest-source", status="UP", detail="disabled")
    if ingest.rest_error:
        return HealthCheckResult(name="rest-source", status="DOWN", detail="unavailable")
    return HealthCheckResult(name="rest-source", status="UP")


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        return ensure_utc(datetime.fromisoformat(normalized))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="invalid from/to") from error


def _compute(
    equipment_id: str,
    *,
    window: str | None,
    from_time: str | None,
    to_time: str | None,
    order_id: str | None,
) -> dict[str, Any]:
    if events.storage_error:
        raise HTTPException(status_code=503, detail="timeseries_unavailable")
    kind = parse_window_kind(window or settings.default_window)
    if kind is None:
        raise HTTPException(status_code=400, detail="invalid window")
    start = _parse_time(from_time)
    end = _parse_time(to_time)
    if start is not None and end is not None and not window_is_valid(start, end):
        raise HTTPException(status_code=400, detail="invalid window bounds")
    if kind == "shift" and (start is None or end is None):
        raise HTTPException(
            status_code=400,
            detail="CURRENT_SHIFT requires explicit from/to bounds",
        )
    context = events.load_context(equipment_id)
    if kind == "order" and order_id and context and context.order_id != order_id:
        context = None
    bounds = default_window(
        kind,
        now=now_utc(),
        from_time=start,
        to_time=end,
        planned_start=context.planned_start if context else None,
        planned_end=context.planned_end if context else None,
    )
    if bounds is None or not window_is_valid(*bounds):
        raise HTTPException(status_code=400, detail="invalid window bounds")
    states = events.load_states(equipment_id)
    production = events.load_production(equipment_id)
    quality_counts = events.load_quality(equipment_id)
    if not states and not production and not quality_counts and not context:
        raise HTTPException(status_code=404, detail="equipment_unknown")
    result = calculate_oee(
        OeeInputs(
            equipment_id=equipment_id,
            window_start=bounds[0],
            window_end=bounds[1],
            window_kind=kind,
            calculated_at=now_utc(),
            states=states,
            production_counts=production,
            quality_counts=quality_counts,
            context=context,
        )
    )
    payload = result.as_payload()
    events.save_result(payload)
    return payload


@router.get("/oee")
def list_oee(
    equipmentId: str | None = None,
    window: str | None = None,
    orderId: str | None = None,
    from_time: str | None = Query(default=None, alias="from"),
    to_time: str | None = Query(default=None, alias="to"),
) -> list[dict[str, Any]]:
    target = equipmentId or settings.equipment_id
    payload = _compute(
        target,
        window=window,
        from_time=from_time,
        to_time=to_time,
        order_id=orderId,
    )
    return [payload]


@router.get("/oee/{equipment_id}")
def get_oee(
    equipment_id: str,
    window: str | None = None,
    orderId: str | None = None,
    from_time: str | None = Query(default=None, alias="from"),
    to_time: str | None = Query(default=None, alias="to"),
) -> dict[str, Any]:
    return _compute(
        equipment_id,
        window=window,
        from_time=from_time,
        to_time=to_time,
        order_id=orderId,
    )


@router.get("/oee/{equipment_id}/current")
def current_oee(
    equipment_id: str,
    window: str | None = None,
    orderId: str | None = None,
    from_time: str | None = Query(default=None, alias="from"),
    to_time: str | None = Query(default=None, alias="to"),
) -> dict[str, Any]:
    return _compute(
        equipment_id,
        window=window,
        from_time=from_time,
        to_time=to_time,
        order_id=orderId,
    )


@router.get("/oee/{equipment_id}/history")
def history_oee(equipment_id: str, window: str | None = None) -> list[dict[str, Any]]:
    if events.storage_error:
        raise HTTPException(status_code=503, detail="timeseries_unavailable")
    rows = events.load_results(equipment_id)
    if window:
        kind = parse_window_kind(window)
        rows = [row for row in rows if row.get("windowKind") == kind]
    if not rows:
        raise HTTPException(status_code=404, detail="equipment_unknown")
    return rows


@router.get("/quality")
def quality() -> dict[str, Any]:
    payloads: list[dict[str, Any]] = []
    for state in events.load_states(settings.equipment_id):
        payloads.append(
            {
                "kind": "state",
                "eventId": state.event_id,
                "equipmentId": state.equipment_id,
                "timestamp": state.timestamp.isoformat(),
                "state": state.state,
            }
        )
    for item in events.load_production(settings.equipment_id):
        payloads.append(
            {
                "kind": "production",
                "eventId": item.event_id,
                "equipmentId": item.equipment_id,
                "timestamp": item.timestamp.isoformat(),
                "totalCount": item.total_count,
            }
        )
    for item in events.load_quality(settings.equipment_id):
        payloads.append(
            {
                "kind": "quality",
                "eventId": item.event_id,
                "equipmentId": item.equipment_id,
                "timestamp": item.timestamp.isoformat(),
                "goodCount": item.good_count,
                "rejectCount": item.reject_count,
            }
        )
    context = events.load_context(settings.equipment_id)
    if context:
        payloads.append(
            {
                "kind": "context",
                "contextId": context.context_id,
                "equipmentId": context.equipment_id,
                "plannedStart": context.planned_start.isoformat(),
                "plannedEnd": context.planned_end.isoformat(),
                "idealCycleTimeSeconds": context.ideal_cycle_time_seconds,
                "timestamp": context.timestamp.isoformat(),
            }
        )
    payloads.extend(ingest.rejected)
    results = events.load_results(settings.equipment_id)
    last_reconciliation = results[0].get("reconciliationStatus") if results else None
    return evaluate(
        payloads,
        settings.data_contract_version,
        last_reconciliation=last_reconciliation,
    ).model_dump()


@router.get("/platform-metadata")
def get_platform_metadata() -> dict[str, str]:
    return platform_metadata(
        settings.template_name,
        settings.template_version,
        settings.data_contract_version,
    )


@router.post("/ingest")
def ingest_event(body: dict[str, Any]) -> dict[str, str]:
    if events.storage_error:
        raise HTTPException(status_code=503, detail="timeseries_unavailable")
    try:
        status = ingest.ingest_payload(body)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="timeseries_unavailable") from error
    return {"status": status}


def create_app():
    events.initialize()

    @asynccontextmanager
    async def lifespan(_app):
        ingest.refresh_context()
        try:
            mqtt.start()
        except Exception as error:  # noqa: BLE001
            obs.error("mqtt_connect_failed", error=str(error))
        try:
            yield
        finally:
            mqtt.stop()

    return create_rest_app(
        service=settings.service_name,
        version=settings.service_version,
        title=settings.service_name,
        description="${{ values.description }}",
        routers=[router],
        checkers=[mqtt.health_check, _rest_health, _storage_health],
        observability=obs,
        lifespan=lifespan,
    )


app = create_app()
