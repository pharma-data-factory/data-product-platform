import json
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pdf_mqtt_consumer import MqttConsumer, MqttConsumerSettings
from pdf_observability import Observability
from pdf_rest_api import create_rest_app
from pdf_timeseries import MetricPoint, SqliteTimeSeriesStore
from pydantic import BaseModel, Field

obs = Observability("machine-metrics-reference")
store = SqliteTimeSeriesStore(observability=obs)
router = APIRouter()


class MetricIn(BaseModel):
    entity_id: str = Field(alias="entityId")
    metric: str
    value: float
    unit: str
    timestamp: datetime | None = None
    tags: dict[str, str] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


def validate_metric(payload: dict) -> MetricPoint:
    incoming = MetricIn.model_validate(payload)
    return MetricPoint(
        timestamp=incoming.timestamp or datetime.now().astimezone(),
        entityId=incoming.entity_id,
        metric=incoming.metric,
        value=incoming.value,
        unit=incoming.unit,
        tags=incoming.tags,
    )


def _point_body(point: MetricPoint) -> dict:
    return {
        "entityId": point.entity_id,
        "metric": point.metric,
        "value": point.value,
        "unit": point.unit,
        "timestamp": point.timestamp.isoformat(),
        "tags": point.tags,
    }


def ingest_payload(_topic: str, payload: str) -> None:
    point = validate_metric(json.loads(payload))
    stored = store.write_point(point)
    obs.info("metric_ingested", entityId=stored.entity_id, metric=stored.metric)


mqtt = MqttConsumer(
    MqttConsumerSettings(),
    on_message=ingest_payload,
    observability=obs,
)


@router.get("/metrics/latest")
def latest_metric(
    entity_id: str | None = Query(default=None, alias="entityId"),
    metric: str | None = None,
) -> dict:
    point = store.latest(entity_id=entity_id, metric=metric)
    if point is None:
        raise HTTPException(status_code=404, detail="No metric points")
    return _point_body(point)


@router.get("/metrics")
def list_metrics(
    entity_id: str | None = Query(default=None, alias="entityId"),
    metric: str | None = None,
) -> list[dict]:
    return [
        _point_body(point)
        for point in store.query_range(entity_id=entity_id, metric=metric)
    ]


@router.post("/metrics")
def write_metric(body: MetricIn) -> dict:
    point = validate_metric(body.model_dump(by_alias=True))
    stored = store.write_point(point)
    return _point_body(stored)


def create_app():
    store.initialize()

    @asynccontextmanager
    async def lifespan(_app):
        mqtt.start()
        try:
            yield
        finally:
            mqtt.stop()

    return create_rest_app(
        service="machine-metrics-reference",
        version="1.0.0",
        title="Machine Metrics Reference",
        description="Reference composition. Generic machine metrics only. Not OEE.",
        routers=[router],
        checkers=[mqtt.health_check],
        observability=obs,
        lifespan=lifespan,
    )


app = create_app()
