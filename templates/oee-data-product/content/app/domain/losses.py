from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.domain.models import (
    MachineState,
    MachineStateEvent,
    ProductionContext,
    ProductionContextFilter,
)
from app.domain.reason_codes import (
    UNKNOWN_REASON_ID,
    AssignmentSource,
    LossClass,
    ReasonAssignment,
    ReasonCode,
    ancestors,
    match_signal,
    unknown_code,
)
from app.domain.timeline import build_timeline
from app.domain.windows import ensure_utc, to_iso, window_seconds

# Platform UNS may emit MICROSTOP; OEE 1.0 machine-state enum maps it to STOPPED
# so loss classification (duration-based MICROSTOP) remains in the OEE engine.
CAPTURE_STATE_ALIASES = {"PLANNED_STOP": "MAINTENANCE", "MICROSTOP": "STOPPED"}
FAILURE_CLASSES = frozenset({LossClass.EQUIPMENT_FAILURE, LossClass.UNPLANNED_DOWNTIME})


@dataclass(frozen=True)
class MicrostopConfig:
    min_seconds: float = 3.0
    max_seconds: float = 60.0
    equipment_id: str | None = None
    equipment_type: str | None = None
    microstop_states: tuple[str, ...] = ("STOPPED",)
    rules: tuple[dict, ...] = ()

    def as_payload(self) -> dict:
        return {
            "microstopMinSeconds": self.min_seconds,
            "microstopMaxSeconds": self.max_seconds,
            "equipmentId": self.equipment_id,
            "equipmentType": self.equipment_type,
            "microstopStates": list(self.microstop_states),
            "rules": [dict(item) for item in self.rules],
        }


@dataclass(frozen=True)
class LossEvent:
    loss_id: str
    equipment_id: str
    classification: LossClass
    start: datetime
    end: datetime
    duration_seconds: float
    state: MachineState
    reason_code_id: str
    assignment_source: AssignmentSource
    original_reason_code_id: str
    previous_reason_code_id: str | None = None
    assigned_by: str | None = None
    assigned_at: datetime | None = None
    reason_path: tuple[str, ...] = ()
    signal: str | None = None
    event_id: str | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    order_id: str | None = None
    batch_id: str | None = None
    material_id: str | None = None
    shift_id: str | None = None
    recipe_id: str | None = None
    lost_quantity: float | None = None
    oee_impact: float | None = None

    def as_payload(self) -> dict:
        return {
            "lossId": self.loss_id,
            "equipmentId": self.equipment_id,
            "classification": self.classification.value,
            "start": to_iso(self.start),
            "end": to_iso(self.end),
            "durationSeconds": self.duration_seconds,
            "state": self.state,
            "reasonCodeId": self.reason_code_id,
            "reasonPath": list(self.reason_path),
            "assignmentSource": self.assignment_source.value,
            "originalReasonCodeId": self.original_reason_code_id,
            "previousReasonCodeId": self.previous_reason_code_id,
            "assignedBy": self.assigned_by,
            "assignedAt": to_iso(self.assigned_at) if self.assigned_at else None,
            "signal": self.signal,
            "eventId": self.event_id,
            "site": self.site,
            "area": self.area,
            "line": self.line,
            "orderId": self.order_id,
            "batchId": self.batch_id,
            "materialId": self.material_id,
            "shiftId": self.shift_id,
            "recipeId": self.recipe_id,
            "lostQuantity": self.lost_quantity,
            "oeeImpact": self.oee_impact,
        }


