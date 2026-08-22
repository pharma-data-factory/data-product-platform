from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Literal

MachineState = Literal["RUNNING", "STOPPED", "IDLE", "MAINTENANCE"]
VALID_STATES: frozenset[str] = frozenset({"RUNNING", "STOPPED", "IDLE", "MAINTENANCE"})

WindowKind = Literal["HOUR", "SHIFT", "ORDER", "CUSTOM"]
WINDOW_KIND_ALIASES = {
    "HOUR": "HOUR",
    "hour": "HOUR",
    "SHIFT": "SHIFT",
    "shift": "SHIFT",
    "CURRENT_SHIFT": "SHIFT",
    "ORDER": "ORDER",
    "order": "ORDER",
    "PRODUCTION_ORDER": "ORDER",
    "CUSTOM": "CUSTOM",
    "custom": "CUSTOM",
    "CUSTOM_RANGE": "CUSTOM",
    "DAY": "CUSTOM",
    "day": "CUSTOM",
}


class CalculationStatus(StrEnum):
    COMPLETE = "COMPLETE"
    MISSING_PRODUCTION_CONTEXT = "MISSING_PRODUCTION_CONTEXT"
    MISSING_MACHINE_STATE = "MISSING_MACHINE_STATE"
    MISSING_IDEAL_CYCLE = "MISSING_IDEAL_CYCLE"
    MISSING_COUNTER_DATA = "MISSING_COUNTER_DATA"
    MISSING_QUALITY_DATA = "MISSING_QUALITY_DATA"
    INSUFFICIENT_OBSERVATION = "INSUFFICIENT_OBSERVATION"


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
    downtime_type: str | None = None

    @property
    def label(self) -> str | None:
        return self.downtime_type or self.kind


@dataclass(frozen=True)
class ProductionContext:
    context_id: str
    equipment_id: str
    timestamp: datetime
    planned_start: datetime | None = None
    planned_end: datetime | None = None
    ideal_cycle_time_seconds: float | None = None
    order_id: str | None = None
    material_id: str | None = None
    product_id: str | None = None
    target_quantity: int | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    shift_id: str | None = None
    batch_id: str | None = None
    recipe_id: str | None = None
    planned_downtime: tuple[PlannedDowntime, ...] = ()


@dataclass(frozen=True)
class ProductionContextFilter:
    site: str | None = None
    area: str | None = None
    line: str | None = None
    order_id: str | None = None
    batch_id: str | None = None
    material_id: str | None = None
    shift_id: str | None = None
    recipe_id: str | None = None


@dataclass(frozen=True)
class MachineStateEvent:
    event_id: str
    equipment_id: str
    timestamp: datetime
    state: MachineState
    reason: str | None = None
    reason_code: str | None = None
    envelope_equipment_id: str | None = None
    end_timestamp: datetime | None = None
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
    rework_count: int = 0


@dataclass(frozen=True)
class CounterEvent:
    event_id: str
    equipment_id: str
    timestamp: datetime
    total_count: int
    good_count: int
    reject_count: int


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
    total_count: int | None
    good_count: int | None
    reject_count: int | None
    runtime_seconds: float | None
    downtime_seconds: float | None
    planned_production_seconds: float | None
    completeness: Completeness
    calculation_status: CalculationStatus
    reconciliation_status: ReconciliationStatus
    calculated_at: datetime
    order_id: str | None = None
    ideal_cycle_time_seconds: float | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    batch_id: str | None = None
    product_id: str | None = None
    shift_id: str | None = None
    contract_name: str = "oee-result"
    contract_version: str = "1.0.0"

    def as_payload(self) -> dict:
        start = self.window_start.isoformat().replace("+00:00", "Z")
        end = self.window_end.isoformat().replace("+00:00", "Z")
        nested_type = WINDOW_KIND_ALIASES.get(self.window_kind, str(self.window_kind).upper())
        flat_kind = {
            "HOUR": "hour",
            "SHIFT": "shift",
            "ORDER": "order",
            "CUSTOM": "custom",
            "DAY": "day",
        }.get(nested_type, str(self.window_kind).lower())
        return {
            "contract": {"name": self.contract_name, "version": self.contract_version},
            "equipmentId": self.equipment_id,
            "windowKind": flat_kind,
            "windowStart": start,
            "windowEnd": end,
            "window": {
                "type": nested_type,
                "start": start,
                "end": end,
            },
            "context": {
                "site": self.site,
                "area": self.area,
                "line": self.line,
                "orderId": self.order_id,
                "batchId": self.batch_id,
                "productId": self.product_id,
                "shiftId": self.shift_id,
            },
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
            "inputSummary": {
                "plannedProductionSeconds": self.planned_production_seconds,
                "runtimeSeconds": self.runtime_seconds,
                "idealCycleSeconds": self.ideal_cycle_time_seconds,
                "totalCount": self.total_count,
                "goodCount": self.good_count,
                "rejectCount": self.reject_count,
            },
            "completeness": self.completeness.value,
            "calculationStatus": self.calculation_status.value,
            "reconciliationStatus": self.reconciliation_status.value,
            "calculatedAt": self.calculated_at.isoformat().replace("+00:00", "Z"),
        }
