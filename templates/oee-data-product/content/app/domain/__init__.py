"""OEE domain library. Platform Components are not imported here."""

from app.domain.calculator import calculate_oee
from app.domain.models import (
    CalculationStatus,
    Completeness,
    MachineState,
    MachineStateEvent,
    OeeInputs,
    OeeResult,
    ProductionContext,
    ProductionCountEvent,
    QualityCountEvent,
    ReconciliationStatus,
    WindowKind,
)

__all__ = [
    "CalculationStatus",
    "Completeness",
    "MachineState",
    "MachineStateEvent",
    "OeeInputs",
    "OeeResult",
    "ProductionContext",
    "ProductionCountEvent",
    "QualityCountEvent",
    "ReconciliationStatus",
    "WindowKind",
    "calculate_oee",
]
