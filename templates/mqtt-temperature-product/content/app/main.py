from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Response

from app.config import settings
from app.models import TemperatureEvent
from app.mqtt_ingest import MqttIngest
from app.product_publish import ProductPublishBus
from app.quality import QualityReport, evaluate_events
from app.store import TemperatureStore
from dataprod.metadata import platform_metadata

store = TemperatureStore(settings.sqlite_path)
publisher = ProductPublishBus(settings)
ingest = MqttIngest(settings, store, publisher)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    store.initialize()
    ingest.start()
    publisher.start()
    try:
        yield
    finally:
        publisher.stop()
        ingest.stop()
        store.close()


app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="${{ values.description }}",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "UP",
        "service": settings.service_name,
        "version": settings.service_version,
    }


@app.get("/api/v1/temperatures")
def list_temperatures() -> list[TemperatureEvent]:
    return store.list_recent()


@app.post("/api/v1/temperatures")
def create_temperature(event: TemperatureEvent, response: Response) -> TemperatureEvent:
    try:
        stored, created = store.insert(event)
    except Exception as error:
        raise HTTPException(status_code=500, detail="Failed to store temperature event") from error
    response.status_code = 201 if created else 200
    if created:
        publisher.publish_temperature(stored)
    return stored


@app.get("/api/v1/quality")
def quality() -> QualityReport:
    return evaluate_events(store.list_recent(), settings)


@app.get("/api/v1/platform-metadata")
def get_platform_metadata() -> dict[str, str]:
    return platform_metadata(
        settings.template_name,
        settings.template_version,
        settings.data_contract_version,
    )
