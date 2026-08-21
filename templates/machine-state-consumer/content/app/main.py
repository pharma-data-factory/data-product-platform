from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Body, FastAPI, HTTPException, Response

from app.config import settings
from app.ingest import EventValidationError, validate_event
from app.models import MachineStateRecord
from app.mqtt_ingest import MqttIngest
from app.quality import evaluate
from app.store import MachineStateStore
from dataprod.metadata import platform_metadata

store = MachineStateStore(settings.sqlite_path)
ingest = MqttIngest(settings, store)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    store.initialize()
    ingest.start()
    try:
        yield
    finally:
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


@app.post("/api/v1/events")
def publish_event(
    response: Response,
    document: Annotated[dict[str, Any], Body()],
) -> dict:
    try:
        event = validate_event(document)
        record, outcome = store.apply(event)
    except EventValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    response.status_code = 201 if outcome == "created" else 200
    return {
        "outcome": outcome,
        "duplicate": outcome == "duplicate",
        "machine": record.model_dump(mode="json"),
    }


@app.get("/api/v1/machines")
def list_machines() -> list[MachineStateRecord]:
    return store.list_machines()


@app.get("/api/v1/machines/{equipment_id}")
def get_machine(equipment_id: str) -> MachineStateRecord:
    record = store.get_machine(equipment_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No state for equipment '{equipment_id}'")
    return record


@app.get("/api/v1/quality")
def quality():
    return evaluate(store.quality_payloads(), settings)


@app.get("/api/v1/platform-metadata")
def get_platform_metadata() -> dict[str, str]:
    return platform_metadata(
        settings.template_name,
        settings.template_version,
        settings.data_contract_version,
    )
