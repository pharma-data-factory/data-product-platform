from __future__ import annotations

from datetime import datetime
from typing import Any

from app.config import settings
from app.domain import calculate_oee
from app.domain.losses import (
    MicrostopConfig,
    apply_manual_reason,
    closed_state_records,
    detect_losses,
    loss_tree,
    pareto,
    reliability,
    resolve_microstop_config,
)
from app.domain.models import OeeInputs, ProductionContextFilter
from app.domain.quality import now_utc
from app.domain.reason_codes import (
    UNKNOWN_REASON_ID,
    ReasonCode,
    match_signal,
)
from app.store import OeeEventStore


class LossService:
    def __init__(self, events: OeeEventStore) -> None:
        self.events = events

    def default_config(self) -> MicrostopConfig:
        return MicrostopConfig(
            min_seconds=settings.microstop_min_seconds,
            max_seconds=settings.microstop_max_seconds,
        )

    def config_for(self, equipment_id: str, equipment_type: str | None = None) -> MicrostopConfig:
        return resolve_microstop_config(
            self.events.load_loss_configs(),
            equipment_id=equipment_id,
            equipment_type=equipment_type,
            default=self.default_config(),
        )

    def reason_codes(self, include_inactive: bool = False) -> list[ReasonCode]:
        self.events.ensure_default_catalog()
        return self.events.load_reason_codes(include_inactive=include_inactive)

    def states(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
    ) -> list[dict[str, Any]]:
        records = closed_state_records(
            self.events.load_states(equipment_id),
            window_start,
            window_end,
        )
        return [item.as_payload() for item in records]

    def losses(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
        filters: ProductionContextFilter | None = None,
    ) -> list[dict[str, Any]]:
        return [item.as_payload() for item in self._losses(equipment_id, window_start, window_end, filters)]

    def _losses(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
        filters: ProductionContextFilter | None = None,
    ):
        context = self.events.load_context(equipment_id)
        oee = self._oee(equipment_id, window_start, window_end)
        payload = oee.as_payload() if oee else {}
        return detect_losses(
            self.events.load_states(equipment_id),
            window_start=window_start,
            window_end=window_end,
            codes=self.reason_codes(include_inactive=True),
            assignments=self.events.load_assignments(),
            config=self.config_for(equipment_id),
            context=context,
            planned_seconds=payload.get("plannedProductionSeconds"),
            performance=payload.get("performance"),
            quality=payload.get("quality"),
            ideal_cycle_time_seconds=payload.get("idealCycleTimeSeconds"),
            filters=filters,
        )

    def assign_reason(self, loss_id: str, reason_code_id: str, user: str) -> dict[str, Any]:
        code = self.events.load_reason_code(reason_code_id)
        if code is None or not code.active:
            raise ValueError("unknown_reason_code")
        parsed = _parse_loss_id(loss_id)
        if parsed is None:
            raise ValueError("unknown_loss")
        equipment_id, start, _state = parsed
        window_start = start
        window_end = now_utc()
        detected = self._losses(equipment_id, window_start, window_end)
        target = next((item for item in detected if item.loss_id == loss_id), None)
        if target is None:
            # Look across stored events using a wide window around the loss start.
            from datetime import timedelta

            detected = self._losses(equipment_id, start - timedelta(days=1), start + timedelta(days=1))
            target = next((item for item in detected if item.loss_id == loss_id), None)
        if target is None:
            raise ValueError("unknown_loss")
        automatic = match_signal(
            self.reason_codes(include_inactive=True),
            signal=target.signal,
            reason=None,
            equipment_id=equipment_id,
            equipment_type=None,
        )
        automatic_id = automatic.reason_code_id if automatic else UNKNOWN_REASON_ID
        assignment = apply_manual_reason(
            self.events.load_assignments().get(loss_id),
            loss_id=loss_id,
            reason_code_id=reason_code_id,
            user=user,
            assigned_at=now_utc(),
            automatic_reason_code_id=target.original_reason_code_id or automatic_id,
        )
        self.events.save_assignment(assignment)
        refreshed = self._losses(equipment_id, start, target.end)
        current = next((item for item in refreshed if item.loss_id == loss_id), None)
        if current is None:
            raise ValueError("unknown_loss")
        return current.as_payload()

    def tree(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
        filters: ProductionContextFilter | None = None,
    ) -> dict[str, Any]:
        oee = self._oee(equipment_id, window_start, window_end)
        if oee is None:
            raise ValueError("equipment_unknown")
        payload = oee.as_payload()
        return {
            "equipmentId": equipment_id,
            "windowStart": payload["windowStart"],
            "windowEnd": payload["windowEnd"],
            "oee": payload,
            "lossTree": loss_tree(
                self._losses(equipment_id, window_start, window_end, filters),
                runtime_seconds=payload["runtimeSeconds"] or 0,
                total_count=payload["totalCount"] or 0,
                good_count=payload["goodCount"] or 0,
                reject_count=payload["rejectCount"] or 0,
                ideal_cycle_time_seconds=payload.get("idealCycleTimeSeconds"),
            ),
        }

    def pareto_rows(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
        rank_by: str,
        filters: ProductionContextFilter | None = None,
    ) -> list[dict[str, Any]]:
        return pareto(
            self._losses(equipment_id, window_start, window_end, filters),
            rank_by=rank_by,
        )

    def reliability_metrics(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
        filters: ProductionContextFilter | None = None,
    ) -> dict[str, Any]:
        oee = self._oee(equipment_id, window_start, window_end)
        if oee is None:
            raise ValueError("equipment_unknown")
        payload = oee.as_payload()
        metrics = reliability(
            self._losses(equipment_id, window_start, window_end, filters),
            runtime_seconds=payload["runtimeSeconds"] or 0,
        )
        metrics["equipmentId"] = equipment_id
        metrics["windowStart"] = payload["windowStart"]
        metrics["windowEnd"] = payload["windowEnd"]
        return metrics

    def historical(
        self,
        equipment_id: str,
        window_start: datetime,
        window_end: datetime,
        filters: ProductionContextFilter | None = None,
    ) -> dict[str, Any]:
        oee = self._oee(equipment_id, window_start, window_end)
        if oee is None:
            raise ValueError("equipment_unknown")
        payload = oee.as_payload()
        return {
            "oee": payload,
            "losses": self.losses(equipment_id, window_start, window_end, filters),
        }

    def _oee(self, equipment_id: str, window_start: datetime, window_end: datetime):
        states = self.events.load_states(equipment_id)
        production = self.events.load_production(equipment_id)
        quality_counts = self.events.load_quality(equipment_id)
        context = self.events.load_context(equipment_id)
        if not states and not production and not quality_counts and not context:
            return None
        return calculate_oee(
            OeeInputs(
                equipment_id=equipment_id,
                window_start=window_start,
                window_end=window_end,
                window_kind="CUSTOM",
                calculated_at=now_utc(),
                states=states,
                production_counts=production,
                quality_counts=quality_counts,
                context=context,
            )
        )


def _parse_loss_id(loss_id: str) -> tuple[str, datetime, str] | None:
    if not loss_id.startswith("loss:"):
        return None
    parts = loss_id.split(":")
    if len(parts) < 4:
        return None
    equipment_id = parts[1]
    state = parts[-1]
    start_raw = ":".join(parts[2:-1])
    normalized = start_raw[:-1] + "+00:00" if start_raw.endswith("Z") else start_raw
    try:
        start = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return equipment_id, start, state