@dataclass(frozen=True)
class StateIntervalRecord:
    event_id: str
    equipment_id: str
    state: MachineState
    start: datetime
    end: datetime
    duration_seconds: float
    reason: str | None = None
    signal: str | None = None
    equipment_type: str | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    order_id: str | None = None
    batch_id: str | None = None
    material_id: str | None = None
    shift_id: str | None = None
    recipe_id: str | None = None

    def as_payload(self) -> dict:
        return {
            "eventId": self.event_id,
            "equipmentId": self.equipment_id,
            "state": self.state,
            "start": to_iso(self.start),
            "end": to_iso(self.end),
            "durationSeconds": self.duration_seconds,
            "reason": self.reason,
            "signal": self.signal,
            "equipmentType": self.equipment_type,
            "site": self.site,
            "area": self.area,
            "line": self.line,
            "orderId": self.order_id,
            "batchId": self.batch_id,
            "materialId": self.material_id,
            "shiftId": self.shift_id,
            "recipeId": self.recipe_id,
        }


def canonicalize_state(state: str) -> str:
    mapped = CAPTURE_STATE_ALIASES.get(state, state)
    return mapped


def make_loss_id(equipment_id: str, start: datetime, state: str) -> str:
    return f"loss:{equipment_id}:{to_iso(start)}:{state}"


def resolve_microstop_config(
    configs: list[MicrostopConfig],
    *,
    equipment_id: str,
    equipment_type: str | None,
    default: MicrostopConfig,
) -> MicrostopConfig:
    for item in configs:
        if item.equipment_id == equipment_id:
            return item
    if equipment_type:
        for item in configs:
            if item.equipment_type == equipment_type and item.equipment_id is None:
                return item
    for item in configs:
        if item.equipment_id is None and item.equipment_type is None:
            return item
    return default


def is_microstop(duration_seconds: float, config: MicrostopConfig) -> bool:
    return config.min_seconds <= duration_seconds <= config.max_seconds


def context_matches(
    values: dict[str, str | None],
    filters: ProductionContextFilter | None,
) -> bool:
    if filters is None:
        return True
    mapping = {
        "site": filters.site,
        "area": filters.area,
        "line": filters.line,
        "order_id": filters.order_id,
        "batch_id": filters.batch_id,
        "material_id": filters.material_id,
        "shift_id": filters.shift_id,
        "recipe_id": filters.recipe_id,
    }
    for key, expected in mapping.items():
        if expected is None:
            continue
        if values.get(key) != expected:
            return False
    return True


def merge_context(
    event: MachineStateEvent,
    context: ProductionContext | None,
) -> dict[str, str | None]:
    return {
        "site": event.site or (context.site if context else None),
        "area": event.area or (context.area if context else None),
        "line": event.line or (context.line if context else None),
        "order_id": event.order_id or (context.order_id if context else None),
        "batch_id": event.batch_id or (context.batch_id if context else None),
        "material_id": event.material_id or (context.material_id if context else None),
        "shift_id": event.shift_id or (context.shift_id if context else None),
        "recipe_id": event.recipe_id or (context.recipe_id if context else None),
    }


def closed_state_records(
    events: list[MachineStateEvent],
    window_start: datetime,
    window_end: datetime,
) -> list[StateIntervalRecord]:
    window_start = ensure_utc(window_start)
    window_end = ensure_utc(window_end)
    by_equipment: dict[str, list[MachineStateEvent]] = {}
    for event in events:
        by_equipment.setdefault(event.equipment_id, []).append(event)
    records: list[StateIntervalRecord] = []
    for equipment_id, group in by_equipment.items():
        intervals, _ = build_timeline(group, window_start, window_end)
        unique = sorted(group, key=lambda item: (item.timestamp, item.event_id))
        for start, end, state in intervals:
            source = _event_covering(unique, start, state)
            records.append(
                StateIntervalRecord(
                    event_id=source.event_id if source else make_loss_id(equipment_id, start, state),
                    equipment_id=equipment_id,
                    state=state,
                    start=start,
                    end=end,
                    duration_seconds=window_seconds(start, end),
                    reason=source.reason if source else None,
                    signal=source.signal if source else None,
                    equipment_type=source.equipment_type if source else None,
                    site=source.site if source else None,
                    area=source.area if source else None,
                    line=source.line if source else None,
                    order_id=source.order_id if source else None,
                    batch_id=source.batch_id if source else None,
                    material_id=source.material_id if source else None,
                    shift_id=source.shift_id if source else None,
                    recipe_id=source.recipe_id if source else None,
                )
            )
    records.sort(key=lambda item: (item.equipment_id, item.start, item.event_id))
    return records


