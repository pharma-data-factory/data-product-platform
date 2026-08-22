from datetime import UTC, datetime

from app.domain.losses import (
    MicrostopConfig,
    detect_losses,
    is_microstop,
    loss_tree,
    make_loss_id,
    pareto,
    reliability,
)
from app.domain.models import MachineStateEvent
from app.domain.reason_codes import (
    DEFAULT_REASON_CODES,
    LossClass,
    ancestors,
)
from tests.fixtures import EQUIPMENT, WINDOW_END, WINDOW_START, running, stopped


def test_microstop_threshold_is_inclusive_and_configurable() -> None:
    config = MicrostopConfig(min_seconds=3, max_seconds=60)
    assert is_microstop(3, config)
    assert is_microstop(60, config)
    assert not is_microstop(2.9, config)
    assert not is_microstop(61, config)
    custom = MicrostopConfig(min_seconds=1, max_seconds=5)
    assert is_microstop(5, custom)
    assert not is_microstop(6, custom)


def test_short_stop_is_microstop_long_stop_is_downtime() -> None:
    codes = list(DEFAULT_REASON_CODES)
    events = [
        running(WINDOW_START, "s0"),
        stopped(datetime(2026, 8, 21, 8, 10, tzinfo=UTC), "s1"),
        running(datetime(2026, 8, 21, 8, 10, 10, tzinfo=UTC), "s2"),
        stopped(datetime(2026, 8, 21, 8, 20, tzinfo=UTC), "s3"),
        running(datetime(2026, 8, 21, 8, 22, tzinfo=UTC), "s4"),
    ]
    losses = detect_losses(
        events,
        window_start=WINDOW_START,
        window_end=WINDOW_END,
        codes=codes,
        assignments={},
        config=MicrostopConfig(),
    )
    by_class = {item.classification: item for item in losses}
    assert by_class[LossClass.MICROSTOP].duration_seconds == 10
    assert by_class[LossClass.UNPLANNED_DOWNTIME].duration_seconds == 120
    assert all(item.reason_code_id == "UNKNOWN" for item in losses)


def test_signal_maps_reason_without_changing_microstop_class() -> None:
    start = datetime(2026, 8, 21, 8, 10, tzinfo=UTC)
    events = [
        running(WINDOW_START, "s0"),
        MachineStateEvent(
            event_id="s1",
            equipment_id=EQUIPMENT,
            timestamp=start,
            state="STOPPED",
            signal="jam",
        ),
        running(datetime(2026, 8, 21, 8, 10, 20, tzinfo=UTC), "s2"),
    ]
    losses = detect_losses(
        events,
        window_start=WINDOW_START,
        window_end=WINDOW_END,
        codes=list(DEFAULT_REASON_CODES),
        assignments={},
        config=MicrostopConfig(),
    )
    assert len(losses) == 1
    assert losses[0].classification == LossClass.MICROSTOP
    assert losses[0].reason_code_id == "JAM"
    assert losses[0].assignment_source.value == "AUTOMATIC"
    assert "EQUIPMENT" in losses[0].reason_path


def test_reason_hierarchy_path() -> None:
    path = ancestors(list(DEFAULT_REASON_CODES), "LABEL_STUCK")
    assert path == ["EQUIPMENT", "LABELER", "JAM", "LABEL_STUCK"]


def test_loss_tree_and_pareto_and_mtbf() -> None:
    events = [
        running(WINDOW_START, "s0"),
        stopped(datetime(2026, 8, 21, 8, 10, tzinfo=UTC), "s1"),
        running(datetime(2026, 8, 21, 8, 10, 10, tzinfo=UTC), "s2"),
        stopped(datetime(2026, 8, 21, 8, 20, tzinfo=UTC), "s3"),
        running(datetime(2026, 8, 21, 8, 25, tzinfo=UTC), "s4"),
    ]
    losses = detect_losses(
        events,
        window_start=WINDOW_START,
        window_end=WINDOW_END,
        codes=list(DEFAULT_REASON_CODES),
        assignments={},
        config=MicrostopConfig(),
        planned_seconds=3600,
        ideal_cycle_time_seconds=1.0,
    )
    tree = loss_tree(
        losses,
        runtime_seconds=3290,
        total_count=3000,
        good_count=2970,
        reject_count=30,
        ideal_cycle_time_seconds=1.0,
    )
    assert tree["performanceLoss"]["microstops"]["occurrences"] == 1
    assert tree["availabilityLoss"]["durationSeconds"] == 300
    assert tree["qualityLoss"]["rejects"]["rejectCount"] == 30
    ranked = pareto(losses, rank_by="duration")
    assert ranked[0]["classification"] == "UNPLANNED_DOWNTIME"
    metrics = reliability(losses, runtime_seconds=3290)
    assert metrics["failureCount"] == 1
    assert metrics["mttrSeconds"] == 300
    assert metrics["mtbfSeconds"] == 3290


def test_loss_id_is_stable() -> None:
    start = datetime(2026, 8, 21, 8, 10, tzinfo=UTC)
    assert make_loss_id(EQUIPMENT, start, "STOPPED").startswith("loss:filler-01:")
