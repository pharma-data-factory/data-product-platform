from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from app.config import Settings
from app.registry import ContractRegistry
from app.store import EventStore
from app.transport import MqttTransport
from app.validation import EventValidationError, validate_inbound_event

ROOT = Path(__file__).resolve().parent.parent
settings = Settings()
registry = ContractRegistry.load(ROOT / "contracts" / "registry.yaml", ROOT / "contracts")
store = EventStore()
transport = MqttTransport(settings, on_message=lambda topic, payload: ingest_mqtt(topic, payload))


def ingest_mqtt(topic: str, payload: str) -> None:
    try:
        canonical, event, contract = validate_inbound_event(
            topic=topic,
            raw=payload,
            root=settings.uns_root_topic,
            field_names=settings.topic_fields,
            registry=registry,
        )
        store.insert(canonical, event, contract)
    except EventValidationError:
        store.reject()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    transport.start()
    try:
        yield
    finally:
        transport.stop()


app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="Unified Namespace platform component for governed OT/IT events.",
    lifespan=lifespan,
)


class InboundEvent(BaseModel):
    topic: str
    event: dict


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "UP",
        "service": settings.service_name,
        "version": settings.service_version,
        "transport": "mqtt" if settings.uns_mqtt_enabled else "disabled",
    }


@app.get("/api/v1/topics")
def list_topics() -> list[dict[str, str]]:
    seen = set(store.topics_seen())
    items = []
    for contract in registry.all():
        items.append(
            {
                "topic": contract.topic,
                "schema": contract.schema,
                "contractVersion": contract.contract_version,
                "producer": contract.producer,
                "owner": contract.owner,
                "domain": contract.domain,
                "qualityStatus": contract.quality_status,
                "seen": "true" if contract.topic in seen else "false",
            },
        )
    return items


@app.get("/api/v1/contracts")
def list_contracts() -> list[dict[str, str]]:
    return [
        {
            "name": item.contract,
            "version": item.contract_version,
            "topic": item.topic,
            "schema": item.schema,
            "owner": item.owner,
            "catalogApi": f"api:default/{settings.service_name}--{item.contract}",
        }
        for item in registry.all()
    ]


@app.get("/api/v1/metrics")
def metrics() -> dict[str, int | bool]:
    return {
        "accepted": store.accepted,
        "rejected": store.rejected,
        "duplicates": store.duplicates,
        "mqttConnected": transport.connected,
    }


@app.get("/api/v1/events")
def list_events() -> list[dict]:
    return [
        {
            "topic": record.topic,
            "event": record.event.model_dump(mode="json"),
            "contract": record.contract.contract,
        }
        for record in store.list_recent()
    ]


@app.post("/api/v1/events")
def publish_event(body: InboundEvent, response: Response) -> dict:
    try:
        canonical, event, contract = validate_inbound_event(
            topic=body.topic,
            raw=body.event,
            root=settings.uns_root_topic,
            field_names=settings.topic_fields,
            registry=registry,
        )
    except EventValidationError as error:
        store.reject()
        raise HTTPException(status_code=400, detail=str(error)) from error
    record, created = store.insert(canonical, event, contract)
    transport.publish(canonical, event.model_dump_json())
    response.status_code = 201 if created else 200
    return {
        "topic": record.topic,
        "duplicate": not created,
        "event": record.event.model_dump(mode="json"),
        "contract": record.contract.contract,
    }
