from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ProtocolName = Literal["MQTT", "REST", "OPC_UA", "FILE_STREAM", "KAFKA"]


class SemanticKey(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = "GlobalReference"
    value: str


class SemanticId(BaseModel):
    """AAS Reference used as semanticId. MVP stores ExternalReference keys only."""

    model_config = ConfigDict(extra="forbid")
    type: Literal["ExternalReference", "ModelReference"] = "ExternalReference"
    keys: list[SemanticKey] = Field(default_factory=list)

    @property
    def value(self) -> str | None:
        return self.keys[0].value if self.keys else None


class SpecificAssetId(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    value: str


class AssetInformation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assetKind: Literal["Type", "Instance"] = "Instance"
    globalAssetId: str | None = None
    assetType: str | None = None
    specificAssetIds: list[SpecificAssetId] = Field(default_factory=list)


class AssetContext(BaseModel):
    """Configurable location metadata. Not a hardcoded AAS metamodel hierarchy."""

    model_config = ConfigDict(extra="forbid")
    site: str | None = None
    area: str | None = None
    line: str | None = None


class ConnectivityMapping(BaseModel):
    """Operational endpoint reference. Not a time-series value and not UNS governance."""

    model_config = ConfigDict(extra="forbid")
    protocol: ProtocolName
    topic: str | None = None
    endpoint: str | None = None
    contract: str | None = None
    contractVersion: str | None = None


class PropertyDefinition(BaseModel):
    """Sensor/property metadata. value is intentionally omitted — AAS is not a historian."""

    model_config = ConfigDict(extra="forbid")
    id: str
    idShort: str
    name: str
    description: str | None = None
    semanticId: SemanticId | None = None
    dataType: Literal["number", "integer", "string", "boolean"]
    unit: str | None = None
    minValue: float | None = None
    maxValue: float | None = None
    connectivity: ConnectivityMapping | None = None


class AssetRelationship(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    idShort: str
    semanticId: str = "contains"
    firstAssetId: str
    secondAssetId: str


class Submodel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    idShort: str
    semanticId: SemanticId | None = None
    submodelElements: list[dict] = Field(default_factory=list)


class AssetAdministrationShell(BaseModel):
    """MVP Asset Administration Shell. Subset of IDTA / IEC 63278 Part 1."""

    model_config = ConfigDict(extra="forbid")
    id: str
    idShort: str
    displayName: str
    description: str | None = None
    revision: int = 1
    active: bool = True
    assetInformation: AssetInformation
    context: AssetContext = Field(default_factory=AssetContext)
    submodels: list[Submodel] = Field(default_factory=list)
    properties: list[PropertyDefinition] = Field(default_factory=list)
    relationships: list[AssetRelationship] = Field(default_factory=list)


class AssetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    displayName: str
    description: str | None = None
    globalAssetId: str | None = None
    assetType: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    owner: str | None = None


class AssetUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    displayName: str | None = None
    description: str | None = None
    globalAssetId: str | None = None
    assetType: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serialNumber: str | None = None
    site: str | None = None
    area: str | None = None
    line: str | None = None
    active: bool | None = None


class AuditRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    at: str
    actor: str
    action: str
    assetId: str | None = None
    detail: str | None = None


class ResolvedProperty(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assetId: str
    propertyId: str
    semanticId: str | None = None
    dataType: str
    unit: str | None = None
    connectivity: ConnectivityMapping | None = None


DEFAULT_SUBMODEL_SHORTS = (
    "Identification",
    "TechnicalData",
    "OperationalDataDefinition",
    "Sensors",
    "Connectivity",
)
