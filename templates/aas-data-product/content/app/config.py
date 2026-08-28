"""Configuration for AAS Data Product."""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # Service Configuration
    service_name: str = "aas-data-product"
    service_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False

    # AAS Repository Configuration
    aas_repository_url: str = "http://localhost:4000"
    aas_registry_url: str = "http://localhost:4001"
    aas_persistence: str = "sqlite"  # or 'postgresql'
    aas_sqlite_path: str = ".data/aas.sqlite"
    aas_db_url: str = "postgresql://user:password@localhost/aas"

    # Source System Configuration
    source_system: str = "${{ values.assetSource }}"  # mqtt, rest, file
    mqtt_broker_url: str = "mqtt://localhost:1883"
    mqtt_topic: str = "${{ values.mqttTopic }}"
    rest_endpoint: str = "${{ values.restEndpoint }}"

    # CORS Configuration
    cors_origins: List[str] = ["*"]

    # Data Contract
    data_contract_schema: str = "contracts/asset-event.schema.json"

    # Observability
    observability_enabled: bool = True
    metrics_port: int = 8081

    class Config:
        env_file = ".env"
        case_sensitive = False
