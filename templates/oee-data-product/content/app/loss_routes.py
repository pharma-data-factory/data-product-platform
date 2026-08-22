from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.domain.losses import MicrostopConfig, context_matches, merge_context
from app.domain.models import MachineStateEvent
from app.domain.quality import now_utc, window_is_valid
from app.domain.reason_codes import reason_code_from_payload
from app.domain.windows import default_window, parse_window_kind
from app.ingest import IngestService
from app.loss_service import LossService
from app.query import context_filter, parse_time
from app.store import OeeEventStore


def bind_loss_routes(events: OeeEventStore, ingest: IngestService, losses: LossService) -> APIRouter:
    router = APIRouter()

    def _window(
        equipment_id: str,
        window: str | None,
        from_time: str | None,
        to_time: str | None,
        order_id: str | None,
    ) -> tuple[Any, Any]:
        kind = parse_window_kind(window or "CUSTOM")
        if kind is None:
            raise HTTPException(status_code=400, detail="invalid window")
        start = parse_time(from_time)
        end = parse_time(to_time)
        if start is not None and end is not None and not window_is_valid(start, end):
            raise HTTPException(status_code=400, detail="invalid window bounds")
        context = events.load_context(equipment_id)
        if kind == "ORDER" and order_id and context and context.order_id != order_id:
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
        return bounds

    def _filters(
        site: str | None,
        area: str | None,
        line: str | None,
        order_id: str | None,
        batch_id: str | None,
        material_id: str | None,
        product: str | None,
        shift_id: str | None,
        recipe_id: str | None,
    ):
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

    @router.post("/equipment-states", status_code=200)
    def capture_state(body: dict[str, Any]) -> dict[str, str]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        if "state" not in body:
            raise HTTPException(status_code=400, detail="unknown_event")
        try:
            status = ingest.ingest_payload(body, enforce_equipment=False)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable") from error
        return {"status": status}

    @router.get("/equipment-states")
    def list_states(
        equipmentId: str,
        window: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        orderId: str | None = None,
    ) -> list[dict[str, Any]]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        start, end = _window(equipmentId, window, from_time, to_time, orderId)
        rows = losses.states(equipmentId, start, end)
        if not rows and not events.load_states(equipmentId):
            raise HTTPException(status_code=404, detail="equipment_unknown")
        return rows

    @router.get("/losses")
    def list_losses(
        equipmentId: str,
        window: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        orderId: str | None = None,
        site: str | None = None,
        area: str | None = None,
        line: str | None = None,
        batchId: str | None = None,
        materialId: str | None = None,
        product: str | None = None,
        shiftId: str | None = None,
        recipeId: str | None = None,
    ) -> list[dict[str, Any]]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        start, end = _window(equipmentId, window, from_time, to_time, orderId)
        return losses.losses(
            equipmentId,
            start,
            end,
            _filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
        )

    @router.patch("/losses/{loss_id}/reason")
    def patch_reason(loss_id: str, body: dict[str, Any]) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        reason_code_id = body.get("reasonCodeId")
        user = body.get("user") or body.get("assignedBy")
        if not reason_code_id or not user:
            raise HTTPException(status_code=400, detail="reasonCodeId and user are required")
        try:
            return losses.assign_reason(str(loss_id), str(reason_code_id), str(user))
        except ValueError as error:
            status = 404 if str(error) in {"unknown_loss", "unknown_reason_code"} else 400
            raise HTTPException(status_code=status, detail=str(error)) from error

    @router.get("/reason-codes")
    def list_reason_codes(includeInactive: bool = False) -> list[dict[str, Any]]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        return [item.as_payload() for item in losses.reason_codes(include_inactive=includeInactive)]

    @router.post("/reason-codes")
    def create_reason_code(body: dict[str, Any]) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        if not body.get("reasonCodeId") or not body.get("name"):
            raise HTTPException(status_code=400, detail="reasonCodeId and name are required")
        existing = events.load_reason_code(str(body["reasonCodeId"]))
        if existing is not None:
            raise HTTPException(status_code=409, detail="reason_code_exists")
        code = reason_code_from_payload(body)
        if code.parent_id and events.load_reason_code(code.parent_id) is None:
            raise HTTPException(status_code=400, detail="unknown_parent")
        events.save_reason_code(code)
        return code.as_payload()

    @router.get("/reason-codes/{reason_code_id}")
    def get_reason_code(reason_code_id: str) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        code = events.load_reason_code(reason_code_id)
        if code is None:
            raise HTTPException(status_code=404, detail="unknown_reason_code")
        return code.as_payload()

    @router.patch("/reason-codes/{reason_code_id}")
    def patch_reason_code(reason_code_id: str, body: dict[str, Any]) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        current = events.load_reason_code(reason_code_id)
        if current is None:
            raise HTTPException(status_code=404, detail="unknown_reason_code")
        merged = current.as_payload()
        merged.update({key: value for key, value in body.items() if value is not None})
        merged["reasonCodeId"] = reason_code_id
        updated = reason_code_from_payload(merged)
        events.save_reason_code(updated)
        return updated.as_payload()

    @router.get("/loss-config")
    def get_loss_config(
        equipmentId: str | None = None,
        equipmentType: str | None = None,
    ) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        config = losses.config_for(equipmentId or "", equipmentType)
        return config.as_payload()

    @router.put("/loss-config")
    def put_loss_config(body: dict[str, Any]) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        min_seconds = float(body.get("microstopMinSeconds", losses.default_config().min_seconds))
        max_seconds = float(body.get("microstopMaxSeconds", losses.default_config().max_seconds))
        if min_seconds < 0 or max_seconds < min_seconds:
            raise HTTPException(status_code=400, detail="invalid microstop thresholds")
        config = MicrostopConfig(
            min_seconds=min_seconds,
            max_seconds=max_seconds,
            equipment_id=body.get("equipmentId"),
            equipment_type=body.get("equipmentType"),
            microstop_states=tuple(body.get("microstopStates") or ("STOPPED",)),
            rules=tuple(body.get("rules") or ()),
        )
        events.save_loss_config(config)
        return config.as_payload()

    @router.get("/loss-tree")
    def get_loss_tree(
        equipmentId: str,
        window: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        orderId: str | None = None,
        site: str | None = None,
        area: str | None = None,
        line: str | None = None,
        batchId: str | None = None,
        materialId: str | None = None,
        product: str | None = None,
        shiftId: str | None = None,
        recipeId: str | None = None,
    ) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        start, end = _window(equipmentId, window, from_time, to_time, orderId)
        try:
            return losses.tree(
                equipmentId,
                start,
                end,
                _filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
            )
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.get("/losses/pareto")
    def get_pareto(
        equipmentId: str,
        rankBy: str = "duration",
        window: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        orderId: str | None = None,
        site: str | None = None,
        area: str | None = None,
        line: str | None = None,
        batchId: str | None = None,
        materialId: str | None = None,
        product: str | None = None,
        shiftId: str | None = None,
        recipeId: str | None = None,
    ) -> list[dict[str, Any]]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        if rankBy not in {"duration", "occurrences", "lostQuantity", "oeeImpact"}:
            raise HTTPException(status_code=400, detail="invalid rankBy")
        start, end = _window(equipmentId, window, from_time, to_time, orderId)
        return losses.pareto_rows(
            equipmentId,
            start,
            end,
            rankBy,
            _filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
        )

    @router.get("/reliability/{equipment_id}")
    def get_reliability(
        equipment_id: str,
        window: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        orderId: str | None = None,
        site: str | None = None,
        area: str | None = None,
        line: str | None = None,
        batchId: str | None = None,
        materialId: str | None = None,
        product: str | None = None,
        shiftId: str | None = None,
        recipeId: str | None = None,
    ) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        start, end = _window(equipment_id, window, from_time, to_time, orderId)
        try:
            return losses.reliability_metrics(
                equipment_id,
                start,
                end,
                _filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId),
            )
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @router.get("/oee/{equipment_id}/history-with-losses")
    def history_with_losses(
        equipment_id: str,
        window: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        orderId: str | None = None,
        site: str | None = None,
        area: str | None = None,
        line: str | None = None,
        batchId: str | None = None,
        materialId: str | None = None,
        product: str | None = None,
        shiftId: str | None = None,
        recipeId: str | None = None,
    ) -> dict[str, Any]:
        if events.storage_error:
            raise HTTPException(status_code=503, detail="timeseries_unavailable")
        start, end = _window(equipment_id, window, from_time, to_time, orderId)
        context = events.load_context(equipment_id)
        filters = _filters(site, area, line, orderId, batchId, materialId, product, shiftId, recipeId)
        if context and not context_matches(
            merge_context(
                MachineStateEvent(
                    event_id="ctx",
                    equipment_id=equipment_id,
                    timestamp=start,
                    state="RUNNING",
                ),
                context,
            ),
            filters,
        ):
            raise HTTPException(status_code=404, detail="equipment_unknown")
        try:
            return losses.historical(equipment_id, start, end, filters)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    return router
