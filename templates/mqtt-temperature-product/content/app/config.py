from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080
    sqlite_path: str = "data/temperatures.db"
    mqtt_host: str = ""
    mqtt_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_topic: str = "${{ values.mqttTopic }}"
    mqtt_client_id: str = "${{ values.name }}"
    data_contract_version: str = "1.1.0"
    template_name: str = "${{ values.templateName }}"
    template_version: str = "${{ values.templateVersion }}"
    temperature_min: float = -50.0
    temperature_max: float = 150.0


settings = Settings()
