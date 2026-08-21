from fastapi import FastAPI

from config import settings
from logging_config import configure_logging
from mqtt_client import MqttConnection

configure_logging()

mqtt = MqttConnection(settings)


app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="${{ values.description }}",
)


@app.on_event("startup")
def startup() -> None:
    mqtt.connect()


@app.on_event("shutdown")
def shutdown() -> None:
    mqtt.disconnect()


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "UP",
        "service": settings.service_name,
        "version": settings.service_version,
        "mqttEnabled": settings.mqtt_enabled,
        "mqttConnected": mqtt.connected,
    }


@app.get("/v1/info")
def info() -> dict[str, str]:
    return {
        "name": settings.service_name,
        "version": settings.service_version,
        "domain": "${{ values.domain }}",
        "template": "${{ values.templateName }}",
        "topic": settings.mqtt_topic,
    }
