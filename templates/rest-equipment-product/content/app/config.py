from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080
    sqlite_path: str = "data/equipment.db"
    source_api_url: str = ""
    source_api_token: str = ""
    source_api_timeout: float = 10.0
    data_contract_version: str = "1.0.0"
    template_name: str = "${{ values.templateName }}"
    template_version: str = "${{ values.templateVersion }}"


settings = Settings()
