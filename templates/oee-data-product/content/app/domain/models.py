from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Literal

MachineState = Literal["RUNNING", "STOPPED", "IDLE", "MAINTENANCE"]
VALID_STATES: frozenset[str] = frozenset({"RUNNING", "STOPPED", "IDLE", "MAINTENANCE"})

WindowKind = Literal["hour", "day", "shift", "order", "custom"]
WINDOW_KIND_ALIASES = {
    "HOUR": "hour",
    "DAY": "day",
    "CURRENT_SHIFT": "shift",
    "PRODUCTION_ORDER": "order",
    "CUSTOM_RANGE": "custom",
    "hour": "hour",
    "day": "day",
    "shift": "shift",
    "order": "order",
    "custom": "custom",
}


class CalculationStatus(StrEnum):
    VALID = "VALID"
    INCOMPLETE = "INCOMPLETE"
    INVALID_INPUT = "INVALID_INPUT"
    NO_PRODUCTION = "NO_PRODUCTION"
    PENDING_LATE_DATA = "PENDING_LATE_DATA"


class Completeness(StrEnum):
    COMPLETE = "COMPLETE"
    PARTIAL = "PARTIAL"
    INCOMPLETE = "INCOMPLETE"


class ReconciliationStatus(StrEnum):
    ALIGNED = "ALIGNED"
    COUNT_MISMATCH = "COUNT_MISMATCH"
    COUNTS_UNAVAILABLE = "COUNTS_UNAVAILABLE"


@dataclass(frozen=True)
class PlannedDowntime:
    start: datetime
    end: datetime
    kind: str | None = None


@dataclass(frozen=True)
class ProductionContext:
    context_id: str
    equipment_id: str
    planned_start: datetime
    planned_end: datetime
    ideal_cycle_time_seconds: float
    timestamp: datetime
    order_id: str | None = None
    material_id: str | None = None
    target_quantity: int | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    shift_id: str | None = None
    planned_downtime: tuple[PlannedDowntime, ...] = ()


@dataclass(frozen=True)
class MachineStateEvent:
    event_id: str
    equipment_id: str
    timestamp: datetime
    state: MachineState
    reason: str | None = None
    envelope_equipment_id: str | None = None


@dataclass(frozen=True)
class ProductionCountEvent:
    event_id: str
    equipment_id: str
    timestamp: datetime
    total_count: int


@dataclass(frozen=True)
class QualityCountEvent:
    event_id: str
    equipment_id: str
    timestamp: datetime
    good_count: int
    reject_count: int
    total_count: int | None = None


@dataclass
class OeeInputs:
    equipment_id: str
    window_start: datetime
    window_end: datetime
    window_kind: WindowKind
    calculated_at: datetime
    states: list[MachineStateEvent] = field(default_factory=list)
    production_counts: list[ProductionCountEvent] = field(default_factory=list)
    quality_counts: list[QualityCountEvent] = field(default_factory=list)
    context: ProductionContext | None = None
    invalid_input: bool = False
    reset_detected: bool = False
    identity_mismatch: bool = False


@dataclass
class OeeResult:
    equipment_id: str
    window_kind: WindowKind
    window_start: datetime
    window_end: datetime
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None
    total_count: int
    good_count: int
    reject_count: int
    runtime_seconds: float
    downtime_seconds: float
    planned_production_seconds: float
    completeness: Completeness
    calculation_status: CalculationStatus
    reconciliation_status: ReconciliationStatus
    calculated_at: datetime
    order_id: str | None = None
    ideal_cycle_time_seconds: float | None = None
    contract_name: str = "oee-result"
    contract_version: str = "1.0.0"

    def as_payload(self) -> dict:
        return {
            "contract": {"name": self.contract_name, "version": self.contract_version},
            "equipmentId": self.equipment_id,
            "windowKind": self.window_kind,
            "windowStart": self.window_start.isoformat().replace("+00:00", "Z"),
            "windowEnd": self.window_end.isoformat().replace("+00:00", "Z"),
            "orderId": self.order_id,
            "availability": self.availability,
            "performance": self.performance,
            "quality": self.quality,
            "oee": self.oee,
            "totalCount": self.total_count,
            "goodCount": self.good_count,
            "rejectCount": self.reject_count,
            "runtimeSeconds": self.runtime_seconds,
            "downtimeSeconds": self.downtime_seconds,
            "plannedProductionSeconds": self.planned_production_seconds,
            "idealCycleTimeSeconds": self.ideal_cycle_time_seconds,
            "completeness": self.completeness.value,
            "calculationStatus": self.calculation_status.value,
            "reconciliationStatus": self.reconciliation_status.value,
            "calculatedAt": self.calculated_at.isoformat().replace("+00:00", "Z"),
        }
