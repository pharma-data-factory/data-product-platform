from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from pdf_health import HealthCheckResult
from pdf_rest_api import create_rest_app

from pdf_aas.repository import SqliteAasRepository
from pdf_aas.seed import seed_reference_assets
from pdf_aas.service import create_aas_router

SERVICE = "aas-foundation"
VERSION = "1.0.0"


def sqlite_path() -> Path:
    return Path(os.environ.get("AAS_SQLITE_PATH", ".data/aas.sqlite"))


def create_app(repo: SqliteAasRepository | None = None) -> FastAPI:
    store = repo or SqliteAasRepository(sqlite_path())
    if os.environ.get("AAS_SEED", "true").lower() != "false":
        seed_reference_assets(store)

    def db_check() -> HealthCheckResult:
        store.list_assets()
        return HealthCheckResult(name="sqlite", status="UP")

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        store.close()

    return create_rest_app(
        service=SERVICE,
        version=VERSION,
        title="AAS Foundation",
        description="Asset Administration Shell repository. Not a Data Product and not a historian.",
        routers=(create_aas_router(store),),
        checkers=[db_check],
        lifespan=lifespan,
    )


app = create_app()
