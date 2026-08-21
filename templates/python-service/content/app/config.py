from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "${{ values.name }}"
    service_version: str = "${{ values.version }}"
    host: str = "0.0.0.0"
    port: int = 8080


settings = Settings()