def _event_covering(
    events: list[MachineStateEvent],
    start: datetime,
    state: MachineState,
) -> MachineStateEvent | None:
    chosen: MachineStateEvent | None = None
    for event in events:
        if event.state != state:
            continue
        if event.timestamp <= start:
            chosen = event
        else:
            break
    return chosen


def _planned_intervals(context: ProductionContext | None) -> list[tuple[datetime, datetime]]:
    if context is None:
        return []
    return [(ensure_utc(item.start), ensure_utc(item.end)) for item in context.planned_downtime]


def _overlaps_planned(
    start: datetime,
    end: datetime,
    planned: list[tuple[datetime, datetime]],
) -> bool:
    for left, right in planned:
        if min(end, right) > max(start, left):
            return True
    return False


def _rule_matches(rule: dict, *, state: str, duration: float, reason_code_id: str) -> bool:
    when = rule.get("if") or rule.get("when") or {}
    if "state" in when and when["state"] != state:
        return False
    if "reasonCodeId" in when and when["reasonCodeId"] != reason_code_id:
        return False
    if "durationMax" in when and duration > float(when["durationMax"]):
        return False
    return not ("durationMin" in when and duration < float(when["durationMin"]))


def classify_stop(
    *,
    state: MachineState,
    duration_seconds: float,
    reason: ReasonCode,
    config: MicrostopConfig,
    planned: bool,
) -> LossClass:
    for rule in config.rules:
        if _rule_matches(
            rule,
            state=state,
            duration=duration_seconds,
            reason_code_id=reason.reason_code_id,
        ):
            return LossClass(str(rule.get("classifyAs") or LossClass.UNKNOWN_STOP))
    if reason.reason_code_id != UNKNOWN_REASON_ID and reason.classification in {
        LossClass.CHANGEOVER,
        LossClass.PLANNED_DOWNTIME,
    }:
        return reason.classification
    if planned or state == "MAINTENANCE":
        return LossClass.PLANNED_DOWNTIME
    if state in config.microstop_states and is_microstop(duration_seconds, config):
        return LossClass.MICROSTOP
    if reason.reason_code_id != UNKNOWN_REASON_ID and reason.classification:
        specific = {
            LossClass.CHANGEOVER,
            LossClass.PLANNED_DOWNTIME,
            LossClass.QUALITY_STOP,
            LossClass.MATERIAL_STARVATION,
            LossClass.EQUIPMENT_FAILURE,
        }
        if reason.classification in specific:
            return reason.classification
    if state == "IDLE":
        return LossClass.IDLE_TIME
    if state == "STOPPED":
        return LossClass.UNPLANNED_DOWNTIME
    return LossClass.UNKNOWN_STOP


