import pytest
from pydantic import ValidationError

from app.models import Equipment

VALID = {
    "equipmentId": "EQ-1001",
    "name": "Bioreactor 01",
    "site": "SITE-A",
    "status": "ACTIVE",
    "updatedAt": "2026-08-17T06:30:00Z",
}


def test_valid_equipment() -> None:
    record = Equipment.model_validate(VALID)
    assert record.equipmentId == "EQ-1001"
    assert record.name == "Bioreactor 01"
    assert record.site == "SITE-A"
    assert record.status == "ACTIVE"


@pytest.mark.parametrize("status", ["ACTIVE", "INACTIVE", "MAINTENANCE"])
def test_allowed_statuses(status: str) -> None:
    record = Equipment.model_validate({**VALID, "status": status})
    assert record.status == status


@pytest.mark.parametrize(
    "payload",
    [
        {key: value for key, value in VALID.items() if key != "equipmentId"},
        {**VALID, "equipmentId": ""},
        {**VALID, "name": ""},
        {**VALID, "site": ""},
        {**VALID, "status": "UNKNOWN"},
        {key: value for key, value in VALID.items() if key != "updatedAt"},
        {**VALID, "updatedAt": "not-a-datetime"},
        {**VALID, "extra": "nope"},
    ],
)
def test_invalid_equipment_is_rejected(payload: dict) -> None:
    with pytest.raises(ValidationError):
        Equipment.model_validate(payload)
