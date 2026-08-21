from datetime import UTC, datetime, timedelta

from app.domain.models import (
    MachineStateEvent,
    ProductionContext,
    ProductionCountEvent,
    QualityCountEvent,
)

EQUIPMENT = "filler-01"
WINDOW_START = datetime(2026, 8, 21, 8, 0, tzinfo=UTC)
WINDOW_END = datetime(2026, 8, 21, 9, 0, tzinfo=UTC)
CALCULATED_AT = datetime(2026, 8, 21, 9, 0, 5, tzinfo=UTC)


def ts(minute: int, second: int = 0) -> datetime:
    return datetime(2026, 8, 21, 8, minute, second, tzinfo=UTC)


def context(ideal: float | None = 1.0) -> ProductionContext | None:
    if ideal is None:
        return None
    return ProductionContext(
        context_id="ctx-1",
        equipment_id=EQUIPMENT,
        planned_start=WINDOW_START,
        planned_end=WINDOW_END,
        ideal_cycle_time_seconds=ideal,
        timestamp=WINDOW_START - timedelta(minutes=5),
        order_id="po-1042",
    )


def running(at: datetime, event_id: str = "state-run") -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state="RUNNING",
    )


def stopped(at: datetime, event_id: str = "state-stop") -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state="STOPPED",
    )


def production(at: datetime, total: int, event_id: str) -> ProductionCountEvent:
    return ProductionCountEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        total_count=total,
    )


def quality(
    at: datetime,
    good: int,
    reject: int,
    event_id: str,
) -> QualityCountEvent:
    return QualityCountEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        good_count=good,
        reject_count=reject,
    )