def detect_losses(
    events: list[MachineStateEvent],
    *,
    window_start: datetime,
    window_end: datetime,
    codes: list[ReasonCode],
    assignments: dict[str, ReasonAssignment],
    config: MicrostopConfig,
    context: ProductionContext | None = None,
    planned_seconds: float | None = None,
    performance: float | None = None,
    quality: float | None = None,
    ideal_cycle_time_seconds: float | None = None,
    filters: ProductionContextFilter | None = None,
) -> list[LossEvent]:
    planned = _planned_intervals(context)
    records = closed_state_records(events, window_start, window_end)
    losses: list[LossEvent] = []
    unknown = unknown_code(codes)
    by_id = {item.reason_code_id: item for item in codes}
    for record in records:
        if record.state == "RUNNING":
            continue
        merged = merge_context(
            MachineStateEvent(
                event_id=record.event_id,
                equipment_id=record.equipment_id,
                timestamp=record.start,
                state=record.state,
                site=record.site,
                area=record.area,
                line=record.line,
                order_id=record.order_id,
                batch_id=record.batch_id,
                material_id=record.material_id,
                shift_id=record.shift_id,
                recipe_id=record.recipe_id,
            ),
            context,
        )
        if not context_matches(merged, filters):
            continue
        loss_id = make_loss_id(record.equipment_id, record.start, record.state)
        assignment = assignments.get(loss_id)
        auto = match_signal(
            codes,
            signal=record.signal,
            reason=record.reason,
            equipment_id=record.equipment_id,
            equipment_type=record.equipment_type,
        )
        if assignment:
            chosen = by_id.get(assignment.reason_code_id, unknown)
            source = assignment.source
            original = assignment.original_reason_code_id
            previous = assignment.previous_reason_code_id
            assigned_by = assignment.assigned_by
            assigned_at = assignment.assigned_at
        elif auto:
            chosen = auto
            source = AssignmentSource.AUTOMATIC
            original = auto.reason_code_id
            previous = None
            assigned_by = None
            assigned_at = None
        else:
            chosen = unknown
            source = AssignmentSource.AUTOMATIC
            original = UNKNOWN_REASON_ID
            previous = None
            assigned_by = None
            assigned_at = None
        classification = classify_stop(
            state=record.state,
            duration_seconds=record.duration_seconds,
            reason=chosen,
            config=config,
            planned=_overlaps_planned(record.start, record.end, planned),
        )
        lost_quantity = None
        if ideal_cycle_time_seconds and ideal_cycle_time_seconds > 0:
            lost_quantity = record.duration_seconds / ideal_cycle_time_seconds
        oee_impact = None
        if planned_seconds and planned_seconds > 0:
            availability_hit = record.duration_seconds / planned_seconds
            oee_impact = availability_hit
            if performance is not None:
                oee_impact *= performance
            if quality is not None:
                oee_impact *= quality
        losses.append(
            LossEvent(
                loss_id=loss_id,
                equipment_id=record.equipment_id,
                classification=classification,
                start=record.start,
                end=record.end,
                duration_seconds=record.duration_seconds,
                state=record.state,
                reason_code_id=chosen.reason_code_id,
                assignment_source=source,
                original_reason_code_id=original,
                previous_reason_code_id=previous,
                assigned_by=assigned_by,
                assigned_at=assigned_at,
                reason_path=tuple(ancestors(codes, chosen.reason_code_id)),
                signal=record.signal or record.reason,
                event_id=record.event_id,
                site=merged["site"],
                area=merged["area"],
                line=merged["line"],
                order_id=merged["order_id"],
                batch_id=merged["batch_id"],
                material_id=merged["material_id"],
                shift_id=merged["shift_id"],
                recipe_id=merged["recipe_id"],
                lost_quantity=lost_quantity,
                oee_impact=oee_impact,
            )
        )
    return losses


def apply_manual_reason(
    existing: ReasonAssignment | None,
    *,
    loss_id: str,
    reason_code_id: str,
    user: str,
    assigned_at: datetime,
    automatic_reason_code_id: str,
) -> ReasonAssignment:
    if existing is None:
        return ReasonAssignment(
            loss_id=loss_id,
            reason_code_id=reason_code_id,
            source=AssignmentSource.MANUAL,
            original_reason_code_id=automatic_reason_code_id,
            previous_reason_code_id=automatic_reason_code_id,
            assigned_by=user,
            assigned_at=assigned_at,
        )
    return ReasonAssignment(
        loss_id=loss_id,
        reason_code_id=reason_code_id,
        source=AssignmentSource.MANUAL,
        original_reason_code_id=existing.original_reason_code_id,
        previous_reason_code_id=existing.reason_code_id,
        assigned_by=user,
        assigned_at=assigned_at,
    )


