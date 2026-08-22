from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class LossClass(StrEnum):
    MICROSTOP = "MICROSTOP"
    UNPLANNED_DOWNTIME = "UNPLANNED_DOWNTIME"
    PLANNED_DOWNTIME = "PLANNED_DOWNTIME"
    CHANGEOVER = "CHANGEOVER"
    IDLE_TIME = "IDLE_TIME"
    EQUIPMENT_FAILURE = "EQUIPMENT_FAILURE"
    MATERIAL_STARVATION = "MATERIAL_STARVATION"
    QUALITY_STOP = "QUALITY_STOP"
    UNKNOWN_STOP = "UNKNOWN_STOP"


class AssignmentSource(StrEnum):
    AUTOMATIC = "AUTOMATIC"
    MANUAL = "MANUAL"


@dataclass(frozen=True)
class ReasonCode:
    reason_code_id: str
    name: str
    description: str
    active: bool = True
    parent_id: str | None = None
    classification: LossClass | None = None
    equipment_ids: tuple[str, ...] = ()
    equipment_types: tuple[str, ...] = ()
    signals: tuple[str, ...] = ()

    def as_payload(self) -> dict:
        return {
            "reasonCodeId": self.reason_code_id,
            "name": self.name,
            "description": self.description,
            "active": self.active,
            "parentReasonCodeId": self.parent_id,
            "classification": self.classification.value if self.classification else None,
            "equipmentIds": list(self.equipment_ids),
            "equipmentTypes": list(self.equipment_types),
            "signals": list(self.signals),
        }


@dataclass(frozen=True)
class ReasonAssignment:
    loss_id: str
    reason_code_id: str
    source: AssignmentSource
    original_reason_code_id: str
    previous_reason_code_id: str | None = None
    assigned_by: str | None = None
    assigned_at: datetime | None = None

    def as_payload(self) -> dict:
        return {
            "lossId": self.loss_id,
            "reasonCodeId": self.reason_code_id,
            "assignmentSource": self.source.value,
            "originalReasonCodeId": self.original_reason_code_id,
            "previousReasonCodeId": self.previous_reason_code_id,
            "assignedBy": self.assigned_by,
            "assignedAt": self.assigned_at.isoformat().replace("+00:00", "Z")
            if self.assigned_at
            else None,
        }


UNKNOWN_REASON_ID = "UNKNOWN"

DEFAULT_REASON_CODES: tuple[ReasonCode, ...] = (
    ReasonCode(
        UNKNOWN_REASON_ID,
        "Unknown",
        "No reason could be determined.",
        classification=LossClass.UNKNOWN_STOP,
    ),
    ReasonCode("EQUIPMENT", "Equipment", "Equipment-related losses."),
    ReasonCode("LABELER", "Labeler", "Labeler equipment.", parent_id="EQUIPMENT"),
    ReasonCode(
        "JAM",
        "Jam",
        "Equipment jam.",
        parent_id="LABELER",
        classification=LossClass.EQUIPMENT_FAILURE,
        signals=("jam", "labeler.jam"),
    ),
    ReasonCode(
        "LABEL_STUCK",
        "Label stuck",
        "Label jammed in the applicator.",
        parent_id="JAM",
        classification=LossClass.EQUIPMENT_FAILURE,
        signals=("label_stuck", "label.stuck"),
    ),
    ReasonCode("MATERIAL", "Material", "Material-related losses."),
    ReasonCode(
        "PACKAGING_MATERIAL",
        "Packaging material",
        "Packaging material issues.",
        parent_id="MATERIAL",
    ),
    ReasonCode("LABEL", "Label", "Label material.", parent_id="PACKAGING_MATERIAL"),
    ReasonCode(
        "LABEL_MISSING",
        "Label missing",
        "Label not present at the applicator.",
        parent_id="LABEL",
        classification=LossClass.MATERIAL_STARVATION,
        signals=("label_missing", "material.starvation"),
    ),
    ReasonCode(
        "CHANGEOVER",
        "Changeover",
        "Format or product changeover.",
        classification=LossClass.CHANGEOVER,
        signals=("changeover", "setup"),
    ),
    ReasonCode(
        "EQUIPMENT_FAILURE",
        "Equipment failure",
        "Unplanned equipment failure.",
        parent_id="EQUIPMENT",
        classification=LossClass.EQUIPMENT_FAILURE,
        signals=("fault", "estop", "e-stop", "failure"),
    ),
    ReasonCode(
        "QUALITY_STOP",
        "Quality stop",
        "Stop caused by a quality issue.",
        classification=LossClass.QUALITY_STOP,
        signals=("quality_stop", "reject_stop"),
    ),
    ReasonCode(
        "PLANNED",
        "Planned stop",
        "Planned downtime.",
        classification=LossClass.PLANNED_DOWNTIME,
        signals=("planned", "maintenance"),
    ),
    ReasonCode(
        "STARTUP_LOSS",
        "Startup loss",
        "Rejects or stops during startup.",
        classification=LossClass.QUALITY_STOP,
        signals=("startup",),
    ),
)


def reason_code_from_payload(payload: dict) -> ReasonCode:
    classification = payload.get("classification")
    return ReasonCode(
        reason_code_id=str(payload["reasonCodeId"]),
        name=str(payload["name"]),
        description=str(payload.get("description") or ""),
        active=bool(payload.get("active", True)),
        parent_id=payload.get("parentReasonCodeId"),
        classification=LossClass(classification) if classification else None,
        equipment_ids=tuple(payload.get("equipmentIds") or ()),
        equipment_types=tuple(payload.get("equipmentTypes") or ()),
        signals=tuple(item.lower() for item in payload.get("signals") or ()),
    )


def code_applies(code: ReasonCode, equipment_id: str, equipment_type: str | None) -> bool:
    if not code.active:
        return False
    if code.equipment_ids and equipment_id not in code.equipment_ids:
        return False
    return not (
        bool(code.equipment_types)
        and (equipment_type is None or equipment_type not in code.equipment_types)
    )


def match_signal(
    codes: list[ReasonCode],
    *,
    signal: str | None,
    reason: str | None,
    equipment_id: str,
    equipment_type: str | None,
) -> ReasonCode | None:
    tokens = [item.strip().lower() for item in (signal, reason) if item and item.strip()]
    if not tokens:
        return None
    for code in codes:
        if not code_applies(code, equipment_id, equipment_type):
            continue
        aliases = {code.reason_code_id.lower(), code.name.lower(), *code.signals}
        if any(token in aliases for token in tokens):
            return code
    return None


def unknown_code(codes: list[ReasonCode]) -> ReasonCode:
    for code in codes:
        if code.reason_code_id == UNKNOWN_REASON_ID:
            return code
    return DEFAULT_REASON_CODES[0]


def ancestors(codes: list[ReasonCode], reason_code_id: str) -> list[str]:
    by_id = {item.reason_code_id: item for item in codes}
    path: list[str] = []
    current = by_id.get(reason_code_id)
    seen: set[str] = set()
    while current is not None and current.reason_code_id not in seen:
        path.append(current.reason_code_id)
        seen.add(current.reason_code_id)
        current = by_id.get(current.parent_id) if current.parent_id else None
    return list(reversed(path))
