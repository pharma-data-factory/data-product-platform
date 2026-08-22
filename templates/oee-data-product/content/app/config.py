from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080
    equipment_id: str = "${{ values.equipmentId }}"
    site: str = "${{ values.site }}"
    area: str = "${{ values.area }}"
    line: str = "${{ values.line }}"
    default_window: str = "${{ values.defaultWindow }}"
    data_contract_version: str = "1.0.0"
    template_name: str = "${{ values.templateName }}"
    template_version: str = "${{ values.templateVersion }}"
    machine_state_topic: str = "${{ values.machineStateTopic }}"
    counter_topic: str = "${{ values.counterTopic }}"
    mqtt_topic: str = ""
    source_api_url: str = ""
    microstop_min_seconds: float = 3.0
    microstop_max_seconds: float = 60.0


settings = Settings()
