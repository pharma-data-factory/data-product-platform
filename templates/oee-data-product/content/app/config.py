from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080
    equipment_id: str = "${{ values.equipmentId }}"
    default_window: str = "${{ values.defaultWindow }}"
    data_contract_version: str = "1.0.0"
    template_name: str = "${{ values.templateName }}"
    template_version: str = "${{ values.templateVersion }}"
    mqtt_topic: str = "${{ values.mqttTopic }}"
    source_api_url: str = ""


settings = Settings()