def loss_tree(
    losses: list[LossEvent],
    *,
    runtime_seconds: float,
    total_count: int,
    good_count: int,
    reject_count: int,
    ideal_cycle_time_seconds: float | None,
) -> dict:
    def bucket(classes: set[LossClass]) -> dict:
        matched = [item for item in losses if item.classification in classes]
        duration = sum(item.duration_seconds for item in matched)
        quantity = sum(item.lost_quantity or 0.0 for item in matched)
        return {
            "durationSeconds": duration,
            "occurrences": len(matched),
            "lostQuantity": quantity if quantity else None,
        }

    cycle = ideal_cycle_time_seconds if ideal_cycle_time_seconds and ideal_cycle_time_seconds > 0 else None
    expected_runtime = (cycle * total_count) if cycle is not None else None
    reduced_speed = max(runtime_seconds - expected_runtime, 0.0) if expected_runtime is not None else 0.0
    reject_time = (reject_count * cycle) if cycle is not None else 0.0
    startup = [item for item in losses if item.reason_code_id == "STARTUP_LOSS"]
    return {
        "availabilityLoss": {
            **bucket(
                {
                    LossClass.EQUIPMENT_FAILURE,
                    LossClass.PLANNED_DOWNTIME,
                    LossClass.CHANGEOVER,
                    LossClass.UNPLANNED_DOWNTIME,
                    LossClass.IDLE_TIME,
                    LossClass.UNKNOWN_STOP,
                    LossClass.MATERIAL_STARVATION,
                    LossClass.QUALITY_STOP,
                }
            ),
            "breakdown": bucket({LossClass.EQUIPMENT_FAILURE}),
            "plannedStop": bucket({LossClass.PLANNED_DOWNTIME}),
            "changeover": bucket({LossClass.CHANGEOVER}),
        },
        "performanceLoss": {
            "microstops": bucket({LossClass.MICROSTOP}),
            "reducedSpeed": {
                "durationSeconds": reduced_speed,
                "occurrences": 1 if reduced_speed > 0 else 0,
                "lostQuantity": (reduced_speed / cycle) if cycle and reduced_speed else None,
            },
        },
        "qualityLoss": {
            "rejects": {
                "durationSeconds": reject_time,
                "occurrences": reject_count,
                "lostQuantity": float(reject_count),
                "goodCount": good_count,
                "rejectCount": reject_count,
                "totalCount": total_count,
            },
            "startupLoss": {
                "durationSeconds": sum(item.duration_seconds for item in startup),
                "occurrences": len(startup),
                "lostQuantity": sum(item.lost_quantity or 0.0 for item in startup) or None,
            },
        },
    }


def pareto(
    losses: list[LossEvent],
    *,
    rank_by: str = "duration",
) -> list[dict]:
    groups: dict[tuple[str, str], dict] = {}
    for item in losses:
        key = (item.classification.value, item.reason_code_id)
        current = groups.get(key)
        if current is None:
            current = {
                "classification": item.classification.value,
                "reasonCodeId": item.reason_code_id,
                "reasonPath": list(item.reason_path),
                "durationSeconds": 0.0,
                "occurrences": 0,
                "lostQuantity": 0.0,
                "oeeImpact": 0.0,
            }
            groups[key] = current
        current["durationSeconds"] += item.duration_seconds
        current["occurrences"] += 1
        current["lostQuantity"] += item.lost_quantity or 0.0
        current["oeeImpact"] += item.oee_impact or 0.0
    ranking = {
        "duration": "durationSeconds",
        "occurrences": "occurrences",
        "lostQuantity": "lostQuantity",
        "oeeImpact": "oeeImpact",
    }.get(rank_by, "durationSeconds")
    rows = list(groups.values())
    rows.sort(key=lambda row: row[ranking], reverse=True)
    return rows


def reliability(
    losses: list[LossEvent],
    *,
    runtime_seconds: float,
) -> dict:
    failures = [item for item in losses if item.classification in FAILURE_CLASSES]
    count = len(failures)
    total_failure = sum(item.duration_seconds for item in failures)
    return {
        "failureCount": count,
        "totalFailureDurationSeconds": total_failure,
        "mtbfSeconds": (runtime_seconds / count) if count else None,
        "mttrSeconds": (total_failure / count) if count else None,
        "runtimeSeconds": runtime_seconds,
    }
