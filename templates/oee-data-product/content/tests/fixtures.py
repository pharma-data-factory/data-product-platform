from datetime import UTC, datetime, timedelta

from app.domain.models import (
    MachineStateEvent,
    PlannedDowntime,
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


def context(
    ideal: float | None = 1.0,
    planned_downtime: tuple[PlannedDowntime, ...] = (),
) -> ProductionContext | None:
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
        planned_downtime=planned_downtime,
    )


def running(
    at: datetime,
    event_id: str = "state-run",
    *,
    reason_code: str | None = None,
    end_timestamp: datetime | None = None,
) -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state="RUNNING",
        reason_code=reason_code,
        reason=reason_code,
        end_timestamp=end_timestamp,
    )


def stopped(
    at: datetime,
    event_id: str = "state-stop",
    *,
    reason_code: str | None = None,
) -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state="STOPPED",
        reason_code=reason_code,
        reason=reason_code,
    )


def idle(at: datetime, event_id: str = "state-idle") -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state="IDLE",
    )


def maintenance(at: datetime, event_id: str = "state-maint") -> MachineStateEvent:
    return MachineStateEvent(
        event_id=event_id,
        equipment_id=EQUIPMENT,
        timestamp=at,
        state="MAINTENANCE",
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
