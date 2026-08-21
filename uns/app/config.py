from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "unified-namespace"
    service_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8080
    uns_root_topic: str = "pharma"
    uns_topic_fields: str = "site,area,line,equipment,domain,event"
    uns_mqtt_host: str = "localhost"
    uns_mqtt_port: int = 1883
    uns_mqtt_username: str = ""
    uns_mqtt_password: str = ""
    uns_mqtt_enabled: bool = False
    uns_mqtt_client_id: str = "unified-namespace"
    environment: str = "development"

    @property
    def topic_fields(self) -> list[str]:
        return [field.strip() for field in self.uns_topic_fields.split(",") if field.strip()]
