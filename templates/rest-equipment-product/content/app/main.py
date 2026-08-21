from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Response

from app.config import settings
from app.models import Equipment
from app.quality import QualityReport, evaluate_records
from app.source import RestEquipmentSource
from app.store import EquipmentStore
from dataprod.metadata import platform_metadata

store = EquipmentStore(settings.sqlite_path)
source = RestEquipmentSource(settings)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    store.initialize()
    try:
        yield
    finally:
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


@app.get("/api/v1/equipment")
def list_equipment() -> list[Equipment]:
    return store.list_recent()


@app.post("/api/v1/equipment")
def upsert_equipment(record: Equipment, response: Response) -> Equipment:
    try:
        stored, created = store.upsert(record)
    except Exception as error:
        raise HTTPException(status_code=500, detail="Failed to store equipment") from error
    response.status_code = 201 if created else 200
    return stored


@app.post("/api/v1/source/sync")
def sync_from_source() -> dict[str, object]:
    if not source.enabled():
        return {"fetched": 0, "upserted": 0, "source": "disabled"}
    try:
        records = source.fetch_equipment()
    except Exception as error:
        raise HTTPException(status_code=502, detail="Failed to fetch source API") from error
    created = 0
    for record in records:
        _, was_created = store.upsert(record)
        if was_created:
            created += 1
    return {
        "fetched": len(records),
        "upserted": len(records),
        "created": created,
        "source": "configured",
    }


@app.get("/api/v1/quality")
def quality() -> QualityReport:
    return evaluate_records(store.list_recent())


@app.get("/api/v1/platform-metadata")
def get_platform_metadata() -> dict[str, str]:
    return platform_metadata(
        settings.template_name,
        settings.template_version,
        settings.data_contract_version,
    )
