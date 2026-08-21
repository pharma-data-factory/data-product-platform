from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Broker settings come from environment variables only.

    This connector is a demonstration template. Do not point it at customer
    infrastructure unless you intentionally configure a local or lab broker.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080

    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_client_id: str = "${{ values.name }}"
    mqtt_topic: str = "${{ values.defaultTopic }}"
    mqtt_qos: int = 0
    mqtt_keepalive: int = 60
    mqtt_enabled: bool = False


settings = Settings()
