from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TemperatureEvent(BaseModel):
    """Canonical temperature reading accepted from MQTT or the REST API."""

    model_config = ConfigDict(extra="forbid")

    eventId: str = Field(min_length=1)
    deviceId: str = Field(min_length=1)
    timestamp: datetime
    temperature: float
    unit: Literal["C", "F"]
