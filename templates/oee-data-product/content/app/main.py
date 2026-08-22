from __future__ import annotations

"""OEE Data Product runtime. Independent of the Control Plane.

Wave 1 REST API hosts GET "/health". Domain routes include
GET "/api/v1/quality" and GET "/api/v1/platform-metadata".
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pdf_health import HealthCheckResult
from pdf_mqtt_consumer import MqttConsumer, MqttConsumerSettings
from pdf_observability import Observability
from pdf_rest_api import create_rest_app
from pdf_rest_source import RestSource, RestSourceSettings
from pdf_timeseries import SqliteTimeSeriesStore, TimeSeriesSettings

from app.capabilities import capability_registry
from app.config import settings
from app.domain import calculate_oee
from app.domain.losses import context_matches, merge_context
from app.domain.models import MachineStateEvent, OeeInputs, ProductionContextFilter
from app.domain.quality import now_utc, window_is_valid
from app.domain.windows import default_window, parse_window_kind
from app.ingest import IngestService
from app.loss_routes import bind_loss_routes
from app.loss_service import LossService
from app.quality import evaluate
from app.query import context_filter, parse_time
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
loss_service = LossService(events)


def _usable_topic(value: str | None) -> bool:
    return bool(value) and not str(value).startswith("${{")


def mqtt_topics() -> list[str]:
    topics: list[str] = []
    for value in (settings.machine_state_topic, settings.counter_topic, settings.mqtt_topic):
        if _usable_topic(value) and value not in topics:
            topics.append(value)
    if not topics:
        topics.append(settings.mqtt_topic or "#")
    return topics


mqtt_consumers = [
    MqttConsumer(
        MqttConsumerSettings(topic=topic, client_id=f"{settings.service_name}-{index}"),
        on_message=ingest.ingest_mqtt,
        observability=obs,
    )
    for index, topic in enumerate(mqtt_topics())
]
mqtt = mqtt_consumers[0]
router = APIRouter()


def _mqtt_health() -> HealthCheckResult:
    results = [consumer.health_check() for consumer in mqtt_consumers]
    down = next((item for item in results if item.status == "DOWN"), None)
    if down is not None:
        return HealthCheckResult(name="mqtt", status="DOWN", detail=down.detail)
    return results[0]


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


def _compute(
    equipment_id: str,
    *,
    window: str | None,
    from_time: str | None,
    to_time: str | None,
    order_id: str | None,
    filters: ProductionContextFilter | None = None,
) -> dict[str, Any]:
    if events.storage_error:
        raise HTTPException(status_code=503, detail="timeseries_unavailable")
    kind = parse_window_kind(window or settings.default_window)
    if kind is None:
        raise HTTPException(status_code=400, detail="invalid window")
    start = parse_time(from_time)
    end = parse_time(to_time)
    if start is not None and end is not None and not window_is_valid(start, end):
        raise HTTPException(status_code=400, detail="invalid window bounds")
    if kind == "SHIFT" and (start is None or end is None):
        raise HTTPException(
            status_code=400,
            detail="SHIFT requires explicit start/end bounds",
        )
    context = events.load_context(equipment_id)
    if kind == "ORDER" and order_id and context and context.order_id != order_id:
        context = None
    if context and filters and not context_matches(
        merge_context(
            MachineStateEvent(
                event_id="ctx",
                equipment_id=equipment_id,
                timestamp=start or now_utc(),
                state="RUNNING",
            ),
            context,
        ),
        filters,
    ):
        raise HTTPException(status_code=404, detail="equipment_unknown")
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
    context_payload = payload.setdefault("context", {})
    for key, value in (
        ("site", settings.site),
        ("area", settings.area),
        ("line", settings.line),
    ):
        if not context_payload.get(key) and _usable_topic(value):
            context_payload[key] = value
    events.save_result(payload)
    return payload


def _resolve_window(
    window: str | None,
    window_type: str | None,
    from_time: str | None,
    to_time: str | None,
    start: str | None,
    end: str | None,
) -> tuple[str | None, str | None, str | None]:
    return window or window_type, from_time or start, to_time or end


def _filters(
    site: str | None = None,
    area: str | None = None,
    line: str | None = None,
    order_id: str | None = None,
    batch_id: str | None = None,
    material_id: str | None = None,
    product: str | None = None,
    shift_id: str | None = None,
    recipe_id: str | None = None,
) -> ProductionContextFilter:
    return context_filter(
        site=site,
        area=area,
        line=line,
        order_id=order_id,
        batch_id=batch_id,
        material_id=material_id,
        product=product,
        shift_id=shift_id,
        recipe_id=recipe_id,
    )


@router.get("/oee")
def list_oee(
    equipmentId: str | None = None,
    window: str | None = None,
    windowType: str | None = None,
    orderId: str | None = None,
    from_time: str | None = Query(default=None, alias="from"),
    to_time: str | None = Query(default=None, alias="to"),
    start: str | None = None,
    end: str | None = None,
    site: str | None = None,
    area: str | None = None,
    line: str | None = None,
    batchId: str | None = None,
    materialId: str | None = None,
    product: str | None = None,
    shiftId: str | None = None,
    recipeId: str | None = None,
) -> list[dict[str, Any]]:
    target = equipmentId or settings.equipment_id
    resolved_window, resolved_from, resolved_to = _resolve_window(
        window, windowType, from_time, to_time, start, end
    )
    payload = _compute(
        target,
        window=resolved_window,
        from_time=resolved_from,
        to_time=resolved_to,
        order_id=orderId,
        filters=_filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
    )
    return [payload]


@router.get("/oee/{equipment_id}")
def get_oee(
    equipment_id: str,
    window: str | None = None,
    windowType: str | None = None,
    orderId: str | None = None,
    from_time: str | None = Query(default=None, alias="from"),
    to_time: str | None = Query(default=None, alias="to"),
    start: str | None = None,
    end: str | None = None,
    site: str | None = None,
    area: str | None = None,
    line: str | None = None,
    batchId: str | None = None,
    materialId: str | None = None,
    product: str | None = None,
    shiftId: str | None = None,
    recipeId: str | None = None,
) -> dict[str, Any]:
    resolved_window, resolved_from, resolved_to = _resolve_window(
        window, windowType, from_time, to_time, start, end
    )
    return _compute(
        equipment_id,
        window=resolved_window,
        from_time=resolved_from,
        to_time=resolved_to,
        order_id=orderId,
        filters=_filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
    )


@router.get("/oee/{equipment_id}/current")
def current_oee(
    equipment_id: str,
    window: str | None = None,
    orderId: str | None = None,
    from_time: str | None = Query(default=None, alias="from"),
    to_time: str | None = Query(default=None, alias="to"),
    site: str | None = None,
    area: str | None = None,
    line: str | None = None,
    batchId: str | None = None,
    materialId: str | None = None,
    product: str | None = None,
    shiftId: str | None = None,
    recipeId: str | None = None,
) -> dict[str, Any]:
    return _compute(
        equipment_id,
        window=window,
        from_time=from_time,
        to_time=to_time,
        order_id=orderId,
        filters=_filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
    )


@router.get("/oee/{equipment_id}/history")
def history_oee(equipment_id: str, window: str | None = None) -> list[dict[str, Any]]:
    if events.storage_error:
        raise HTTPException(status_code=503, detail="timeseries_unavailable")
    rows = events.load_results(equipment_id)
    if window:
        kind = parse_window_kind(window)
        rows = [
            row
            for row in rows
            if (row.get("window") or {}).get("type") == kind or row.get("windowKind") == kind
        ]
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
                "reworkCount": item.rework_count,
            }
        )
    context = events.load_context(settings.equipment_id)
    if context:
        context_payload: dict[str, Any] = {
            "kind": "context",
            "contextId": context.context_id,
            "equipmentId": context.equipment_id,
            "idealCycleTimeSeconds": context.ideal_cycle_time_seconds,
            "timestamp": context.timestamp.isoformat(),
        }
        if context.planned_start:
            context_payload["plannedStart"] = context.planned_start.isoformat()
        if context.planned_end:
            context_payload["plannedEnd"] = context.planned_end.isoformat()
        payloads.append(context_payload)
    payloads.extend(ingest.rejected)
    results = events.load_results(settings.equipment_id)
    last_reconciliation = results[0].get("reconciliationStatus") if results else None
    return evaluate(
        payloads,
        settings.data_contract_version,
        last_reconciliation=last_reconciliation,
    ).model_dump()


@router.get("/capabilities")
def get_capabilities() -> dict[str, Any]:
    return capability_registry()


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
            for consumer in mqtt_consumers:
                consumer.start()
        except Exception as error:  # noqa: BLE001
            obs.error("mqtt_connect_failed", error=str(error))
        try:
            yield
        finally:
            for consumer in mqtt_consumers:
                consumer.stop()

    return create_rest_app(
        service=settings.service_name,
        version=settings.service_version,
        title=settings.service_name,
        description="${{ values.description }}",
        routers=[router, bind_loss_routes(events, ingest, loss_service)],
        checkers=[_mqtt_health, _rest_health, _storage_health],
        observability=obs,
        lifespan=lifespan,
    )


app = create_app()
