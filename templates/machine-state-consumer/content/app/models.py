from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

MachineStateValue = Literal["RUNNING", "STOPPED", "IDLE", "MAINTENANCE"]


class SourceMetadata(BaseModel):
    """Standard UNS source metadata. Site names are event data, not product logic."""

    model_config = ConfigDict(extra="forbid")

    site: str = Field(min_length=1)
    area: str = Field(min_length=1)
    line: str = Field(min_length=1)
    equipment: str = Field(min_length=1)
    enterprise: str | None = None


class ContractRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")


class UnsEvent(BaseModel):
    """Standard Unified Namespace envelope. Do not invent a second envelope."""

    model_config = ConfigDict(extra="forbid")

    eventId: str = Field(min_length=1)
    timestamp: datetime
    source: SourceMetadata
    type: str = Field(min_length=1)
    contract: ContractRef
    payload: dict[str, Any]

    @field_validator("eventId")
    @classmethod
    def event_id_must_be_uuid(cls, value: str) -> str:
        UUID(value)
        return value

    @field_validator("timestamp")
    @classmethod
    def timestamp_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must be ISO-8601 with timezone")
        return value


class MachineStateRecord(BaseModel):
    equipmentId: str
    state: MachineStateValue
    reason: str | None = None
    eventId: str
    timestamp: datetime
    site: str
    area: str
    line: str
