from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException

from app.domain.models import ProductionContextFilter
from app.domain.windows import ensure_utc


def parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        return ensure_utc(datetime.fromisoformat(normalized))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="invalid from/to") from error


def context_filter(
    *,
    site: str | None = None,
    area: str | None = None,
    line: str | None = None,
    order_id: str | None = None,
    batch_id: str | None = None,
    material_id: str | None = None,
    product: str | None = None,
    shift_id: str | None = None,
    recipe_id: str | None = None,
) -> ProductionContextFilter:
    return ProductionContextFilter(
        site=site,
        area=area,
        line=line,
        order_id=order_id,
        batch_id=batch_id,
        material_id=material_id or product,
        shift_id=shift_id,
        recipe_id=recipe_id,
    )
