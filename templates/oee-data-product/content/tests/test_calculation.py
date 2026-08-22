from decimal import Decimal

from app.domain.calculation import availability, oee, performance, quality


def test_availability_normal() -> None:
    assert availability(22932, 25200) == Decimal(22932) / Decimal(25200)


def test_availability_zero_planned_time() -> None:
    assert availability(100, 0) is None


def test_availability_missing_input() -> None:
    assert availability(None, 3600) is None
    assert availability(3600, None) is None


def test_performance_normal() -> None:
    assert performance(1.2, 18346, 22932) == (Decimal("1.2") * Decimal(18346)) / Decimal(22932)


def test_performance_above_100_percent() -> None:
    result = performance(1.0, 4000, 3600)
    assert result is not None
    assert result > 1
    assert result == Decimal(4000) / Decimal(3600)


def test_performance_zero_runtime() -> None:
    assert performance(1.0, 10, 0) is None


def test_performance_missing_ideal_cycle() -> None:
    assert performance(None, 10, 3600) is None


def test_quality_normal() -> None:
    assert quality(18108, 18346) == Decimal(18108) / Decimal(18346)


def test_quality_rejects_included() -> None:
    assert quality(90, 100) == Decimal("0.9")


def test_quality_zero_total_count() -> None:
    assert quality(0, 0) is None


def test_quality_missing_data() -> None:
    assert quality(None, 10) is None
    assert quality(10, None) is None


def test_oee_multiplication() -> None:
    a = Decimal("0.91")
    p = Decimal("0.96")
    q = Decimal("0.987")
    assert oee(a, p, q) == a * p * q


def test_oee_null_when_component_missing() -> None:
    assert oee(Decimal(1), Decimal(1), None) is None
    assert oee(Decimal(1), None, Decimal(1)) is None
    assert oee(None, Decimal(1), Decimal(1)) is None
