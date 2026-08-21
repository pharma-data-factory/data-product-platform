from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Equipment(BaseModel):
    """Canonical equipment master record accepted from REST source or mock ingest."""

    model_config = ConfigDict(extra="forbid")

    equipmentId: str = Field(min_length=1)
    name: str = Field(min_length=1)
    site: str = Field(min_length=1)
    status: Literal["ACTIVE", "INACTIVE", "MAINTENANCE"]
    updatedAt: datetime
