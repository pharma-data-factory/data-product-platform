"""Deterministic Test MES fixture. Not a SAP or plant MES."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel

MODES = ("NORMAL", "TIMEOUT", "HTTP_500", "INVALID_CONTRACT", "MISSING_IDEAL_CYCLE")


class ModeBody(BaseModel):
    mode: str


app = FastAPI(title="OEE Pilot Test MES", version="1.0.0")
state = {"mode": "NORMAL"}


def normal_context(equipment_id: str) -> dict[str, object]:
    return {
        "contextId": "ctx-line-01-order-1001",
        "equipmentId": equipment_id,
        "orderId": "1001",
        "materialId": "material-a",
        "plannedStart": "2026-08-20T08:00:00Z",
        "plannedEnd": "2026-08-20T09:00:00Z",
        "idealCycleTimeSeconds": 1.0,
        "targetQuantity": 3600,
        "timestamp": "2026-08-20T07:55:00Z",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP", "mode": str(state["mode"])}


@app.get("/api/v1/test-mode")
def get_mode() -> dict[str, str]:
    return {"mode": str(state["mode"])}


@app.post("/api/v1/test-mode")
def set_mode(body: ModeBody) -> dict[str, str]:
    mode = body.mode.upper()
    if mode not in MODES:
        raise HTTPException(status_code=400, detail="unknown_mode")
    state["mode"] = mode
    return {"mode": mode}


@app.get("/api/v1/production-context/{equipment_id}")
def production_context(equipment_id: str = Path(...)) -> JSONResponse:
    mode = str(state["mode"])
    if mode == "TIMEOUT":
        import time

        time.sleep(5)
        return JSONResponse(normal_context(equipment_id))
    if mode == "HTTP_500":
        return JSONResponse({"error": "mes_unavailable"}, status_code=500)
    if mode == "INVALID_CONTRACT":
        return JSONResponse({"hello": "not-a-production-context", "version": "99.0.0"})
    if mode == "MISSING_IDEAL_CYCLE":
        payload = normal_context(equipment_id)
        payload.pop("idealCycleTimeSeconds")
        return JSONResponse(payload)
    return JSONResponse(normal_context(equipment_id))
