from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080
    sqlite_path: str = "data/machine-states.db"
    mqtt_host: str = ""
    mqtt_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_topic: str = "${{ values.topicPattern }}"
    mqtt_client_id: str = "${{ values.name }}"
    uns_component: str = "${{ values.unsComponent }}"
    data_contract_version: str = "1.0.0"
    template_name: str = "${{ values.templateName }}"
    template_version: str = "${{ values.templateVersion }}"


settings = Settings()
