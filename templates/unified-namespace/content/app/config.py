from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080
    uns_root_topic: str = "${{ values.rootNamespace }}"
    uns_topic_fields: str = "site,area,line,equipment,domain,event"
    uns_mqtt_host: str = "localhost"
    uns_mqtt_port: int = 1883
    uns_mqtt_username: str = ""
    uns_mqtt_password: str = ""
    uns_mqtt_enabled: bool = False
    uns_mqtt_client_id: str = "${{ values.name }}"
    environment: str = "${{ values.environment }}"

    @property
    def topic_fields(self) -> list[str]:
        return [field.strip() for field in self.uns_topic_fields.split(",") if field.strip()]
