"""
Model Company UNS publisher runtime (separate from Backstage).

Publishes Platform UNS Standard 1.0 topics. Does NOT implement OEE/Temperature DP logic.
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None  # type: ignore

def _default_factory_path() -> Path:
    # Local repo layout: .../model-company/runtime/scenario-engine/app/main.py
    # → parents[3] == model-company. In Docker only MODEL_COMPANY_FACTORY is used.
    try:
        return Path(__file__).resolve().parents[3] / "factories" / "model-pharma.yaml"
    except IndexError:
        return Path("/factory/model-pharma.yaml")


FACTORY_PATH = Path(
    os.environ["MODEL_COMPANY_FACTORY"]
    if "MODEL_COMPANY_FACTORY" in os.environ
    else str(_default_factory_path())
)
MQTT_HOST = os.environ.get("MQTT_HOST", "")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
STATE_PATH = Path(os.environ.get("MODEL_COMPANY_STATE", "/data/runtime-state.json"))
UNS_ROOT = os.environ.get("UNS_ROOT", "uns")

AREA_SLUGS = {
    "SOLID-DOSE": "manufacturing",
    "PACKAGING": "packaging",
    "FILL-FINISH": "fill-finish",
}

SCENARIOS = {
    "SCN-001": "Normal Production",
    "SCN-002": "Perfect Production",
    "SCN-003": "Microstop Storm",
    "SCN-004": "Equipment Breakdown",
    "SCN-005": "Material Starvation",
    "SCN-006": "Quality Reject Spike",
    "SCN-007": "Temperature Excursion",
    "SCN-008": "Warehouse Delay",
    "SCN-009": "Changeover",
    "SCN-010": "Network Interruption",
}


def _seeded(seed: int, tick: int) -> float:
    h = hashlib.sha256(f"{seed}:{tick}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def load_factory(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    uns = data.get("uns") or {}
    data["_uns_root"] = uns.get("root") or UNS_ROOT
    data["_enterprise"] = uns.get("enterpriseId") or data["company"]["id"]
    data["_source"] = uns.get("sourceSystem") or "model-factory"
    data["_area_slugs"] = {**AREA_SLUGS, **(uns.get("areaSlugs") or {})}
    equipment: list[dict[str, Any]] = []
    for site in data.get("sites", []):
        for area in site.get("areas", []):
            for line in area.get("lines", []):
                for eq in line.get("equipment", []):
                    equipment.append(
                        {
                            **eq,
                            "siteId": site["id"],
                            "areaId": area["id"],
                            "lineId": line["id"],
                        }
                    )
    data["_equipment"] = equipment
    return data


def equipment_topic(factory: dict[str, Any], eq: dict[str, Any], info: str) -> str:
    slug = factory["_area_slugs"].get(eq["areaId"], eq["areaId"].lower())
    return "/".join(
        [
            factory["_uns_root"],
            factory["_enterprise"],
            eq["siteId"],
            slug,
            eq["lineId"],
            eq["id"],
            info,
        ]
    )


def envelope(
    factory: dict[str, Any],
    *,
    event_id: str,
    eq: dict[str, Any] | None,
    payload: dict[str, Any],
    data_quality: str = "GOOD",
) -> dict[str, Any]:
    ts = datetime.now(timezone.utc).isoformat()
    return {
        "schemaVersion": "1.0",
        "eventId": event_id,
        "timestamp": ts,
        "sourceSystem": factory["_source"],
        "enterpriseId": factory["_enterprise"],
        "siteId": eq["siteId"] if eq else factory["sites"][0]["id"],
        "areaId": eq["areaId"] if eq else None,
        "lineId": eq["lineId"] if eq else None,
        "equipmentId": eq["id"] if eq else None,
        "orderId": None,
        "batchId": None,
        "dataQuality": data_quality,
        "payload": payload,
    }


class SimulationControl(BaseModel):
    scenarioId: str = "SCN-001"
    seed: int = 42
    speed: int = Field(1, description="1, 5, 10, or 60")
    autoStart: bool = True


class RuntimeState:
    def __init__(self) -> None:
        self.factory = load_factory(FACTORY_PATH)
        self.status = "STOPPED"
        self.scenario_id = "SCN-001"
        self.seed = 42
        self.speed = 1
        self.tick = 0
        self.messages: list[dict[str, Any]] = []
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._mqtt = None
        if MQTT_HOST and mqtt is not None:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            client.connect(MQTT_HOST, MQTT_PORT, 60)
            client.loop_start()
            self._mqtt = client

    def persist(self) -> None:
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        STATE_PATH.write_text(
            json.dumps(
                {
                    "status": self.status,
                    "scenarioId": self.scenario_id,
                    "seed": self.seed,
                    "speed": self.speed,
                    "tick": self.tick,
                    "unsRoot": self.factory["_uns_root"],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    def publish(self, topic: str, body: dict[str, Any], qos: int = 1, retain: bool = False) -> None:
        if self._mqtt is None:
            return
        self._mqtt.publish(topic, json.dumps(body), qos=qos, retain=retain)

    def tick_once(self) -> list[dict[str, Any]]:
        self.tick += 1
        out: list[dict[str, Any]] = []
        skip = self.scenario_id == "SCN-010" and self.tick % 7 == 0
        for eq in self.factory["_equipment"]:
            r = _seeded(self.seed, self.tick + hash(eq["id"]) % 97)
            state = "RUNNING"
            reason = None
            dq = "GOOD"
            if self.scenario_id == "SCN-004" and eq["id"] == "BOTTLE-FILLER-01":
                state = "BREAKDOWN"
                reason = "BREAKDOWN"
            elif self.scenario_id == "SCN-003" and r < 0.35:
                state = "MICROSTOP"
                reason = "MICROSTOP"
            elif self.scenario_id == "SCN-005" and r < 0.6:
                state = "MATERIAL_STARVED"
                reason = "MATERIAL_STARVATION"
            temp = None
            if "temperature" in (eq.get("capabilities") or []):
                temp = 28 + r * 8 if self.scenario_id == "SCN-007" else 22 + r
                if self.scenario_id == "SCN-007":
                    dq = "UNCERTAIN"
            payload = {
                "schemaVersion": "1.0",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "equipmentId": eq["id"],
                "state": state,
                "previousState": None,
                "reasonCode": reason,
                "dataQuality": dq,
            }
            msg = envelope(
                self.factory,
                event_id=f"EVT-RT-{self.seed}-{self.tick}-{eq['id']}",
                eq=eq,
                payload=payload,
                data_quality=dq,
            )
            out.append({"topic": equipment_topic(self.factory, eq, "state"), "message": msg})
            if not skip:
                self.publish(
                    equipment_topic(self.factory, eq, "state"),
                    msg,
                    qos=1,
                    retain=True,
                )
                self.publish(
                    equipment_topic(self.factory, eq, "availability"),
                    envelope(
                        self.factory,
                        event_id=f"EVT-RT-{self.seed}-{self.tick}-{eq['id']}-a",
                        eq=eq,
                        payload={
                            "schemaVersion": "1.0",
                            "timestamp": msg["timestamp"],
                            "status": "DEGRADED" if skip else "ONLINE",
                            "source": "equipment-simulator",
                            "dataQuality": dq,
                        },
                    ),
                    qos=1,
                    retain=True,
                )
                if temp is not None:
                    self.publish(
                        equipment_topic(self.factory, eq, "temperature"),
                        envelope(
                            self.factory,
                            event_id=f"EVT-RT-{self.seed}-{self.tick}-{eq['id']}-t",
                            eq=eq,
                            payload={
                                "schemaVersion": "1.0",
                                "timestamp": msg["timestamp"],
                                "value": round(temp, 2),
                                "unit": "C",
                                "lowerLimit": 18,
                                "upperLimit": 25,
                                "dataQuality": dq,
                            },
                            data_quality=dq,
                        ),
                        qos=0,
                        retain=True,
                    )
        self.messages = (out + self.messages)[:500]
        self.persist()
        return out

    def start(self) -> None:
        if self.status == "RUNNING":
            return
        self.status = "RUNNING"
        self._stop.clear()
        self.persist()

        def loop() -> None:
            while not self._stop.is_set():
                self.tick_once()
                delay = max(0.2, 1.0 / max(1, self.speed / 5))
                time.sleep(delay)

        self._thread = threading.Thread(target=loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self.status = "STOPPED"
        self._stop.set()
        self.persist()


runtime = RuntimeState()
app = FastAPI(title="Model Company UNS Runtime", version="0.2.0")


@app.get("/health")
def health() -> dict[str, Any]:
    mqtt_ok = runtime._mqtt is not None
    return {
        "status": "ok",
        "service": "model-company-runtime",
        "unsRoot": runtime.factory["_uns_root"],
        "simulation": runtime.status,
        "classification": {"synthetic": True, "gxp": "NON_GXP"},
        "mqtt": {
            "connected": mqtt_ok,
            "host": MQTT_HOST or None,
            "port": MQTT_PORT,
        },
        "connectivity": {
            "runtime": "UP",
            "mqtt": "CONNECTED" if mqtt_ok else "DISCONNECTED",
        },
    }


@app.get("/api/v1/equipment")
def equipment() -> dict[str, Any]:
    return {"items": runtime.factory["_equipment"]}


@app.get("/api/v1/uns/messages")
def uns_messages(limit: int = 50) -> dict[str, Any]:
    return {"items": runtime.messages[:limit]}


@app.get("/api/v1/scenarios")
def scenarios() -> dict[str, Any]:
    return {
        "items": [{"id": k, "name": v} for k, v in SCENARIOS.items()],
        "current": runtime.scenario_id,
    }


@app.post("/api/v1/scenarios/run")
def run_scenario(body: SimulationControl) -> dict[str, Any]:
    if body.scenarioId not in SCENARIOS:
        raise HTTPException(400, "Unknown scenario")
    if body.speed not in (1, 5, 10, 60):
        raise HTTPException(400, "Invalid speed")
    runtime.scenario_id = body.scenarioId
    runtime.seed = body.seed
    runtime.speed = body.speed
    runtime.tick = 0
    if body.autoStart:
        runtime.start()
    return {
        "status": runtime.status,
        "scenarioId": runtime.scenario_id,
        "seed": runtime.seed,
        "unsRoot": runtime.factory["_uns_root"],
    }


@app.post("/api/v1/simulation/start")
def start() -> dict[str, str]:
    runtime.start()
    return {"status": runtime.status}


@app.post("/api/v1/simulation/stop")
def stop() -> dict[str, str]:
    runtime.stop()
    return {"status": runtime.status}


class PublishMessage(BaseModel):
    topic: str
    message: dict[str, Any]
    qos: int = 1
    retain: bool = False


class PublishBatch(BaseModel):
    messages: list[PublishMessage] = Field(default_factory=list)


@app.post("/api/v1/uns/publish")
def uns_publish(body: PublishBatch) -> dict[str, Any]:
    """Relay Control Plane UNS envelopes to Mosquitto (sole MQTT publisher)."""
    if runtime._mqtt is None:
        raise HTTPException(503, "MQTT broker not connected")
    published = 0
    for item in body.messages:
        if not item.topic or not isinstance(item.message, dict):
            continue
        runtime.publish(item.topic, item.message, qos=item.qos, retain=item.retain)
        published += 1
    return {
        "status": "ok",
        "published": published,
        "broker": {"host": MQTT_HOST or None, "port": MQTT_PORT},
    }
